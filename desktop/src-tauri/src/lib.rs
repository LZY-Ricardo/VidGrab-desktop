use serde::Serialize;
use std::{
    fs::{self, OpenOptions},
    io::{Read, Write},
    net::TcpStream,
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager, State};

#[derive(Default)]
struct ResolverState {
    child: Mutex<Option<Child>>,
}

#[derive(Serialize)]
struct ResolverStatus {
    supported: bool,
    running: bool,
    service_ready: bool,
    mode: String,
    pid: Option<u32>,
    message: String,
    workdir: Option<String>,
    config_dir: Option<String>,
    log_file: Option<String>,
}

const RESOLVER_HEALTH_ADDR: &str = "127.0.0.1:61337";

#[derive(Debug, Clone, PartialEq, Eq)]
struct ResolverRuntimePaths {
    workdir: PathBuf,
    config_dir: PathBuf,
    log_file: PathBuf,
}

fn resolver_dev_workdir(cwd: PathBuf) -> PathBuf {
    cwd.join("..").join("resolver")
}

fn build_runtime_paths(
    workdir: PathBuf,
    app_config_dir: PathBuf,
    app_log_dir: PathBuf,
) -> ResolverRuntimePaths {
    ResolverRuntimePaths {
        workdir,
        config_dir: app_config_dir.join("resolver"),
        log_file: app_log_dir.join("resolver").join("resolver-host.log"),
    }
}

fn ensure_parent_dir(path: &PathBuf) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("path has no parent: {}", path.display()))?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())
}

fn ensure_dir(path: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|error| error.to_string())
}

fn runtime_paths(app: &AppHandle) -> Result<ResolverRuntimePaths, String> {
    let resource_dir = app
        .path()
        .resolve("resolver", tauri::path::BaseDirectory::Resource)
        .map_err(|error| error.to_string())?;
    let workdir = if resource_dir.exists() {
        resource_dir
    } else {
        let cwd = std::env::current_dir().map_err(|error| error.to_string())?;
        resolver_dev_workdir(cwd)
    };

    let config_dir = app.path().app_config_dir().map_err(|error| error.to_string())?;
    let log_dir = app.path().app_log_dir().map_err(|error| error.to_string())?;
    let paths = build_runtime_paths(workdir, config_dir, log_dir);

    ensure_dir(&paths.workdir)?;
    ensure_dir(&paths.config_dir)?;
    ensure_parent_dir(&paths.log_file)?;

    Ok(paths)
}

fn log_host_event(log_file: &PathBuf, message: &str) -> Result<(), String> {
    ensure_parent_dir(log_file)?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_file)
        .map_err(|error| error.to_string())?;
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_secs();
    writeln!(file, "[{timestamp}] {message}").map_err(|error| error.to_string())
}

fn probe_resolver_health(addr: &str, timeout: std::time::Duration) -> bool {
    let mut stream = match TcpStream::connect_timeout(
        &addr.parse().unwrap_or_else(|_| "127.0.0.1:9".parse().expect("fallback addr parse")),
        timeout,
    ) {
        Ok(stream) => stream,
        Err(_) => return false,
    };

    let _ = stream.set_read_timeout(Some(timeout));
    let _ = stream.set_write_timeout(Some(timeout));

    let request = b"GET /api/health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
    if stream.write_all(request).is_err() {
        return false;
    }

    let mut response = String::new();
    if stream.read_to_string(&mut response).is_err() {
        return false;
    }

    response.contains("\"status\":\"ok\"") || response.contains("\"status\": \"ok\"")
}

fn wait_for_resolver_health(
    addr: &str,
    attempts: usize,
    delay: std::time::Duration,
    timeout: std::time::Duration,
) -> bool {
    for _ in 0..attempts {
        if probe_resolver_health(addr, timeout) {
            return true;
        }
        thread::sleep(delay);
    }
    false
}

fn build_resolver_command(app: &AppHandle) -> Result<Command, String> {
    let paths = runtime_paths(app)?;
    let mut command = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("py");
        cmd.arg("-3");
        cmd.arg("server.py");
        cmd
    } else {
        let mut cmd = Command::new("python3");
        cmd.arg("server.py");
        cmd
    };

    let stdout = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&paths.log_file)
        .map_err(|error| error.to_string())?;
    let stderr = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&paths.log_file)
        .map_err(|error| error.to_string())?;

    command.current_dir(&paths.workdir);
    command.env("PYTHONUNBUFFERED", "1");
    command.env("VIDGRAB_RESOLVER_CONFIG_DIR", &paths.config_dir);
    command.stdout(Stdio::from(stdout));
    command.stderr(Stdio::from(stderr));
    Ok(command)
}

fn current_resolver_status(
    state: &State<ResolverState>,
    paths: Option<&ResolverRuntimePaths>,
    message: String,
) -> ResolverStatus {
    let mut guard = state.child.lock().expect("resolver state lock poisoned");
    let mut running = false;
    let mut pid = None;

    if let Some(child) = guard.as_mut() {
        match child.try_wait() {
            Ok(Some(_)) => {
                *guard = None;
            }
            Ok(None) => {
                running = true;
                pid = Some(child.id());
            }
            Err(_) => {
                *guard = None;
            }
        }
    }

    let service_ready = if running {
        probe_resolver_health(RESOLVER_HEALTH_ADDR, std::time::Duration::from_millis(300))
    } else {
        false
    };

    ResolverStatus {
        supported: true,
        running,
        service_ready,
        mode: "tauri".to_string(),
        pid,
        message,
        workdir: paths.map(|item| item.workdir.display().to_string()),
        config_dir: paths.map(|item| item.config_dir.display().to_string()),
        log_file: paths.map(|item| item.log_file.display().to_string()),
    }
}

