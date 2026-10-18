use std::collections::{HashSet, VecDeque};
use std::fs;
use std::io::{BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitStatus, Stdio};
use std::sync::atomic::Ordering;
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::thread;
use std::time::{Duration, Instant, SystemTime};

use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};

use crate::resource;
use crate::AppState;

/// 批次状态事件名，载荷为 [`BatchSnapshot`]
pub const EVENT_BATCH: &str = "batch:update";

/// 进度事件最小间隔，避免刷屏并限制日志抖动带来的开销
const EMIT_INTERVAL: Duration = Duration::from_millis(100);
/// 子进程退出轮询间隔
const POLL_INTERVAL: Duration = Duration::from_millis(20);
/// 每个任务保留的诊断日志行数上限
const MAX_DIAGNOSTIC_LINES: usize = 40;
/// 单行诊断日志的最大字符数
const MAX_DIAGNOSTIC_CHARS: usize = 500;

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum TaskStatus {
    Queued,
    Running,
    Success,
    Failed,
    Cancelled,
}

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum BatchStatus {
    Running,
    Cancelling,
    Finished,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TaskState {
    pub id: String,
    /// 输入图片的绝对路径
    pub input: String,
    /// 输入图片的显示名
    pub name: String,
    /// 本任务的输出路径
    pub output: String,
    pub status: TaskStatus,
    /// 0～100；未解析到有效百分比时为 None
    pub progress: Option<f64>,
    /// 失败原因，成功/取消时为 None
    pub error: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BatchSnapshot {
    pub id: String,
    /// 单调递增的事件序号，供前端判断事件新旧
    pub seq: u64,
    pub status: BatchStatus,
    pub model: String,
    pub tasks: Vec<TaskState>,
    pub current_task_id: Option<String>,
}

#[derive(Default)]
pub struct BatchState {
    pub snapshot: Option<BatchSnapshot>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputConfig {
    pub mode: String,
    pub path: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartRequest {
    pub inputs: Vec<String>,
    pub model: String,
    pub output: OutputConfig,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImageInput {
    pub path: String,
    pub name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterResult {
    pub inputs: Vec<ImageInput>,
    /// 被拒绝的路径及原因，界面需要展示
    pub rejected: Vec<String>,
}

// ---------------------------------------------------------------- 命令

/// 校验前端选中的路径，并为本批预览开放资源协议访问范围。
#[tauri::command]
pub fn register_inputs(app: AppHandle, paths: Vec<String>) -> Result<RegisterResult, String> {
    let mut inputs = Vec::new();
    let mut rejected = Vec::new();

    for raw in paths {
        let path = PathBuf::from(&raw);
        if !path.is_file() {
            rejected.push(format!("{raw}：文件不存在或不可读"));
            continue;
        }
        if !resource::is_supported_image(&path) {
            rejected.push(format!("{raw}：仅支持 jpg/png/webp 图片"));
            continue;
        }

        let resolved = dunce::canonicalize(&path).unwrap_or_else(|_| path.clone());
        if let Err(error) = app.asset_protocol_scope().allow_file(&resolved) {
            rejected.push(format!("{raw}：无法用于预览（{error}）"));
            continue;
        }

        let name = resolved
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(&raw)
            .to_string();

        inputs.push(ImageInput {
            path: resolved.to_string_lossy().to_string(),
            name,
        });
    }

    if inputs.is_empty() && !rejected.is_empty() {
        return Err(rejected.join("；"));
    }

    Ok(RegisterResult { inputs, rejected })
}

/// 提交批次。参数在提交时固定，处理中不可修改。
#[tauri::command]
pub fn start_batch(
    app: AppHandle,
    state: State<'_, AppState>,
    request: StartRequest,
) -> Result<BatchSnapshot, String> {
    if request.inputs.is_empty() {
        return Err("请先选择需要处理的图片".to_string());
    }

    let models = crate::models::list(&app)?;
    if !models.iter().any(|model| model == &request.model) {
        return Err(format!(
            "模型 {} 不在内置模型列表中，请重新选择",
            request.model
        ));
    }

    let custom_dir = resolve_output_dir(&request.output)?;

    let mut reserved: HashSet<String> = HashSet::new();
    let mut tasks = Vec::with_capacity(request.inputs.len());

    for (index, raw) in request.inputs.iter().enumerate() {
        let input = PathBuf::from(raw);
        if !input.is_file() {
            return Err(format!("输入文件不存在：{raw}"));
        }

        let output = match &custom_dir {
            // 原目录模式：a.jpg -> a.jpg_opt.png
            None => {
                let parent = input
                    .parent()
                    .ok_or_else(|| format!("无法确定输出目录：{raw}"))?;
                let file_name = input
                    .file_name()
                    .and_then(|name| name.to_str())
                    .ok_or_else(|| format!("无法解析文件名：{raw}"))?;
                allocate_output(parent, &format!("{file_name}_opt"), &mut reserved)?
            }
            // 自定义目录模式：a.jpg -> <dir>/a_opt.png
            Some(dir) => {
                let stem = input
                    .file_stem()
                    .and_then(|stem| stem.to_str())
                    .ok_or_else(|| format!("无法解析文件名：{raw}"))?;
                allocate_output(dir, &format!("{stem}_opt"), &mut reserved)?
            }
        };

        let name = input
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(raw)
            .to_string();

        tasks.push(TaskState {
            id: format!("t{index}"),
            input: raw.clone(),
            name,
            output: output.to_string_lossy().to_string(),
            status: TaskStatus::Queued,
            progress: None,
            error: None,
        });
    }

    let snapshot = {
        let mut guard = state
            .batch
            .lock()
            .map_err(|_| "任务状态不可用，请重启应用".to_string())?;

        if let Some(running) = guard.snapshot.as_ref() {
            if matches!(
                running.status,
                BatchStatus::Running | BatchStatus::Cancelling
            ) {
                return Err("已有任务正在执行，请等待完成或先停止".to_string());
            }
        }

        let snapshot = BatchSnapshot {
            id: new_batch_id(),
            seq: 1,
            status: BatchStatus::Running,
            model: request.model.clone(),
            tasks,
            current_task_id: None,
        };
        guard.snapshot = Some(snapshot.clone());
        snapshot
    };

    state.cancel_requested.store(false, Ordering::SeqCst);
    if let Ok(mut slot) = state.child.lock() {
        *slot = None;
    }
    set_system_progress(&app, Some(0.0));
    emit(&app, &snapshot);

    let worker_app = app.clone();
    let batch_id = snapshot.id.clone();
    thread::spawn(move || run_worker(worker_app, batch_id));

    Ok(snapshot)
}

/// 记录停止请求并立即终止当前子进程，最终状态由任务终态确认。
#[tauri::command]
pub fn stop_batch(
    app: AppHandle,
    state: State<'_, AppState>,
    batch_id: String,
) -> Result<BatchSnapshot, String> {
    let snapshot = {
        let mut guard = state
            .batch
            .lock()
            .map_err(|_| "任务状态不可用，请重启应用".to_string())?;
        let Some(current) = guard.snapshot.as_mut() else {
            return Err("当前没有正在执行的任务".to_string());
        };
        if current.id != batch_id {
            return Err("批次已变更，停止请求已失效".to_string());
        }
        if current.status != BatchStatus::Running {
            return Ok(current.clone());
        }
        // 先落库停止状态，再处理调度，避免取消后又启动下一张
        current.status = BatchStatus::Cancelling;
        current.seq += 1;
        current.clone()
    };

    state.cancel_requested.store(true, Ordering::SeqCst);
    if let Ok(mut slot) = state.child.lock() {
        if let Some(child) = slot.as_mut() {
            let _ = child.kill();
        }
    }

    emit(&app, &snapshot);
    Ok(snapshot)
}

#[tauri::command]
pub fn get_batch_state(state: State<'_, AppState>) -> Option<BatchSnapshot> {
    state
        .batch
        .lock()
        .ok()
        .and_then(|guard| guard.snapshot.clone())
}

#[tauri::command]
pub fn open_devtools(window: WebviewWindow) -> Result<(), String> {
    window.open_devtools();
    Ok(())
}

// ---------------------------------------------------------------- 生命周期

/// 应用退出时终止仍在运行的子进程，避免遗留孤儿进程。
pub fn shutdown(app: &AppHandle) {
    let state = app.state::<AppState>();
    state.cancel_requested.store(true, Ordering::SeqCst);

    let running = match state.child.lock() {
        Ok(mut slot) => slot.take(),
        Err(_) => None,
    };

    if let Some(mut child) = running {
        let _ = child.kill();
        let _ = child.wait();
    }
}

// ---------------------------------------------------------------- 调度

fn run_worker(app: AppHandle, batch_id: String) {
    while let Some(index) = claim_next(&app, &batch_id) {
        run_task(&app, index);
        if app
            .state::<AppState>()
            .cancel_requested
            .load(Ordering::SeqCst)
        {
            break;
        }
    }

    if app
        .state::<AppState>()
        .cancel_requested
        .load(Ordering::SeqCst)
    {
        cancel_pending(&app, &batch_id);
    }

    finish_batch(&app, &batch_id);
}

/// 取出下一个待处理任务并标记为执行中；已请求停止时返回 None。
fn claim_next(app: &AppHandle, batch_id: &str) -> Option<usize> {
    let state = app.state::<AppState>();
    if state.cancel_requested.load(Ordering::SeqCst) {
        return None;
    }

    let (snapshot, index) = {
        let mut guard = state.batch.lock().ok()?;
        let snapshot = guard.snapshot.as_mut()?;
        // 旧批次线程不得操作已被替换的新批次
        if snapshot.id != batch_id {
            return None;
        }
        if snapshot.status != BatchStatus::Running {
            return None;
        }
        let index = snapshot
            .tasks
            .iter()
            .position(|task| task.status == TaskStatus::Queued)?;
        let task_id = snapshot.tasks[index].id.clone();
        {
            let task = &mut snapshot.tasks[index];
            task.status = TaskStatus::Running;
            task.progress = Some(0.0);
            task.error = None;
        }
        snapshot.current_task_id = Some(task_id);
        snapshot.seq += 1;
        (snapshot.clone(), index)
    };

    emit(app, &snapshot);
    set_system_progress(app, Some(0.0));
    Some(index)
}

fn run_task(app: &AppHandle, index: usize) {
    let Some((batch_id, input, output, model)) = task_context(app, index) else {
        return;
    };

    let binary = match resource::sidecar_path() {
        Ok(path) => path,
        Err(error) => return finish_task(app, &batch_id, index, TaskStatus::Failed, Some(error)),
    };
    let models_dir = match resource::models_dir(app) {
        Ok(path) => path,
        Err(error) => return finish_task(app, &batch_id, index, TaskStatus::Failed, Some(error)),
    };

    let mut command = Command::new(&binary);
    command
        .arg("-i")
        .arg(&input)
        .arg("-o")
        .arg(&output)
        .arg("-m")
        .arg(&models_dir)
        .arg("-n")
        .arg(&model)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW：避免弹出控制台窗口
        command.creation_flags(0x0800_0000);
    }

    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            return finish_task(
                app,
                &batch_id,
                index,
                TaskStatus::Failed,
                Some(format!(
                    "无法启动内置推理程序（{}）：{error}",
                    binary.display()
                )),
            )
        }
    };

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    store_child(app, child);

    // 启动瞬间收到停止请求时立即补杀，避免关闭竞态窗口
    if app
        .state::<AppState>()
        .cancel_requested
        .load(Ordering::SeqCst)
    {
        kill_child(app);
    }

    let (sender, receiver) = mpsc::channel::<Vec<u8>>();
    if let Some(pipe) = stdout {
        spawn_reader(pipe, sender.clone());
    }
    if let Some(pipe) = stderr {
        spawn_reader(pipe, sender.clone());
    }
    drop(sender);

    let mut parser = LogParser::new();
    let mut diagnostics: VecDeque<String> = VecDeque::new();
    let mut last_emit = Instant::now();
    let mut exit_status: Option<ExitStatus> = None;

    loop {
        match receiver.recv_timeout(POLL_INTERVAL) {
            Ok(chunk) => {
                handle_chunk(
                    app,
                    &batch_id,
                    index,
                    &mut parser,
                    &mut diagnostics,
                    &mut last_emit,
                    &chunk,
                );
            }
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => {}
        }

        if exit_status.is_none() {
            if let Ok(mut slot) = app.state::<AppState>().child.lock() {
                if let Some(child) = slot.as_mut() {
                    match child.try_wait() {
                        Ok(Some(status)) => {
                            exit_status = Some(status);
                            *slot = None;
                        }
                        Ok(None) => {}
                        Err(error) => {
                            *slot = None;
                            diagnostics.push_back(format!("等待推理进程失败：{error}"));
                        }
                    }
                }
            }
        }

        if exit_status.is_some() {
            // 进程已退出：读取流中剩余数据，避免丢失最后的进度与日志
            while let Ok(chunk) = receiver.recv_timeout(Duration::from_millis(50)) {
                handle_chunk(
                    app,
                    &batch_id,
                    index,
                    &mut parser,
                    &mut diagnostics,
                    &mut last_emit,
                    &chunk,
                );
            }
            break;
        }
    }

    // 处理没有以换行结束的残留片段
    let (progress, lines) = parser.flush();
    if let Some(value) = progress {
        push_progress(app, &batch_id, index, value, &mut last_emit);
    }
    for line in lines {
        push_diagnostic(&mut diagnostics, line);
    }

    let cancelled = app
        .state::<AppState>()
        .cancel_requested
        .load(Ordering::SeqCst);

    let (status, error) = if cancelled {
        (TaskStatus::Cancelled, None)
    } else {
        evaluate_result(exit_status, Path::new(&output), &diagnostics)
    };

    finish_task(app, &batch_id, index, status, error);
}

fn evaluate_result(
    exit_status: Option<ExitStatus>,
    output: &Path,
    diagnostics: &VecDeque<String>,
) -> (TaskStatus, Option<String>) {
    let Some(status) = exit_status else {
        return (
            TaskStatus::Failed,
            Some(with_diagnostics("推理进程异常结束", diagnostics)),
        );
    };
    if !status.success() {
        let reason = match status.code() {
            Some(code) => format!("推理进程异常退出（退出码 {code}）"),
            None => "推理进程被信号终止".to_string(),
        };
        return (
            TaskStatus::Failed,
            Some(with_diagnostics(&reason, diagnostics)),
        );
    }

    // 输出路径在提交批次时已保证不存在，因此结束后的文件必定由本次任务生成
    match fs::metadata(output) {
        Ok(metadata) if metadata.len() > 0 => (TaskStatus::Success, None),
        Ok(_) => (
            TaskStatus::Failed,
            Some(with_diagnostics("推理结束但输出文件为空", diagnostics)),
        ),
        Err(_) => (
            TaskStatus::Failed,
            Some(with_diagnostics("推理结束但未生成输出文件", diagnostics)),
        ),
    }
}

fn with_diagnostics(reason: &str, diagnostics: &VecDeque<String>) -> String {
    if diagnostics.is_empty() {
        return reason.to_string();
    }
    let tail = diagnostics
        .iter()
        .rev()
        .take(2)
        .map(|line| line.as_str())
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>()
        .join(" / ");
    format!("{reason}（{tail}）")
}

fn handle_chunk(
    app: &AppHandle,
    batch_id: &str,
    index: usize,
    parser: &mut LogParser,
    diagnostics: &mut VecDeque<String>,
    last_emit: &mut Instant,
    chunk: &[u8],
) {
    let text = String::from_utf8_lossy(chunk);
    let (progress, lines) = parser.feed(&text);
    if let Some(value) = progress {
        push_progress(app, batch_id, index, value, last_emit);
    }
    for line in lines {
        push_diagnostic(diagnostics, line);
    }
}

fn push_diagnostic(diagnostics: &mut VecDeque<String>, line: String) {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return;
    }
    let limited = trimmed
        .chars()
        .take(MAX_DIAGNOSTIC_CHARS)
        .collect::<String>();
    diagnostics.push_back(limited);
    while diagnostics.len() > MAX_DIAGNOSTIC_LINES {
        diagnostics.pop_front();
    }
}

fn push_progress(
    app: &AppHandle,
    batch_id: &str,
    index: usize,
    value: f64,
    last_emit: &mut Instant,
) {
    let snapshot = {
        let state = app.state::<AppState>();
        let mut guard = match state.batch.lock() {
            Ok(guard) => guard,
            Err(_) => return,
        };
        let Some(snapshot) = guard.snapshot.as_mut() else {
            return;
        };
        if snapshot.id != batch_id {
            return;
        }
        let Some(task) = snapshot.tasks.get_mut(index) else {
            return;
        };
        if task.status != TaskStatus::Running {
            return;
        }
        if task.progress == Some(value) {
            return;
        }
        task.progress = Some(value);

        if last_emit.elapsed() < EMIT_INTERVAL {
            return;
        }
        *last_emit = Instant::now();
        snapshot.seq += 1;
        snapshot.clone()
    };

    emit(app, &snapshot);
    set_system_progress(app, Some(value));
}

fn finish_task(
    app: &AppHandle,
    batch_id: &str,
    index: usize,
    status: TaskStatus,
    error: Option<String>,
) {
    let snapshot = {
        let state = app.state::<AppState>();
        let mut guard = match state.batch.lock() {
            Ok(guard) => guard,
            Err(_) => return,
        };
        let Some(snapshot) = guard.snapshot.as_mut() else {
            return;
        };
        if snapshot.id != batch_id {
            return;
        }
        let Some(task) = snapshot.tasks.get_mut(index) else {
            return;
        };
        task.status = status;
        task.error = error;
        if status == TaskStatus::Success {
            task.progress = Some(100.0);
        }
        snapshot.current_task_id = None;
        snapshot.seq += 1;
        snapshot.clone()
    };

    emit(app, &snapshot);
    set_system_progress(app, None);
}

fn cancel_pending(app: &AppHandle, batch_id: &str) {
    let snapshot = {
        let state = app.state::<AppState>();
        let mut guard = match state.batch.lock() {
            Ok(guard) => guard,
            Err(_) => return,
        };
        let Some(snapshot) = guard.snapshot.as_mut() else {
            return;
        };
        if snapshot.id != batch_id {
            return;
        }
        for task in snapshot.tasks.iter_mut() {
            if matches!(task.status, TaskStatus::Queued | TaskStatus::Running) {
                task.status = TaskStatus::Cancelled;
            }
        }
        snapshot.current_task_id = None;
        snapshot.seq += 1;
        snapshot.clone()
    };

    emit(app, &snapshot);
    set_system_progress(app, None);
}

fn finish_batch(app: &AppHandle, batch_id: &str) {
    let snapshot = {
        let state = app.state::<AppState>();
        let mut guard = match state.batch.lock() {
            Ok(guard) => guard,
            Err(_) => return,
        };
        let Some(snapshot) = guard.snapshot.as_mut() else {
            return;
        };
        // 新批次已经接管时，旧线程只做收尾，不覆盖新批次状态
        if snapshot.id != batch_id {
            return;
        }
        snapshot.status = BatchStatus::Finished;
        snapshot.current_task_id = None;
        snapshot.seq += 1;
        snapshot.clone()
    };

    app.state::<AppState>()
        .cancel_requested
        .store(false, Ordering::SeqCst);
    set_system_progress(app, None);
    emit(app, &snapshot);
}

// ---------------------------------------------------------------- 辅助

fn task_context(app: &AppHandle, index: usize) -> Option<(String, String, String, String)> {
    let state = app.state::<AppState>();
    let guard = state.batch.lock().ok()?;
    let snapshot = guard.snapshot.as_ref()?;
    let task = snapshot.tasks.get(index)?;
    Some((
        snapshot.id.clone(),
        task.input.clone(),
        task.output.clone(),
        snapshot.model.clone(),
    ))
}

fn resolve_output_dir(output: &OutputConfig) -> Result<Option<PathBuf>, String> {
    match output.mode.as_str() {
        "current" => Ok(None),
        "custom" => {
            let raw = output.path.as_deref().unwrap_or("").trim();
            if raw.is_empty() {
                return Err("自定义输出模式需要先选择输出目录".to_string());
            }
            let dir = PathBuf::from(raw);
            fs::create_dir_all(&dir)
                .map_err(|error| format!("无法创建输出目录（{}）：{error}", dir.display()))?;
            if !dir.is_dir() {
                return Err(format!("输出路径不是目录：{}", dir.display()));
            }
            Ok(Some(dir))
        }
        other => Err(format!("未知的输出模式：{other}")),
    }
}

/// 分配输出路径：重名时按 `name(1).png`、`name(2).png` 递增，绝不覆盖已有文件。
fn allocate_output(
    dir: &Path,
    base: &str,
    reserved: &mut HashSet<String>,
) -> Result<PathBuf, String> {
    for counter in 0..10_000u32 {
        let candidate = if counter == 0 {
            dir.join(format!("{base}.png"))
        } else {
            dir.join(format!("{base}({counter}).png"))
        };
        let key = normalize_key(&candidate);
        if !candidate.exists() && !reserved.contains(&key) {
            reserved.insert(key);
            return Ok(candidate);
        }
    }
    Err(format!("无法为 {base}.png 分配可用的输出文件名"))
}

fn normalize_key(path: &Path) -> String {
    let text = path.to_string_lossy().to_string();
    if cfg!(windows) || cfg!(target_os = "macos") {
        text.to_lowercase()
    } else {
        text
    }
}

fn new_batch_id() -> String {
    let millis = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("b{millis}")
}

fn store_child(app: &AppHandle, child: Child) {
    if let Ok(mut slot) = app.state::<AppState>().child.lock() {
        *slot = Some(child);
    }
}

fn kill_child(app: &AppHandle) {
    if let Ok(mut slot) = app.state::<AppState>().child.lock() {
        if let Some(child) = slot.as_mut() {
            let _ = child.kill();
        }
    }
}

fn spawn_reader<R: Read + Send + 'static>(pipe: R, sender: Sender<Vec<u8>>) {
    thread::spawn(move || {
        let mut reader = BufReader::new(pipe);
        let mut buffer = [0u8; 4096];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(read) => {
                    if sender.send(buffer[..read].to_vec()).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });
}

fn emit(app: &AppHandle, snapshot: &BatchSnapshot) {
    let _ = app.emit(EVENT_BATCH, snapshot);
}

fn set_system_progress(app: &AppHandle, progress: Option<f64>) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let state = tauri::window::ProgressBarState {
        status: None,
        progress: progress.map(|value| value.clamp(0.0, 100.0).round() as u64),
    };
    let _ = window.set_progress_bar(state);
}

// ---------------------------------------------------------------- 日志与进度解析

/// 增量解析推理程序输出：按 `\n` / `\r` 切分，兼容分段到达。
///
/// 仅把形如 `12.34%` 的整行识别为进度，其余内容作为日志保留；
/// 不以 stderr 判断成败，也不把任意文本当百分比。
struct LogParser {
    carry: String,
    percent: Regex,
}

impl LogParser {
    fn new() -> Self {
        Self {
            carry: String::new(),
            percent: Regex::new(r"^(\d{1,3}(?:\.\d+)?)\s*%$").expect("进度正则表达式无效"),
        }
    }

    fn feed(&mut self, chunk: &str) -> (Option<f64>, Vec<String>) {
        self.carry.push_str(chunk);
        // 异常输出不应无界占用内存
        if self.carry.len() > 8192 {
            let overflow = self.carry.len() - 4096;
            self.carry.drain(..overflow);
        }

        let mut progress = None;
        let mut lines = Vec::new();
        let mut start = 0usize;

        for (index, byte) in self.carry.as_bytes().iter().enumerate() {
            if *byte != b'\n' && *byte != b'\r' {
                continue;
            }
            push_segment(
                &self.carry[start..index],
                &self.percent,
                &mut progress,
                &mut lines,
            );
            start = index + 1;
        }

        if start > 0 {
            self.carry.drain(..start);
        }

        (progress, lines)
    }

    fn flush(&mut self) -> (Option<f64>, Vec<String>) {
        let mut progress = None;
        let mut lines = Vec::new();
        if !self.carry.is_empty() {
            let rest = std::mem::take(&mut self.carry);
            push_segment(&rest, &self.percent, &mut progress, &mut lines);
        }
        (progress, lines)
    }
}

fn push_segment(
    segment: &str,
    percent: &Regex,
    progress: &mut Option<f64>,
    lines: &mut Vec<String>,
) {
    let trimmed = segment.trim();
    if trimmed.is_empty() {
        return;
    }
    if let Some(captures) = percent.captures(trimmed) {
        if let Ok(value) = captures[1].parse::<f64>() {
            if value.is_finite() {
                *progress = Some(value.clamp(0.0, 100.0));
            }
        }
        return;
    }
    lines.push(trimmed.to_string());
}

#[cfg(test)]
mod tests {
    use super::{allocate_output, LogParser};
    use std::collections::HashSet;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn parses_complete_percent_line() {
        let mut parser = LogParser::new();
        let (progress, lines) = parser.feed("12.34%\n");
        assert_eq!(progress, Some(12.34));
        assert!(lines.is_empty());
    }

    #[test]
    fn parses_percent_split_across_chunks() {
        let mut parser = LogParser::new();
        assert_eq!(parser.feed("12.").0, None);
        assert_eq!(parser.feed("34%").0, None);
        let (progress, lines) = parser.feed("\n");
        assert_eq!(progress, Some(12.34));
        assert!(lines.is_empty());
    }

    #[test]
    fn parses_carriage_return_separated_progress() {
        let mut parser = LogParser::new();
        let (progress, lines) = parser.feed("0.00%\r1.50%\r99%\r");
        assert_eq!(progress, Some(99.0));
        assert!(lines.is_empty());
    }

    #[test]
    fn keeps_plain_log_lines_out_of_progress() {
        let mut parser = LogParser::new();
        let (progress, lines) = parser.feed("[0 Apple M4] queueC=0[1] bugblz=106\n");
        assert_eq!(progress, None);
        assert_eq!(
            lines,
            vec!["[0 Apple M4] queueC=0[1] bugblz=106".to_string()]
        );
    }

    #[test]
    fn ignores_non_numeric_percent_text() {
        let mut parser = LogParser::new();
        let (progress, lines) = parser.feed("progress% done\n");
        assert_eq!(progress, None);
        assert_eq!(lines.len(), 1);
    }

    #[test]
    fn clamps_percent_to_range() {
        let mut parser = LogParser::new();
        assert_eq!(parser.feed("150%\n").0, Some(100.0));
        assert_eq!(parser.feed("0.5%\n").0, Some(0.5));
    }

    #[test]
    fn flushes_trailing_segment() {
        let mut parser = LogParser::new();
        assert_eq!(parser.feed("42.5%").0, None);
        assert_eq!(parser.flush().0, Some(42.5));
    }

    #[test]
    fn allocates_renamed_output_when_target_exists() {
        let dir = temp_dir();
        fs::write(dir.join("a_opt.png"), b"x").unwrap();

        let mut reserved = HashSet::new();
        let first = allocate_output(&dir, "a_opt", &mut reserved).unwrap();
        assert_eq!(first.file_name().unwrap(), "a_opt(1).png");

        // 同批次内同名输入也不能得到同一路径
        let second = allocate_output(&dir, "a_opt", &mut reserved).unwrap();
        assert_eq!(second.file_name().unwrap(), "a_opt(2).png");

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn allocates_plain_output_when_free() {
        let dir = temp_dir();
        let mut reserved = HashSet::new();
        let path = allocate_output(&dir, "b.jpg_opt", &mut reserved).unwrap();
        assert_eq!(path.file_name().unwrap(), "b.jpg_opt.png");
        fs::remove_dir_all(&dir).unwrap();
    }

    fn temp_dir() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        let dir = std::env::temp_dir().join(format!("esrgan-test-{nanos}"));
        fs::create_dir_all(&dir).unwrap();
        dir
    }
}
