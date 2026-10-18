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

    let latest =
        parse_version(&raw).ok_or_else(|| format!("检查更新失败：无法解析版本号 {raw}"))?;
    let has_update = latest.cmp_precedence(&current).is_gt();

    Ok(UpdateInfo {
        skipped: false,
        current_version,
        latest_version: Some(latest.to_string()),
        has_update,
        link: payload.link,
        content: content_text(payload.content),
    })
}

/// 保留 demo 的严格 semver 比较，包括预发布和构建元数据语义。
fn parse_version(raw: &str) -> Option<semver::Version> {
    semver::Version::parse(raw.strip_prefix('v').unwrap_or(raw)).ok()
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
        assert!(parse_version("7.2").is_none());
        assert!(parse_version("7.1.0.0").is_none());
        assert!(parse_version("latest").is_none());
    }

    #[test]
    fn preserves_prerelease_and_ignores_build_metadata_in_precedence() {
        let beta = parse_version("7.0.0-beta.2").unwrap();
        let newer_beta = parse_version("7.0.0-beta.10").unwrap();
        let stable = parse_version("7.0.0").unwrap();
        assert!(newer_beta.cmp_precedence(&beta).is_gt());
        assert!(stable.cmp_precedence(&newer_beta).is_gt());
        let local = parse_version("7.0.0+local").unwrap();
        let remote = parse_version("7.0.0+remote").unwrap();
        assert!(local.cmp_precedence(&remote).is_eq());
    }
}
