use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// 读取任意路径的文本内容。路径由前端经原生 open 面板选定。
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// 写入文本到任意路径。路径由前端经原生 save 面板选定。
#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

/// 写入二进制（PNG / PDF 导出用）。前端以 number[] 传入。
#[tauri::command]
pub fn write_file_bytes(path: String, contents: Vec<u8>) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

const RECENT_MAX: usize = 10;

fn recent_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("recent.json"))
}

fn load_recent(app: &tauri::AppHandle) -> Result<Vec<String>, String> {
    let p = recent_path(app)?;
    if !p.exists() {
        return Ok(vec![]);
    }
    let text = fs::read_to_string(&p).map_err(|e| e.to_string())?;
    Ok(serde_json::from_str(&text).unwrap_or_default())
}

/// 读取最近列表，剔除已不存在的文件（被删除/移动的路径不再出现在 Open Recent）。
#[tauri::command]
pub fn get_recent(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let mut list = load_recent(&app)?;
    let before = list.len();
    list.retain(|x| PathBuf::from(x).exists());
    if list.len() != before {
        let p = recent_path(&app)?;
        let text = serde_json::to_string_pretty(&list).map_err(|e| e.to_string())?;
        fs::write(&p, text).map_err(|e| e.to_string())?;
    }
    Ok(list)
}

/// 把 path 提到最近列表头部（去重），截断到 RECENT_MAX，返回更新后的列表。
#[tauri::command]
pub fn push_recent(app: tauri::AppHandle, path: String) -> Result<Vec<String>, String> {
    let mut list = load_recent(&app)?;
    list.retain(|x| x != &path);
    list.insert(0, path);
    list.truncate(RECENT_MAX);

    let p = recent_path(&app)?;
    let text = serde_json::to_string_pretty(&list).map_err(|e| e.to_string())?;
    fs::write(&p, text).map_err(|e| e.to_string())?;
    Ok(list)
}
