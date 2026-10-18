use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

/// 内置推理程序在 sidecar 中的基础名（Tauri 会补目标 triple 后缀）
pub const SIDECAR_NAME: &str = "realesrgan-ncnn-vulkan";

/// 推理程序支持的输入格式，与二进制帮助中列出的格式保持一致
const SUPPORTED_EXTENSIONS: [&str; 4] = ["jpg", "jpeg", "png", "webp"];

/// 定位随安装包分发的推理二进制。
///
/// 查找顺序：
/// 1. 可执行文件同目录（安装包中 sidecar 与主程序同目录）
/// 2. `src-tauri/binaries/<name>-<target-triple>`（开发模式）
pub fn sidecar_path() -> Result<PathBuf, String> {
    let executable_name = if cfg!(windows) {
        format!("{SIDECAR_NAME}.exe")
    } else {
        SIDECAR_NAME.to_string()
    };

    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(current) = std::env::current_exe() {
        if let Some(dir) = current.parent() {
            candidates.push(dir.join(&executable_name));
        }
    }

    let dev_name = if cfg!(windows) {
        format!("{SIDECAR_NAME}-{}.exe", env!("ESRGAN_BUILD_TARGET"))
    } else {
        format!("{SIDECAR_NAME}-{}", env!("ESRGAN_BUILD_TARGET"))
    };
    candidates.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join(dev_name),
    );

    candidates
        .iter()
        .find(|candidate| candidate.is_file())
        .cloned()
        .ok_or_else(|| {
            format!(
                "找不到内置推理程序，已检查：{}。请执行 pnpm run assets 重新准备资源。",
                display_list(&candidates)
            )
        })
}

/// 定位随安装包分发的模型目录。
pub fn models_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(dir) = app.path().resolve("models", tauri::path::BaseDirectory::Resource) {
        candidates.push(dir);
    }
    candidates.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("models"),
    );

    candidates
        .iter()
        .find(|candidate| candidate.is_dir())
        .cloned()
        .ok_or_else(|| {
            format!(
                "找不到内置模型目录，已检查：{}。请执行 pnpm run assets 重新准备资源。",
                display_list(&candidates)
            )
        })
}

pub fn is_supported_image(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| {
            SUPPORTED_EXTENSIONS
                .iter()
                .any(|supported| extension.eq_ignore_ascii_case(supported))
        })
        .unwrap_or(false)
}

fn display_list(candidates: &[PathBuf]) -> String {
    candidates
        .iter()
        .map(|path| path.display().to_string())
        .collect::<Vec<_>>()
        .join("；")
}
