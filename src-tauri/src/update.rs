use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

const UPDATE_ENDPOINT: &str = "https://api-gz.arsrna.cn/release/appUpdate/ArESRGAN";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    /// 开发构建跳过比较
    pub skipped: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub has_update: bool,
    pub link: Option<String>,
    pub content: Option<String>,
}

#[derive(Deserialize)]
struct ReleasePayload {
    #[serde(rename = "vNumber", alias = "version", default)]
    version: Option<String>,
    #[serde(default)]
    content: Option<serde_json::Value>,
    #[serde(default)]
    link: Option<String>,
}

/// 手动检查更新：拉取线上版本号并按 semver 与本地版本比较。
#[tauri::command]
pub async fn check_update(app: AppHandle) -> Result<UpdateInfo, String> {
    let current = app.package_info().version.clone();
    let current_version = current.to_string();

    if cfg!(debug_assertions) {
        return Ok(UpdateInfo {
            skipped: true,
            current_version,
            latest_version: None,
            has_update: false,
            link: None,
            content: None,
        });
    }

    let client = reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|error| format!("检查更新失败：无法初始化网络请求（{error}）"))?;

    let response = client
        .get(UPDATE_ENDPOINT)
        .send()
        .await
        .map_err(|error| format!("检查更新失败：{error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "检查更新失败：服务端返回 {}",
            response.status().as_u16()
        ));
    }

    let payload: ReleasePayload = response
        .json()
        .await
        .map_err(|error| format!("检查更新失败：响应格式异常（{error}）"))?;

    let Some(raw) = payload.version else {
        return Err("检查更新失败：响应中缺少版本号".to_string());
    };

    let latest = parse_version(&raw)
        .ok_or_else(|| format!("检查更新失败：无法解析版本号 {raw}"))?;
    let has_update = latest > current;

    Ok(UpdateInfo {
        skipped: false,
        current_version,
        latest_version: Some(latest.to_string()),
        has_update,
        link: payload.link,
        content: content_text(payload.content),
    })
}

/// 把 `v7.2.0`、`7.2`、`7.1.0.0` 之类的版本串归一化为 semver。
fn parse_version(raw: &str) -> Option<semver::Version> {
    let cleaned: String = raw
        .chars()
        .filter(|character| character.is_ascii_digit() || *character == '.')
        .collect();

    let mut numbers: Vec<u64> = Vec::new();
    for part in cleaned.split('.').filter(|part| !part.is_empty()) {
        numbers.push(part.parse().ok()?);
        if numbers.len() == 3 {
            break;
        }
    }

    if numbers.is_empty() {
        return None;
    }
    while numbers.len() < 3 {
        numbers.push(0);
    }

    Some(semver::Version::new(numbers[0], numbers[1], numbers[2]))
}

fn content_text(value: Option<serde_json::Value>) -> Option<String> {
    match value {
        Some(serde_json::Value::String(text)) => Some(text),
        Some(serde_json::Value::Null) | None => None,
        Some(other) => Some(other.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::parse_version;

    #[test]
    fn parses_release_versions() {
        assert_eq!(parse_version("7.2.0").unwrap().to_string(), "7.2.0");
        assert_eq!(parse_version("v7.2.0").unwrap().to_string(), "7.2.0");
        assert_eq!(parse_version("7.2").unwrap().to_string(), "7.2.0");
        assert_eq!(parse_version("7.1.0.0").unwrap().to_string(), "7.1.0");
        assert!(parse_version("latest").is_none());
    }
}
