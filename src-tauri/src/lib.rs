// EBS Petroleum — Tauri Backend
// Handles: SQLite plugin registration, Backup/Restore, Google OAuth2, Drive API

use std::io::{Read, Write};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/// Returns the app-data directory path (e.g. %APPDATA%\com.ebs.business on Windows)
#[tauri::command]
fn get_app_data_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKUP — Create ZIP of the SQLite database file
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn create_backup_zip(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let db_path = app_dir.join("ebs_business.db");
    if !db_path.exists() {
        return Err("Database file not found. Please add some data first.".to_string());
    }

    let backups_dir = app_dir.join("backups");
    std::fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono::Utc::now()
        .format("%Y%m%d_%H%M%S")
        .to_string();
    let zip_name = format!("EBS_Backup_{}.zip", timestamp);
    let zip_path = backups_dir.join(&zip_name);

    let file = std::fs::File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::FileOptions::<()>::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // 1. Backup metadata
    let meta = serde_json::json!({
        "version": "1.0",
        "app": "EBS Petroleum",
        "createdAt": chrono::Utc::now().to_rfc3339(),
        "dbFile": "ebs_business.db"
    });
    zip.start_file("metadata.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(meta.to_string().as_bytes())
        .map_err(|e| e.to_string())?;

    // 2. Main SQLite database file
    zip.start_file("ebs_business.db", options)
        .map_err(|e| e.to_string())?;
    let db_data = std::fs::read(&db_path).map_err(|e| e.to_string())?;
    zip.write_all(&db_data).map_err(|e| e.to_string())?;

    // 3. Write-Ahead Logs (WAL) if they exist (Crucial for real-time uncommitted data)
    let wal_path = app_dir.join("ebs_business.db-wal");
    if wal_path.exists() {
        zip.start_file("ebs_business.db-wal", options).map_err(|e| e.to_string())?;
        let wal_data = std::fs::read(&wal_path).map_err(|e| e.to_string())?;
        zip.write_all(&wal_data).map_err(|e| e.to_string())?;
    }

    // 4. Shared memory file (SHM)
    let shm_path = app_dir.join("ebs_business.db-shm");
    if shm_path.exists() {
        zip.start_file("ebs_business.db-shm", options).map_err(|e| e.to_string())?;
        let shm_data = std::fs::read(&shm_path).map_err(|e| e.to_string())?;
        zip.write_all(&shm_data).map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;

    Ok(zip_path.to_string_lossy().to_string())
}

// ─────────────────────────────────────────────────────────────────────────────
// RESTORE — Extract ZIP and replace the SQLite database
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn restore_from_zip(zip_path: String, app: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let db_path = app_dir.join("ebs_business.db");

    let file = std::fs::File::open(&zip_path).map_err(|e| {
        format!("Cannot open backup file: {}", e)
    })?;

    let mut archive = zip::ZipArchive::new(file).map_err(|e| {
        format!("Invalid ZIP archive: {}", e)
    })?;

    let mut found_db = false;
    let mut has_wal_in_zip = false;

    // First pass: extract files
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();
        
        if name == "ebs_business.db" || name == "ebs_business.db-wal" || name == "ebs_business.db-shm" {
            let mut data = Vec::new();
            entry.read_to_end(&mut data).map_err(|e| e.to_string())?;
            
            let target_path = app_dir.join(&name);
            let ext = target_path.extension().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "db".to_string());
            let tmp_path = target_path.with_extension(format!("restoring.{}", ext));
            
            std::fs::write(&tmp_path, &data).map_err(|e| e.to_string())?;
            // Remove existing file before renaming to avoid "File exists" OS error on Windows
            let _ = std::fs::remove_file(&target_path);
            std::fs::rename(&tmp_path, &target_path).map_err(|e| e.to_string())?;

            if name == "ebs_business.db" { found_db = true; }
            if name == "ebs_business.db-wal" { has_wal_in_zip = true; }
        }
    }

    if found_db {
        // If the backup did not contain a WAL file, we MUST proactively delete any local WAL files
        // so that SQLite doesn't overwrite the fresh backup with stale memory logs!
        if !has_wal_in_zip {
            let _ = std::fs::remove_file(app_dir.join("ebs_business.db-wal"));
            let _ = std::fs::remove_file(app_dir.join("ebs_business.db-shm"));
        }
        return Ok(());
    }

    Err("Backup ZIP does not contain a valid database file (ebs_business.db).".to_string())
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

    let response: serde_json::Value = if !existing.is_empty() {
        let file_id = existing[0]["id"].as_str().unwrap_or("");
        client
            .patch(format!(
                "https://www.googleapis.com/upload/drive/v3/files/{}?uploadType=multipart",
                file_id
            ))
            .bearer_auth(&access_token)
            .header("Content-Type", &content_type)
            .body(body)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json()
            .await
            .map_err(|e| e.to_string())?
    } else {
        client
            .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
            .bearer_auth(&access_token)
            .header("Content-Type", &content_type)
            .body(body)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json()
            .await
            .map_err(|e| e.to_string())?
    };

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
            ("pageSize", "20"),
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
// DOWNLOAD FROM DRIVE → save to temp file → return path for restore_from_zip
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn download_drive_backup(
    file_id: String,
    access_token: String,
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

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let restore_path = app_dir.join("cloud_restore_temp.zip");
    std::fs::write(&restore_path, &data).map_err(|e| e.to_string())?;

    Ok(restore_path.to_string_lossy().to_string())
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
            get_machine_id,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_machine_id() -> Result<String, String> {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let output = Command::new("powershell")
            .args(&["-Command", "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography').MachineGuid"])
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
    
    #[cfg(not(target_os = "windows"))]
    {
        return Ok("default-machine-id".to_string());
    }
}
