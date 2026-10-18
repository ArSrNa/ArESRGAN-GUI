mod batch;
mod models;
mod resource;
mod update;

use std::process::Child;
use std::sync::atomic::AtomicBool;
use std::sync::Mutex;

use tauri::{Manager, RunEvent, WindowEvent};

/// 全局运行时状态：批次快照、停止标记与当前子进程句柄。
#[derive(Default)]
pub struct AppState {
    pub batch: Mutex<batch::BatchState>,
    pub cancel_requested: AtomicBool,
    /// 停止请求需要直接终止子进程，因此句柄放在共享槽位中
    pub child: Mutex<Option<Child>>,
}

/// 仅允许留在应用自身页面，远程链接一律交给系统浏览器。
fn is_internal_url(url: &tauri::Url) -> bool {
    match url.scheme() {
        "tauri" | "about" | "data" | "blob" => true,
        "http" | "https" => matches!(
            url.host_str(),
            Some("localhost") | Some("tauri.localhost") | Some("asset.localhost")
        ),
        _ => false,
    }
}

pub fn run() {
    tauri::Builder::default()
        // 单实例插件必须最先注册
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        // 阻止主窗口被导航到远程站点，外链统一交给系统浏览器
        .plugin(
            tauri::plugin::Builder::<tauri::Wry>::new("navigation-guard")
                .on_navigation(|_webview, url| is_internal_url(url))
                .build(),
        )
        .manage(AppState::default())
        .on_window_event(|window, event| {
            // 关闭窗口视为取消任务并退出应用
            if matches!(event, WindowEvent::CloseRequested { .. }) && window.label() == "main" {
                batch::shutdown(window.app_handle());
                window.app_handle().exit(0);
            }
        })
        .invoke_handler(tauri::generate_handler![
            batch::register_inputs,
            batch::start_batch,
            batch::stop_batch,
            batch::get_batch_state,
            batch::open_devtools,
            models::list_models,
            update::check_update,
        ])
        .build(tauri::generate_context!())
        .expect("无法初始化 Tauri 应用")
        .run(|app, event| {
            if matches!(event, RunEvent::ExitRequested { .. } | RunEvent::Exit) {
                batch::shutdown(app);
            }
        });
}
