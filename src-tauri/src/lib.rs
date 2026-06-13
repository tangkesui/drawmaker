mod commands;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        // single-instance 必须最先注册（官方要求）
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // 第二实例启动时，聚焦已有主窗口（未来文件关联可从 _argv 取路径打开）
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::write_file,
            commands::write_file_bytes,
            commands::get_recent,
            commands::push_recent,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
