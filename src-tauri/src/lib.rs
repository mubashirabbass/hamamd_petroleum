// EBS Petroleum — Tauri Backend
// Handles: SQLite plugin registration, Backup/Restore, Google OAuth2, Drive API

use std::io::{Read, Write};
#[cfg(mobile)]
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;
#[cfg(not(mobile))]
use std::path::PathBuf;
mod activation;
use rusqlite::Connection;

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/// Returns the app-root directory path (where the .exe lives)
#[cfg(not(mobile))]
fn get_base_dir() -> Result<PathBuf, String> {
    std::env::current_exe()
        .map(|p| p.parent().unwrap().to_path_buf())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(unused_variables)]
fn get_app_data_path(app: tauri::AppHandle) -> Result<String, String> {
    #[cfg(not(mobile))]
    {
        // Desktop (Windows): portable mode next to .exe
        get_base_dir().map(|p| p.to_string_lossy().to_string())
    }

    #[cfg(mobile)]
    {
        // Android: Use the app's private internal storage
        app.path().app_data_dir()
            .map(|p| {
                let _ = std::fs::create_dir_all(&p);
                p.to_string_lossy().to_string()
            })
            .map_err(|e| e.to_string())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKUP — Create ZIP of the SQLite database file
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
#[allow(unused_variables)]
async fn create_backup_zip(app: tauri::AppHandle) -> Result<String, String> {
    // Generate fresh snapshots first
    let export_dir_str = export_data_snapshot(app.clone()).await?;
    let export_dir = std::path::Path::new(&export_dir_str);

    #[cfg(not(mobile))]
    let app_dir = get_base_dir()?;
    #[cfg(mobile)]
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let db_path = app_dir.join("ebs_business.db");
    if !db_path.exists() {
        return Err("Database file not found. Please add some data first.".to_string());
    }

    let backups_dir = app_dir.join("backups");
    std::fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let zip_name = format!("EBS_Full_Archive_{}.zip", timestamp);
    let zip_path = backups_dir.join(&zip_name);

    let file = std::fs::File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::FileOptions::<()>::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // 1. Comprehensive Metadata
    let meta = serde_json::json!({
        "version": "3.0",
        "app": "HRM Filling Station",
        "createdAt": chrono::Utc::now().to_rfc3339(),
        "contents": ["database", "activation_keys", "excel_reports", "app_configs"]
    });
    zip.start_file("metadata.json", options).map_err(|e| e.to_string())?;
    zip.write_all(meta.to_string().as_bytes()).map_err(|e| e.to_string())?;

    // 2. Main SQLite Database + Logs
    zip.start_file("ebs_business.db", options).map_err(|e| e.to_string())?;
    let db_data = std::fs::read(&db_path).map_err(|e| e.to_string())?;
    zip.write_all(&db_data).map_err(|e| e.to_string())?;

    for log_ext in &["-wal", "-shm"] {
        let log_path = app_dir.join(format!("ebs_business.db{}", log_ext));
        if log_path.exists() {
            zip.start_file(format!("ebs_business.db{}", log_ext), options).map_err(|e| e.to_string())?;
            let data = std::fs::read(&log_path).map_err(|e| e.to_string())?;
            zip.write_all(&data).map_err(|e| e.to_string())?;
        }
    }

    // 3. Hardware Activation Keys (The "everything" requirement)
    let key_path = app_dir.join("ebs_activation.key");
    if key_path.exists() {
        zip.start_file("ebs_activation.key", options).map_err(|e| e.to_string())?;
        let data = std::fs::read(&key_path).map_err(|e| e.to_string())?;
        zip.write_all(&data).map_err(|e| e.to_string())?;
    }

    // 4. Excel Reports Folder (Preserve historical exports)
    if export_dir.exists() {
        let entries = std::fs::read_dir(export_dir).map_err(|e| e.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let fname = entry.file_name().to_string_lossy().to_string();
                let data = std::fs::read(&path).map_err(|e| e.to_string())?;
                zip.start_file(format!("Excel_Reports/{}", fname), options).map_err(|e| e.to_string())?;
                zip.write_all(&data).map_err(|e| e.to_string())?;
            }
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(zip_path.to_string_lossy().to_string())
}

#[tauri::command]
#[allow(unused_variables)]
async fn restore_from_zip(zip_path: String, app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(not(mobile))]
    let app_dir = get_base_dir()?;
    #[cfg(mobile)]
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let file = std::fs::File::open(&zip_path).map_err(|e| format!("Cannot open backup: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Invalid ZIP: {}", e))?;

    let mut db_found = false;
    let mut has_wal_in_zip = false;

    // Clear old exports to avoid mixing data
    let export_dir = app_dir.join("exports");
    let _ = std::fs::remove_dir_all(&export_dir);
    let _ = std::fs::create_dir_all(&export_dir);

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();
        let mut data = Vec::new();
        entry.read_to_end(&mut data).map_err(|e| e.to_string())?;

        if name == "ebs_business.db" {
            std::fs::write(app_dir.join(&name), &data).map_err(|e| e.to_string())?;
            db_found = true;
        } else if name == "ebs_business.db-wal" {
            std::fs::write(app_dir.join(&name), &data).map_err(|e| e.to_string())?;
            has_wal_in_zip = true;
        } else if name == "ebs_business.db-shm" {
            std::fs::write(app_dir.join(&name), &data).map_err(|e| e.to_string())?;
        } else if name == "ebs_activation.key" {
            std::fs::write(app_dir.join(&name), &data).map_err(|e| e.to_string())?;
        } else if name.starts_with("Excel_Reports/") {
            let fname = name.replace("Excel_Reports/", "");
            if !fname.is_empty() {
                std::fs::write(export_dir.join(fname), &data).map_err(|e| e.to_string())?;
            }
        }
    }

    if db_found {
        if !has_wal_in_zip {
            let _ = std::fs::remove_file(app_dir.join("ebs_business.db-wal"));
            let _ = std::fs::remove_file(app_dir.join("ebs_business.db-shm"));
        }
        return Ok(());
    }

    Err("Backup does not contain a valid database (ebs_business.db).".to_string())
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE OAUTH2 — Local HTTP server captures the authorization code
// ─────────────────────────────────────────────────────────────────────────────

const REDIRECT_URI: &str = "http://localhost:3001/oauth/callback";

/// Starts a local HTTP listener on port 3001, opens the OAuth URL in the
/// system browser, waits for Google's callback, and returns the authorization code.
#[tauri::command]
async fn start_oauth_server_and_get_code(
    auth_url: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
    use tokio::net::TcpListener;

    let listener = TcpListener::bind("127.0.0.1:3001")
        .await
        .map_err(|e| format!("Cannot start OAuth listener on port 3001: {}. Close any other running instances and retry.", e))?;

    // Open the Google consent screen in the system browser
    app.opener()
        .open_url(&auth_url, None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    // Wait up to 5 minutes for the user to authorize
    let (stream, _) = tokio::time::timeout(
        std::time::Duration::from_secs(300),
        listener.accept(),
    )
    .await
    .map_err(|_| "OAuth timed out — no response received within 5 minutes.".to_string())?
    .map_err(|e| e.to_string())?;

    let (reader_half, mut writer_half) = tokio::io::split(stream);
    let mut reader = BufReader::new(reader_half);
    let mut request_line = String::new();
    reader
        .read_line(&mut request_line)
        .await
        .map_err(|e| e.to_string())?;

    let code = parse_oauth_code(&request_line)?;

    // Send a friendly success page back to the browser tab
    let html = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n\
        <!DOCTYPE html><html><head><title>EBS Petroleum</title></head>\
        <body style='font-family:system-ui,-apple-system;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fdf4'>\
        <div style='text-align:center;padding:48px;background:white;border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,.08);max-width:400px'>\
        <div style='font-size:56px;margin-bottom:20px'>✅</div>\
        <h2 style='color:#166534;margin:0 0 12px;font-size:22px'>Authorization Successful!</h2>\
        <p style='color:#64748b;margin:0;line-height:1.6'>You can close this tab and return to <strong>EBS Petroleum</strong>.<br>Your Google Drive is now connected.</p>\
        </div></body></html>";
    writer_half
        .write_all(html.as_bytes())
        .await
        .map_err(|e| e.to_string())?;

    Ok(code)
}

fn parse_oauth_code(request_line: &str) -> Result<String, String> {
    // Example: "GET /oauth/callback?code=4/0ARt&scope=https%3A%2F%2F... HTTP/1.1"
    let url_part = request_line
        .split_whitespace()
        .nth(1)
        .ok_or("Malformed HTTP callback request")?;

    let query = url_part
        .split('?')
        .nth(1)
        .ok_or("OAuth callback missing query parameters")?;

    for param in query.split('&') {
        let mut kv = param.splitn(2, '=');
        match kv.next() {
            Some("code") => {
                let raw = kv.next().unwrap_or("");
                let decoded = urlencoding::decode(raw)
                    .unwrap_or_default()
                    .to_string();
                return Ok(decoded);
            }
            Some("error") => {
                let err = kv.next().unwrap_or("access_denied");
                return Err(format!("Google OAuth error: {}", err));
            }
            _ => {}
        }
    }

    Err("Authorization code not found in OAuth callback.".to_string())
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN EXCHANGE
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn exchange_oauth_code(
    code: String,
    client_id: String,
    client_secret: String,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let params = [
        ("code", code.as_str()),
        ("client_id", client_id.as_str()),
        ("client_secret", client_secret.as_str()),
        ("redirect_uri", REDIRECT_URI),
        ("grant_type", "authorization_code"),
    ];

    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Network error during token exchange: {}", e))?;

    let tokens: serde_json::Value = response
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(err) = tokens.get("error") {
        let desc = tokens
            .get("error_description")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown error");
        return Err(format!("Token exchange failed: {} — {}", err, desc));
    }

    Ok(tokens)
}

#[tauri::command]
async fn refresh_access_token(
    refresh_token: String,
    client_id: String,
    client_secret: String,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let params = [
        ("refresh_token", refresh_token.as_str()),
        ("client_id", client_id.as_str()),
        ("client_secret", client_secret.as_str()),
        ("grant_type", "refresh_token"),
    ];

    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token refresh network error: {}", e))?;

    let tokens: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    if let Some(err) = tokens.get("error") {
        return Err(format!("Token refresh failed: {}", err));
    }

    Ok(tokens)
}

#[tauri::command]
async fn request_service_account_token(assertion: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let params = [
        ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
        ("assertion", &assertion),
    ];

    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token request network error: {}", e))?;

    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    if let Some(err) = data.get("error") {
        let desc = data.get("error_description").and_then(|v| v.as_str()).unwrap_or("Unknown error");
        return Err(format!("Service Account Token failed: {} — {}", err, desc));
    }

    Ok(data)
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE DRIVE API HELPERS
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn get_drive_user_info(access_token: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let info: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    Ok(info)
}

async fn find_or_create_drive_folder(
    client: &reqwest::Client,
    access_token: &str,
    name: &str,
    parent_id: Option<&str>,
) -> Result<String, String> {
    let safe_name = name.replace('\'', "\\'");
    let mut q = format!(
        "name='{}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        safe_name
    );
    if let Some(pid) = parent_id {
        q.push_str(&format!(" and '{}' in parents", pid));
    }

    let search: serde_json::Value = client
        .get("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(access_token)
        .query(&[
            ("q", q.as_str()),
            ("fields", "files(id)"),
            ("spaces", "drive"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(err) = search.get("error") {
        return Err(format!("Drive API Search Error: {}", err));
    }

    if let Some(files) = search["files"].as_array() {
        if !files.is_empty() {
            return Ok(files[0]["id"].as_str().unwrap_or("").to_string());
        }
    }

    // Folder not found — create it
    let mut body = serde_json::json!({
        "name": name,
        "mimeType": "application/vnd.google-apps.folder"
    });
    if let Some(pid) = parent_id {
        body["parents"] = serde_json::json!([pid]);
    }

    let created: serde_json::Value = client
        .post("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(access_token)
        .query(&[("fields", "id")])
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    Ok(created["id"].as_str().unwrap_or("").to_string())
}

async fn get_backup_folder_id(client: &reqwest::Client, access_token: &str) -> Result<String, String> {
    let parent_id =
        find_or_create_drive_folder(client, access_token, "EBS Petroleum", None).await?;
    find_or_create_drive_folder(client, access_token, "Backups", Some(&parent_id)).await
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD ZIP TO GOOGLE DRIVE
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn upload_zip_to_drive(
    zip_path: String,
    access_token: String,
    file_name: String,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let folder_id = get_backup_folder_id(&client, &access_token).await?;

    let file_data = std::fs::read(&zip_path)
        .map_err(|e| format!("Cannot read backup ZIP: {}", e))?;

    // Check for existing backup to update instead of creating duplicates
    let q = format!("name contains 'EBS_Backup' and '{}' in parents and trashed=false", folder_id);
    let search: serde_json::Value = client
        .get("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(&access_token)
        .query(&[("q", q.as_str()), ("fields", "files(id,name)")])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(err) = search.get("error") {
        return Err(format!("Drive API Error: {}", err));
    }

    let existing = search["files"].as_array().cloned().unwrap_or_default();

    let boundary = "EBS_BACKUP_BOUNDARY_7A3F9B2C";

    // Build multipart/related body manually
    let metadata_json = if !existing.is_empty() {
        serde_json::json!({ "name": file_name }).to_string()
    } else {
        serde_json::json!({ "name": file_name, "parents": [folder_id] }).to_string()
    };

    let preamble = format!(
        "--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{meta}\r\n--{boundary}\r\nContent-Type: application/zip\r\n\r\n",
        boundary = boundary,
        meta = metadata_json
    );
    let epilogue = format!("\r\n--{}--", boundary);

    let mut body = preamble.into_bytes();
    body.extend_from_slice(&file_data);
    body.extend_from_slice(epilogue.as_bytes());

    let content_type = format!("multipart/related; boundary={}", boundary);

    // Always create a new backup file — never overwrite existing ones
    let response: serde_json::Value = client
        .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
        .bearer_auth(&access_token)
        .header("Content-Type", &content_type)
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(err) = response.get("error") {
        return Err(format!("Drive API Upload Error: {}", err));
    }

    Ok(response)
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST DRIVE BACKUPS
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn list_drive_backups(access_token: String) -> Result<Vec<serde_json::Value>, String> {
    let client = reqwest::Client::new();
    let folder_id = get_backup_folder_id(&client, &access_token).await?;

    let q = format!("'{}' in parents and trashed=false", folder_id);
    let result: serde_json::Value = client
        .get("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(&access_token)
        .query(&[
            ("q", q.as_str()),
            ("fields", "files(id,name,size,modifiedTime,createdTime)"),
            ("orderBy", "modifiedTime desc"),
            ("pageSize", "1000"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(err) = result.get("error") {
        return Err(format!("Drive API Error: {}", err));
    }

    Ok(result["files"].as_array().cloned().unwrap_or_default())
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE A DRIVE FILE
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn delete_drive_file(file_id: String, access_token: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .delete(format!(
            "https://www.googleapis.com/drive/v3/files/{}",
            file_id
        ))
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| format!("Delete network error: {}", e))?;

    if response.status().is_success() || response.status().as_u16() == 204 {
        Ok(())
    } else {
        let err_text = response.text().await.unwrap_or_default();
        Err(format!("Drive delete failed: {}", err_text))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD FROM DRIVE → save to temp file → return path for restore_from_zip
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn download_drive_backup(
    file_id: String,
    access_token: String,
    #[allow(unused_variables)]
    app: tauri::AppHandle,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let response = client
        .get(format!(
            "https://www.googleapis.com/drive/v3/files/{}",
            file_id
        ))
        .bearer_auth(&access_token)
        .query(&[("alt", "media")])
        .send()
        .await
        .map_err(|e| format!("Drive download failed: {}", e))?;

    let status_code = response.status();
    if !status_code.is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!(
            "Drive returned HTTP {}: {}",
            status_code, err_text
        ));
    }

    let data = response.bytes().await.map_err(|e| e.to_string())?;

    #[cfg(not(mobile))]
    let app_dir = get_base_dir()?;

    #[cfg(mobile)]
    let app_dir = app.path().app_data_dir()
        .map(|p| { let _ = std::fs::create_dir_all(&p); p })
        .map_err(|e| e.to_string())?;

    let restore_path = app_dir.join("cloud_restore_temp.zip");
    std::fs::write(&restore_path, &data).map_err(|e| e.to_string())?;

    Ok(restore_path.to_string_lossy().to_string())
}

// ─────────────────────────────────────────────────────────────────────────────
// NATIVE FILE SYSTEM HELPERS (Bypasses JS Scoped Permissions on Android)
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn save_buffer_to_app_data(
    filename: String,
    data: Vec<u8>,
    #[allow(unused_variables)]
    app: tauri::AppHandle,
) -> Result<String, String> {
    #[cfg(not(mobile))]
    let app_dir = get_base_dir()?;

    #[cfg(mobile)]
    let app_dir = app.path().app_data_dir()
        .map(|p| { let _ = std::fs::create_dir_all(&p); p })
        .map_err(|e| e.to_string())?;

    let path = app_dir.join(&filename);
    std::fs::write(&path, &data).map_err(|e| format!("Failed to save buffer: {}", e))?;
    
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn copy_file_native(
    src: String,
    dest_filename: String,
    #[allow(unused_variables)]
    app: tauri::AppHandle,
) -> Result<String, String> {
    // If the Android picker returns a direct file path, we can copy it natively
    // Note: Android content:// URIs might still require Java side handlers, 
    // but this cleanly bypasses plugin-fs "forbidden path" blocks for standard paths.

    #[cfg(not(mobile))]
    let app_dir = get_base_dir()?;

    #[cfg(mobile)]
    let app_dir = app.path().app_data_dir()
        .map(|p| { let _ = std::fs::create_dir_all(&p); p })
        .map_err(|e| e.to_string())?;

    let target_path = app_dir.join(&dest_filename);
    
    std::fs::copy(&src, &target_path)
        .map_err(|e| format!("Native copy failed (Android content URI blocks may still apply to the src): {}", e))?;
        
    Ok(target_path.to_string_lossy().to_string())
}
#[tauri::command]
async fn copy_to_path(src: String, dest: String) -> Result<(), String> {
    if src == dest { return Ok(()); }
    let src_path = std::path::Path::new(&src);
    if !src_path.exists() {
        return Err(format!("Source backup file not found at: {}", src));
    }
    std::fs::copy(&src, &dest).map_err(|e| format!("Failed to copy file to destination: {}. Ensure you have write permissions.", e))?;
    Ok(())
}


// ─────────────────────────────────────────────────────────────────────────────
// DATA EXPORT — JSON Snapshot + CSV Files for crash recovery & portability
// ─────────────────────────────────────────────────────────────────────────────

#[allow(unused_variables)]
fn get_db_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    #[cfg(not(mobile))]
    { get_base_dir().map(|p| p.join("ebs_business.db")) }
    #[cfg(mobile)]
    { app.path().app_data_dir().map(|p| p.join("ebs_business.db")).map_err(|e| e.to_string()) }
}

#[allow(unused_variables)]
fn get_export_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    #[cfg(not(mobile))]
    { get_base_dir().map(|p| { let d = p.join("exports"); let _ = std::fs::create_dir_all(&d); d }) }
    #[cfg(mobile)]
    { app.path().app_data_dir().map(|p| { let d = p.join("exports"); let _ = std::fs::create_dir_all(&d); d }).map_err(|e| e.to_string()) }
}

/// Escape a CSV field value
fn csv_field(v: &str) -> String {
    if v.contains(',') || v.contains('"') || v.contains('\n') {
        format!("\"{}\"", v.replace('"', "\"\""))
    } else {
        v.to_string()
    }
}

/// Export ALL data to JSON + individual CSV files, and return the export folder path.
/// This is the crash-safe portable dump that can be opened in Excel or imported
/// into any future app.
#[tauri::command]
async fn export_data_snapshot(app: tauri::AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app)?;
    if !db_path.exists() {
        return Err("No database found. Add some data first.".into());
    }

    let export_dir = get_export_dir(&app)?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now();
    let ts  = now.format("%Y-%m-%d %H:%M UTC").to_string();

    // ── 1. JSON SNAPSHOT ──────────────────────────────────────────────────────
    let mut root = serde_json::json!({
        "app": "HR Filling Station",
        "exportedAt": ts,
        "version": "2.0",
        "note": "This file contains ALL business data. Import into any spreadsheet or future app."
    });

    macro_rules! query_rows {
        ($conn:expr, $sql:expr) => {{
            let mut stmt = $conn.prepare($sql).map_err(|e| e.to_string())?;
            let col_count = stmt.column_count();
            let col_names: Vec<String> = (0..col_count).map(|i| stmt.column_name(i).unwrap_or("").to_string()).collect();
            let rows = stmt.query_map([], |row| {
                let mut obj = serde_json::Map::new();
                for (i, name) in col_names.iter().enumerate() {
                    let val: serde_json::Value = match row.get_ref(i) {
                        Ok(rusqlite::types::ValueRef::Null)    => serde_json::Value::Null,
                        Ok(rusqlite::types::ValueRef::Integer(n)) => n.into(),
                        Ok(rusqlite::types::ValueRef::Real(f))    => serde_json::json!(f),
                        Ok(rusqlite::types::ValueRef::Text(t))    => String::from_utf8_lossy(t).into(),
                        Ok(rusqlite::types::ValueRef::Blob(_))    => "<blob>".into(),
                        Err(_) => serde_json::Value::Null,
                    };
                    obj.insert(name.clone(), val);
                }
                Ok(serde_json::Value::Object(obj))
            }).map_err(|e| e.to_string())?;
            let mut result = Vec::new();
            for r in rows { if let Ok(v) = r { result.push(v); } }
            (col_names, result)
        }};
    }

    let (_, purchases)   = query_rows!(conn, "SELECT bill_no,type,date,description,invoice_no,vehicle_no,details,rate,quantity,carriage,amount,total_amount FROM purchases ORDER BY date");
    let (_, sales)       = query_rows!(conn, "SELECT bill_no,type,date,description,quantity,rate,amount FROM sales ORDER BY date");
    let (_, exp_cats)    = query_rows!(conn, "SELECT name FROM expense_categories");
    let (_, exp_entries) = query_rows!(conn, "SELECT ec.name as category,e.bill_no,e.date,e.details,e.amount FROM expense_entries e JOIN expense_categories ec ON e.category_id=ec.id ORDER BY e.date");
    let (_, ast_cats)    = query_rows!(conn, "SELECT name FROM asset_categories");
    let (_, ast_entries) = query_rows!(conn, "SELECT ac.name as category,a.bill_no,a.date,a.description,a.debit,a.credit,a.balance FROM asset_entries a JOIN asset_categories ac ON a.category_id=ac.id ORDER BY a.date");
    let (_, lib_cats)    = query_rows!(conn, "SELECT name FROM liability_categories");
    let (_, lib_entries) = query_rows!(conn, "SELECT lc.name as category,l.bill_no,l.date,l.description,l.debit,l.credit,l.balance FROM liability_entries l JOIN liability_categories lc ON l.category_id=lc.id ORDER BY l.date");
    let (_, customers)   = query_rows!(conn, "SELECT name,phone FROM customers");
    let (_, cust_entries)= query_rows!(conn, "SELECT c.name as customer,c.phone,ce.bill_no,ce.date,ce.description,ce.debit,ce.credit,ce.balance FROM customer_entries ce JOIN customers c ON ce.customer_id=c.id ORDER BY ce.date");
    let (_, cap_cats)    = query_rows!(conn, "SELECT name FROM capital_categories");
    let (_, cap_entries) = query_rows!(conn, "SELECT cc.name as category,cp.bill_no,cp.date,cp.description,cp.debit,cp.credit,cp.balance FROM capital_entries cp JOIN capital_categories cc ON cp.category_id=cc.id ORDER BY cp.date");
    let (_, users)        = query_rows!(conn, "SELECT name,email,role,created_at FROM users");
    let (_, settings)     = query_rows!(conn, "SELECT key,value FROM app_settings");

    root["purchases"]  = serde_json::Value::Array(purchases.clone());
    root["sales"]      = serde_json::Value::Array(sales.clone());
    root["expenses"]   = serde_json::json!({ "categories": exp_cats, "entries": exp_entries.clone() });
    root["assets"]     = serde_json::json!({ "categories": ast_cats, "entries": ast_entries.clone() });
    root["liabilities"]= serde_json::json!({ "categories": lib_cats, "entries": lib_entries.clone() });
    root["customers"]  = serde_json::json!({ "list": customers, "entries": cust_entries.clone() });
    root["capital"]    = serde_json::json!({ "categories": cap_cats, "entries": cap_entries.clone() });
    root["users"]      = serde_json::Value::Array(users.clone());
    root["settings"]   = serde_json::Value::Array(settings.clone());

    let json_path = export_dir.join("ebs_snapshot.json");
    std::fs::write(&json_path, serde_json::to_string_pretty(&root).unwrap_or_default())
        .map_err(|e| format!("Failed to write JSON: {}", e))?;

    // ── 2. CSV FILES ──────────────────────────────────────────────────────────
    macro_rules! write_csv {
        ($dir:expr, $name:expr, $headers:expr, $rows:expr, $get_fields:expr) => {{
            let mut csv = format!("{}\n", $headers);
            for row in &$rows {
                let fields: Vec<String> = $get_fields(row);
                csv.push_str(&fields.iter().map(|f| csv_field(f)).collect::<Vec<_>>().join(","));
                csv.push('\n');
            }
            let p = $dir.join($name);
            std::fs::write(&p, csv).map_err(|e| format!("CSV write error: {}", e))?;
        }};
    }

    fn jstr(v: &serde_json::Value, k: &str) -> String {
        v.get(k).map(|x| match x {
            serde_json::Value::String(s) => s.clone(),
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::Null      => String::new(),
            other => other.to_string(),
        }).unwrap_or_default()
    }

    write_csv!(export_dir, "01_Purchases.csv",
        "Bill No,Type,Date,Description,Invoice No,Vehicle No,Details,Rate,Quantity,Carriage,Amount,Total Amount",
        purchases,
        |r: &serde_json::Value| vec![
            jstr(r,"bill_no"),jstr(r,"type"),jstr(r,"date"),jstr(r,"description"),
            jstr(r,"invoice_no"),jstr(r,"vehicle_no"),jstr(r,"details"),
            jstr(r,"rate"),jstr(r,"quantity"),jstr(r,"carriage"),jstr(r,"amount"),jstr(r,"total_amount")
        ]
    );

    write_csv!(export_dir, "08_Capital_Ledger.csv",
        "Category,Bill No,Date,Description,Debit,Credit,Balance",
        cap_entries,
        |r: &serde_json::Value| vec![
            jstr(r,"category"),jstr(r,"bill_no"),jstr(r,"date"),jstr(r,"description"),
            jstr(r,"debit"),jstr(r,"credit"),jstr(r,"balance")
        ]
    );

    write_csv!(export_dir, "02_Sales.csv",
        "Bill No,Type,Date,Description,Quantity,Rate,Amount",
        sales,
        |r: &serde_json::Value| vec![
            jstr(r,"bill_no"),jstr(r,"type"),jstr(r,"date"),jstr(r,"description"),
            jstr(r,"quantity"),jstr(r,"rate"),jstr(r,"amount")
        ]
    );

    write_csv!(export_dir, "03_Expenses.csv",
        "Category,Bill No,Date,Details,Amount",
        exp_entries,
        |r: &serde_json::Value| vec![
            jstr(r,"category"),jstr(r,"bill_no"),jstr(r,"date"),jstr(r,"details"),jstr(r,"amount")
        ]
    );

    write_csv!(export_dir, "04_Assets.csv",
        "Category,Bill No,Date,Description,Debit,Credit,Balance",
        ast_entries,
        |r: &serde_json::Value| vec![
            jstr(r,"category"),jstr(r,"bill_no"),jstr(r,"date"),jstr(r,"description"),
            jstr(r,"debit"),jstr(r,"credit"),jstr(r,"balance")
        ]
    );

    write_csv!(export_dir, "05_Liabilities.csv",
        "Category,Bill No,Date,Description,Debit,Credit,Balance",
        lib_entries,
        |r: &serde_json::Value| vec![
            jstr(r,"category"),jstr(r,"bill_no"),jstr(r,"date"),jstr(r,"description"),
            jstr(r,"debit"),jstr(r,"credit"),jstr(r,"balance")
        ]
    );

    write_csv!(export_dir, "06_Customers.csv",
        "Customer Name,Phone,Bill No,Date,Description,Debit,Credit,Balance",
        cust_entries,
        |r: &serde_json::Value| vec![
            jstr(r,"customer"),jstr(r,"phone"),jstr(r,"bill_no"),jstr(r,"date"),
            jstr(r,"description"),jstr(r,"debit"),jstr(r,"credit"),jstr(r,"balance")
        ]
    );

    write_csv!(export_dir, "07_Users.csv",
        "Name,Email,Role,Created At",
        users,
        |r: &serde_json::Value| vec![
            jstr(r,"name"),jstr(r,"email"),jstr(r,"role"),jstr(r,"created_at")
        ]
    );

    write_csv!(export_dir, "08_Settings.csv",
        "Key,Value",
        settings,
        |r: &serde_json::Value| vec![
            jstr(r,"key"),jstr(r,"value")
        ]
    );

    // ── 3. README ─────────────────────────────────────────────────────────────
    let readme = format!(
"HR Filling Station — Data Export
Generated: {}

FILES IN THIS FOLDER:
  ebs_snapshot.json   — ALL data in JSON format (machine-readable, import into any app)
  01_Purchases.csv    — Purchase records (open in Microsoft Excel / Google Sheets)
  02_Sales.csv        — Sales records
  03_Expenses.csv     — Expense entries with categories
  04_Assets.csv       — Asset entries with categories
  05_Liabilities.csv  — Liability entries with categories
  06_Customers.csv    — Customer ledger (all transactions)
  07_Users.csv        — Registered users and roles
  08_Settings.csv     — Application configuration settings

HOW TO OPEN IN EXCEL:
  1. Open Microsoft Excel
  2. File → Open → select any .csv file
  3. All data will be imported with correct columns

HOW TO MIGRATE TO ANOTHER APP:
  Use ebs_snapshot.json — it contains every record in structured format.
  A developer can parse this JSON to import into any database system.

BACKUP LOCATION (SQLite database):
  The raw database file is: ebs_business.db
  It can be opened with 'DB Browser for SQLite' (free tool) on any PC.
", ts);
    std::fs::write(export_dir.join("README.txt"), readme)
        .map_err(|e| format!("README write error: {}", e))?;

    Ok(export_dir.to_string_lossy().to_string())
}

/// Create a full portable backup ZIP containing: SQLite DB + JSON + all CSVs.
/// This is a superset of the regular backup and is fully cross-platform.
#[tauri::command]
async fn create_full_export_zip(app: tauri::AppHandle) -> Result<String, String> {
    // First generate all export files
    let export_dir_str = export_data_snapshot(app.clone()).await?;
    let export_dir = std::path::Path::new(&export_dir_str);

    #[cfg(not(mobile))]
    let app_dir = get_base_dir()?;
    #[cfg(mobile)]
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let zip_name  = format!("EBS_FullExport_{}.zip", timestamp);
    let zip_path  = app_dir.join("backups").join(&zip_name);
    let _ = std::fs::create_dir_all(app_dir.join("backups"));

    let file = std::fs::File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let opts = zip::write::FileOptions::<()>::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Pack every file from the exports/ folder
    let entries = std::fs::read_dir(export_dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let fname = entry.file_name().to_string_lossy().to_string();
        let data  = std::fs::read(entry.path()).map_err(|e| e.to_string())?;
        zip.start_file(format!("exports/{}", fname), opts).map_err(|e| e.to_string())?;
        zip.write_all(&data).map_err(|e| e.to_string())?;
    }

    // Also pack the raw SQLite database
    let db_path = app_dir.join("ebs_business.db");
    if db_path.exists() {
        let db_data = std::fs::read(&db_path).map_err(|e| e.to_string())?;
        zip.start_file("ebs_business.db", opts).map_err(|e| e.to_string())?;
        zip.write_all(&db_data).map_err(|e| e.to_string())?;
    }
    // WAL file if present
    let wal_path = app_dir.join("ebs_business.db-wal");
    if wal_path.exists() {
        let wal_data = std::fs::read(&wal_path).map_err(|e| e.to_string())?;
        zip.start_file("ebs_business.db-wal", opts).map_err(|e| e.to_string())?;
        zip.write_all(&wal_data).map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;

    Ok(zip_path.to_string_lossy().to_string())
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Utilities
            get_app_data_path,
            // Backup / Restore
            create_backup_zip,
            restore_from_zip,
            // Google OAuth
            start_oauth_server_and_get_code,
            exchange_oauth_code,
            refresh_access_token,
            // Google Drive
            get_drive_user_info,
            upload_zip_to_drive,
            list_drive_backups,
            download_drive_backup,
            delete_drive_file,
            request_service_account_token,
            get_machine_id,
            save_buffer_to_app_data,
            copy_file_native,
            export_data_snapshot,
            create_full_export_zip,
            copy_to_path,
            activation::get_hwid_activation,
            activation::set_hwid_activation,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_machine_id() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let output = Command::new("powershell")
            .args(&["-NoProfile", "-WindowStyle", "Hidden", "-Command", "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography').MachineGuid"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            return Err("Failed to retrieve machine ID".to_string());
        }

        let guid = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if guid.is_empty() {
            return Err("Machine ID is empty".to_string());
        }

        return Ok(guid);
    }
    
    #[cfg(target_os = "android")]
    {
        // For Android, we use the hwid_activation logic or a simpler placeholder.
        return Err("Please use get_hwid_activation for mobile".to_string());
    }

    #[cfg(not(any(target_os = "windows", target_os = "android")))]
    {
        return Ok("non-windows-machine-id".to_string());
    }
}
