#![allow(non_snake_case)]

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[tauri::command]
fn get_memory_usage(pid: u64) -> Option<f64> {
    let path = format!("/proc/{}/status", pid);
    let contents = std::fs::read_to_string(path).ok()?;
    for line in contents.lines() {
        if line.starts_with("VmRSS:") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let kb: u64 = parts[1].parse().ok()?;
                let fvalue = kb as f64;
                return Some(fvalue / 1024.0);
            }
        }
    }

    None
}

#[tauri::command]
fn get_pid_by_name(name: &str) -> u64 {
    let output = std::process::Command::new("pgrep")
        .arg(name)
        .output()
        .expect("Failed to execute pgrep");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let pidLine = stdout.lines().next().unwrap_or_default();
    return pidLine.trim().parse::<u64>().unwrap_or_default();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_memory_usage, get_pid_by_name])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
