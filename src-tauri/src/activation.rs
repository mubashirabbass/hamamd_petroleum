use tauri::Manager;
use crate::get_base_dir;

#[tauri::command]
pub fn get_hwid_activation(app: tauri::AppHandle) -> Result<String, String> {
    #[cfg(not(mobile))]
    let base_dir = get_base_dir()?;
    
    #[cfg(mobile)]
    let base_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let path = base_dir.join("ebs_activation.key");
    if !path.exists() {
        return Ok("".to_string());
    }
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_hwid_activation(id: String, app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(not(mobile))]
    let base_dir = get_base_dir()?;
    
    #[cfg(mobile)]
    let base_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let path = base_dir.join("ebs_activation.key");
    std::fs::write(path, id).map_err(|e| e.to_string())
}