#[tauri::command]
fn resolver_status(app: AppHandle, state: State<ResolverState>) -> ResolverStatus {
    let paths = runtime_paths(&app).ok();
    let message = {
        let guard = state.child.lock().expect("resolver state lock poisoned");
        if guard.is_some() {
            "Tauri 宿主已托管 resolver 进程".to_string()
        } else {
            "当前未运行 resolver，可由 Tauri 宿主启动".to_string()
        }
    };
    current_resolver_status(&state, paths.as_ref(), message)
}

#[tauri::command]
fn start_resolver(app: AppHandle, state: State<ResolverState>) -> Result<ResolverStatus, String> {
    let paths = runtime_paths(&app)?;
    {
        let mut guard = state
            .child
            .lock()
            .map_err(|_| "resolver state lock failed".to_string())?;
        if let Some(child) = guard.as_mut() {
            if child
                .try_wait()
                .map_err(|error| error.to_string())?
                .is_none()
            {
                return Ok(current_resolver_status(
                    &state,
                    Some(&paths),
                    "resolver 已在运行中".to_string(),
                ));
            }
            *guard = None;
        }
    }

    log_host_event(
        &paths.log_file,
        &format!(
            "starting resolver, workdir={}, config_dir={}",
            paths.workdir.display(),
            paths.config_dir.display()
        ),
    )?;
    let mut command = build_resolver_command(&app)?;
    let child = command
        .spawn()
        .map_err(|error| format!("启动 resolver 失败: {error}"))?;
    let pid = child.id();
    let mut guard = state
        .child
        .lock()
        .map_err(|_| "resolver state lock failed".to_string())?;
    *guard = Some(child);

    let ready = wait_for_resolver_health(
        RESOLVER_HEALTH_ADDR,
        20,
        std::time::Duration::from_millis(200),
        std::time::Duration::from_millis(300),
    );
    log_host_event(&paths.log_file, &format!("resolver started, pid={pid}"))?;
    if !ready {
        log_host_event(
            &paths.log_file,
            "resolver process started but health endpoint did not become ready in time",
        )?;
    }
    Ok(current_resolver_status(
        &state,
        Some(&paths),
        if ready {
            "resolver 已由 Tauri 宿主启动，健康检查通过".to_string()
        } else {
            "resolver 进程已启动，但健康检查未及时通过".to_string()
        },
    ))
}

#[tauri::command]
fn stop_resolver(app: AppHandle, state: State<ResolverState>) -> Result<ResolverStatus, String> {
    let paths = runtime_paths(&app)?;
    let mut guard = state
        .child
        .lock()
        .map_err(|_| "resolver state lock failed".to_string())?;
    if let Some(child) = guard.as_mut() {
        let pid = child.id();
        child
            .kill()
            .map_err(|error| format!("停止 resolver 失败: {error}"))?;
        *guard = None;
        log_host_event(&paths.log_file, &format!("resolver stopped, pid={pid}"))?;
        return Ok(current_resolver_status(
            &state,
            Some(&paths),
            "resolver 已停止".to_string(),
        ));
    }

    Ok(current_resolver_status(
        &state,
        Some(&paths),
        "当前没有 resolver 进程需要停止".to_string(),
    ))
}

pub fn run() {
    tauri::Builder::default()
        .manage(ResolverState::default())
        .invoke_handler(tauri::generate_handler![
            resolver_status,
            start_resolver,
            stop_resolver
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{build_runtime_paths, probe_resolver_health, resolver_dev_workdir};
    use std::{
        io::{Read, Write},
        net::TcpListener,
        path::PathBuf,
        thread,
        time::Duration,
    };

    #[test]
    fn builds_dev_resolver_path_from_desktop_cwd() {
        let cwd = PathBuf::from("F:/myProjects/VidGrab/desktop");
        let actual = resolver_dev_workdir(cwd);

        assert_eq!(actual, PathBuf::from("F:/myProjects/VidGrab/desktop/../resolver"));
    }

    #[test]
    fn builds_runtime_paths_under_app_dirs() {
        let paths = build_runtime_paths(
            PathBuf::from("F:/myProjects/VidGrab/resolver"),
            PathBuf::from("C:/Users/test/AppData/Roaming/top.sunandyu.vidgrab.desktop"),
            PathBuf::from("C:/Users/test/AppData/Roaming/top.sunandyu.vidgrab.desktop/logs"),
        );

        assert_eq!(
            paths.config_dir,
            PathBuf::from("C:/Users/test/AppData/Roaming/top.sunandyu.vidgrab.desktop/resolver")
        );
        assert_eq!(
            paths.log_file,
            PathBuf::from(
                "C:/Users/test/AppData/Roaming/top.sunandyu.vidgrab.desktop/logs/resolver/resolver-host.log"
            )
        );
    }

    #[test]
    fn probe_resolver_health_returns_false_when_port_is_closed() {
        assert!(!probe_resolver_health("127.0.0.1:9", Duration::from_millis(100)));
    }

    #[test]
    fn probe_resolver_health_returns_true_for_health_response() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind test listener");
        let addr = listener.local_addr().expect("local addr");

        thread::spawn(move || {
            if let Ok((mut stream, _)) = listener.accept() {
                let mut buffer = [0_u8; 1024];
                let _ = stream.read(&mut buffer);
                let response = b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 15\r\n\r\n{\"status\":\"ok\"}";
                let _ = stream.write_all(response);
            }
        });

        assert!(probe_resolver_health(
            &addr.to_string(),
            Duration::from_millis(500)
        ));
    }
}
