use tauri::AppHandle;

use crate::resource;

/// 扫描内置模型目录，仅返回同时具备 `.param` 与 `.bin` 的模型名。
pub fn list(app: &AppHandle) -> Result<Vec<String>, String> {
    let dir = resource::models_dir(app)?;
    let entries = std::fs::read_dir(&dir)
        .map_err(|error| format!("无法读取内置模型目录（{}）：{error}", dir.display()))?;

    let mut models: Vec<String> = Vec::new();

    for entry in entries {
        let entry =
            entry.map_err(|error| format!("无法读取内置模型目录（{}）：{error}", dir.display()))?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let is_param = path
            .extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.eq_ignore_ascii_case("param"))
            .unwrap_or(false);
        if !is_param {
            continue;
        }

        let Some(stem) = path.file_stem().and_then(|stem| stem.to_str()) else {
            continue;
        };
        if dir.join(format!("{stem}.bin")).is_file() {
            models.push(stem.to_string());
        }
    }

    models.sort();
    models.dedup();

    if models.is_empty() {
        return Err(format!(
            "内置模型目录中没有完整的模型文件（需要同名 .param 与 .bin）：{}",
            dir.display()
        ));
    }

    Ok(models)
}

#[tauri::command]
pub fn list_models(app: AppHandle) -> Result<Vec<String>, String> {
    list(&app)
}
