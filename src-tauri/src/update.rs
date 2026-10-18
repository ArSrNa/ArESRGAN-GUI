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
    /// 线上接口同时下发 vNumber 与 version（历史遗留），两者不能共用 alias，否则会触发 duplicate field
    #[serde(rename = "vNumber", default)]
    v_number: Option<String>,
    #[serde(rename = "version", default)]
    version: Option<String>,
    #[serde(default)]
    content: Option<serde_json::Value>,
    #[serde(default)]
    link: Option<String>,
}

impl ReleasePayload {
    /// 以 vNumber 为准，缺失或为空时回退到 version
    fn release_version(&self) -> Option<&str> {
        [self.v_number.as_deref(), self.version.as_deref()]
            .into_iter()
            .flatten()
            .map(str::trim)
            .find(|value| !value.is_empty())
    }
}

/// reqwest 的 Display 会吞掉底层原因，展开 source 链便于定位响应或网络问题
fn error_detail(error: &(dyn std::error::Error + 'static)) -> String {
    let mut message = error.to_string();
    let mut source = error.source();
    while let Some(cause) = source {
        message.push_str(&format!("：{cause}"));
        source = cause.source();
    }
    message
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
        .map_err(|error| format!("检查更新失败：{}", error_detail(&error)))?;

    if !response.status().is_success() {
        return Err(format!(
            "检查更新失败：服务端返回 {}",
            response.status().as_u16()
        ));
    }

    let payload: ReleasePayload = response
        .json()
        .await
        .map_err(|error| format!("检查更新失败：响应格式异常（{}）", error_detail(&error)))?;

    let Some(raw) = payload.release_version() else {
        return Err("检查更新失败：响应中缺少版本号".to_string());
    };

    let latest =
        parse_version(raw).ok_or_else(|| format!("检查更新失败：无法解析版本号 {raw}"))?;
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
    use super::{parse_version, ReleasePayload};

    /// 线上真实响应：vNumber 与 version 同时存在
    const LIVE_PAYLOAD: &str = r#"{"vNumber":"7.1.0","version":"7.1.0","tag":"Release","rName":"Release","hash":{"macos":"1113187540","windows":"111e43421b"},"count":104,"uTime":"2026-9-11","link":"https://www.arsrna.cn/app/esrgan/#download","content":"更改更新检查逻辑，支持Linux系统使用","history":[{"time":"2025-11-20 19:59","content":"使用shadcn替换antd"}],"filename":{"macos":"a.dmg","windows":"a.exe","linux":{"AppImage":"a.AppImage","snap":"a.snap"}}}"#;

    #[test]
    fn parses_live_payload_with_both_version_fields() {
        let payload: ReleasePayload = serde_json::from_str(LIVE_PAYLOAD).unwrap();
        assert_eq!(payload.release_version(), Some("7.1.0"));
    }

    #[test]
    fn falls_back_to_legacy_version_field() {
        let payload: ReleasePayload = serde_json::from_str(r#"{"version":"6.0.1"}"#).unwrap();
        assert_eq!(payload.release_version(), Some("6.0.1"));
    }

    #[test]
    fn prefers_v_number_and_skips_blank_values() {
        let payload: ReleasePayload =
            serde_json::from_str(r#"{"vNumber":"  ","version":"6.0.2"}"#).unwrap();
        assert_eq!(payload.release_version(), Some("6.0.2"));
        let none: ReleasePayload = serde_json::from_str("{}").unwrap();
        assert_eq!(none.release_version(), None);
    }

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
