use reqwest::blocking::Client;
use reqwest::header::{ETAG, IF_MATCH, IF_NONE_MATCH};
use serde::Serialize;
use std::io::Read;
use std::time::Duration;

const MAX_BYTES: u64 = 32 * 1024 * 1024;

#[derive(Serialize)]
pub struct DavResponse {
    status: u16,
    body: String,
    etag: Option<String>,
}

/// Only the two sync methods are exposed; credentials never cross a redirect.
pub fn request(
    url: &str,
    username: &str,
    password: &str,
    method: &str,
    body: Option<String>,
    etag: Option<String>,
) -> Result<DavResponse, String> {
    let parsed = reqwest::Url::parse(url).map_err(|_| "sync.invalidUrl")?;
    if !["http", "https"].contains(&parsed.scheme())
        || !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.query().is_some()
        || parsed.fragment().is_some()
    {
        return Err("sync.invalidUrl".into());
    }
    let client = Client::builder()
        .timeout(Duration::from_secs(20))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "sync.network")?;
    let mut request = match method {
        "GET" => client.get(parsed),
        "PUT" => {
            let body = body.ok_or("sync.invalidData")?;
            if body.len() as u64 > MAX_BYTES {
                return Err("sync.tooLarge".into());
            }
            let request = client
                .put(parsed)
                .header("Content-Type", "application/json")
                .body(body);
            match etag {
                Some(tag)
                    if tag.starts_with('"')
                        && tag.ends_with('"')
                        && !tag.contains(['\r', '\n']) =>
                {
                    request.header(IF_MATCH, tag)
                }
                None => request.header(IF_NONE_MATCH, "*"),
                _ => return Err("sync.noEtag".into()),
            }
        }
        _ => return Err("sync.invalidData".into()),
    };
    if !username.is_empty() || !password.is_empty() {
        request = request.basic_auth(username, Some(password));
    }
    let response = request.send().map_err(|_| "sync.network")?;
    let status = response.status().as_u16();
    let etag = response
        .headers()
        .get(ETAG)
        .and_then(|v| v.to_str().ok())
        .map(str::to_owned);
    if response.content_length().unwrap_or(0) > MAX_BYTES {
        return Err("sync.tooLarge".into());
    }
    let mut body = String::new();
    if method == "GET" && status == 200 {
        response
            .take(MAX_BYTES + 1)
            .read_to_string(&mut body)
            .map_err(|_| "sync.network")?;
        if body.len() as u64 > MAX_BYTES {
            return Err("sync.tooLarge".into());
        }
    }
    Ok(DavResponse { status, body, etag })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;

    #[test]
    fn sends_conditional_authenticated_put() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!(
            "http://{}/pantodo-workspace.json",
            listener.local_addr().unwrap()
        );
        let server = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut bytes = [0; 4096];
            let n = stream.read(&mut bytes).unwrap();
            let request = String::from_utf8_lossy(&bytes[..n]).to_lowercase();
            assert!(request.starts_with("put /pantodo-workspace.json"));
            assert!(request.contains("authorization: basic dxnlcjpw"));
            assert!(request.contains("if-match: \"revision-1\""));
            stream.write_all(b"HTTP/1.1 204 No Content\r\nETag: \"revision-2\"\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").unwrap();
        });
        let result = request(
            &url,
            "user",
            "p",
            "PUT",
            Some("{}".into()),
            Some("\"revision-1\"".into()),
        )
        .unwrap();
        assert_eq!(result.status, 204);
        assert_eq!(result.etag.as_deref(), Some("\"revision-2\""));
        server.join().unwrap();
    }

    #[test]
    fn refuses_embedded_credentials_and_unsupported_methods() {
        assert!(request(
            "https://user:secret@example.test/file",
            "",
            "",
            "GET",
            None,
            None
        )
        .is_err());
        assert!(request("https://example.test/file", "", "", "DELETE", None, None).is_err());
    }
}
