mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::write_file,
            commands::get_recent,
            commands::push_recent,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
