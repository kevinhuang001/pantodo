use reqwest::blocking::Client;
use std::io::Read;
use std::time::Duration;

pub fn check() -> Result<String, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|_| "about.updateFailed")?;
    let response = client
        .get("https://api.github.com/repos/kevinhuang001/pantodo/releases?per_page=20")
        .header("User-Agent", "Pantodo")
        .header("Accept", "application/vnd.github+json")
        .send()
        .map_err(|_| "about.updateFailed")?;
    match response.status().as_u16() {
        200 => (),
        403 | 429 => return Err("about.updateLimited".into()),
        404 => return Err("about.updateUnavailable".into()),
        _ => return Err("about.updateFailed".into()),
    }
    let mut body = String::new();
    response
        .take(1_048_577)
        .read_to_string(&mut body)
        .map_err(|_| "about.updateFailed")?;
    if body.len() > 1_048_576 {
        return Err("about.updateInvalid".into());
    }
    Ok(body)
}

pub fn release_url(version: &str) -> Result<String, String> {
    let parts: Vec<_> = version
        .strip_prefix('v')
        .unwrap_or(version)
        .split('.')
        .collect();
    if parts.len() != 3
        || parts
            .iter()
            .any(|part| part.is_empty() || !part.bytes().all(|b| b.is_ascii_digit()))
    {
        return Err("about.openFailed".into());
    }
    Ok(format!(
        "https://github.com/kevinhuang001/pantodo/releases/tag/{version}"
    ))
}

pub fn open(version: &str) -> Result<(), String> {
    let url = release_url(version)?;
    #[cfg(target_os = "windows")]
    let child = std::process::Command::new("rundll32.exe")
        .args(["url.dll,FileProtocolHandler", &url])
        .spawn();
    #[cfg(target_os = "macos")]
    let child = std::process::Command::new("open").arg(&url).spawn();
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let child = std::process::Command::new("xdg-open").arg(&url).spawn();
    child.map_err(|_| "about.openFailed".to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_opens_fixed_repository_release_urls() {
        assert_eq!(
            release_url("v0.6.14").unwrap(),
            "https://github.com/kevinhuang001/pantodo/releases/tag/v0.6.14"
        );
        for invalid in [
            "https://example.com",
            "1.2",
            "1.2.3/elsewhere",
            "1.2.3&x",
            "1..3",
        ] {
            assert!(release_url(invalid).is_err());
        }
    }
}
