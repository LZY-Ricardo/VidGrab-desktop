# Tauri Host Integration

## 当前状态

仓库已经接入了 Tauri 运行时骨架，包含：

- `desktop/src-tauri/` Rust 宿主工程
- 前端到宿主的桥接层
- 宿主侧 `resolver_status` / `start_resolver` / `stop_resolver` 命令
- 桌面界面的 Resolver 宿主管理面板

当前这一步已经进入“可本机调试宿主”的阶段，并且首次真实 `tauri:dev` 已经跑通到应用启动；但还不是“可打包发布”。

## 已落地文件

- `desktop/src-tauri/Cargo.toml`
- `desktop/src-tauri/build.rs`
- `desktop/src-tauri/tauri.conf.json`
- `desktop/src-tauri/capabilities/default.json`
- `desktop/src-tauri/src/lib.rs`
- `desktop/src-tauri/src/main.rs`
- `desktop/src/api/hostBridge.ts`
- `desktop/src/composables/useResolverHost.ts`
- `desktop/src/components/ResolverHostPanel.vue`

## 当前运行前提

要真正运行 `npm run tauri:dev`，本机必须安装：

1. Rust toolchain
2. Cargo
3. Tauri 所需的系统依赖

本次会话中已确认：

- `rustup` / `rustc` / `cargo` 已安装并可用
- `npx tauri info` 已通过
- 首次真实 `tauri dev` 已编译完成并成功启动 `target/debug/vidgrab_desktop.exe`

本轮定位出的首个真实阻塞点是：

- `beforeDevCommand` 启动的 Vite 默认会在 `1420` 被占用时自动切到 `1421`
- Tauri 仍然固定等待 `http://127.0.0.1:1420`
- 结果表现为 `tauri dev` 一直等待前端服务，像“卡住”但并非崩溃

因此当前已把桌面端开发脚本改为固定端口：

```bash
vite --host 127.0.0.1 --port 1420 --strictPort
```

这样：

- 端口空闲时，Tauri 能稳定接到前端服务
- 端口冲突时，会直接报错，便于处理，而不是悄悄漂移到别的端口

本轮继续验证时，又定位出一个宿主打包资源路径问题：

- 原配置把 bundle 资源写成了 `../resolver`
- 但 `src-tauri/` 相对仓库根目录的正确路径应为 `../../resolver`
- 否则 Rust 构建阶段会直接报 `resource path '..\\resolver' doesn't exist`

该路径现已修正。

本轮还补齐了 Windows 宿主最小资源：

- `desktop/src-tauri/icons/icon.ico`

当前使用的是占位图标，只用于让开发态宿主正常启动，后续可替换为正式品牌图标。

## 宿主能力边界

目前宿主侧只负责一个最小能力：

- 启动本地 `resolver/server.py`
- 查询 resolver 进程状态
- 停止 resolver 进程
- 对 `127.0.0.1:61337/api/health` 做本地健康检查
- 准备应用级配置目录
- 将 resolver 宿主事件与 resolver 标准输出写入本地日志文件

还没有做：

- resolver 崩溃自动拉起
- Python 运行时内嵌
- 安装包资源裁剪
- 生产环境路径适配

## 前端运行模式

### 浏览器 / Vite 模式

使用：

```bash
cd F:/myProjects/VidGrab
npm run dev:hosted
```

特点：

- 由根脚本托管 resolver + Vite
- 不依赖 Tauri
- 当前开发主路径

### Tauri 模式

使用：

```bash
cd F:/myProjects/VidGrab/desktop
npm run tauri:dev
```

特点：

- 由 Tauri 宿主承载窗口
- 可在应用内启动和停止 resolver
- 需要本机已安装 Rust/Cargo
- 默认固定占用 `127.0.0.1:1420`

如果启动时报端口占用，先排查并释放 `1420` 端口，再重新执行 `npm run tauri:dev`。

第一次编译 Tauri 依赖会下载并编译大量 Rust crates，耗时明显长于前端 dev server，属于正常现象。

如果已经有一个 `tauri:dev` 会话在运行，再次启动第二个会话时，`vite --strictPort` 会因为 `1420` 已被占用而立即失败。这是当前开发脚本下的预期行为，不代表宿主损坏。

当前宿主会向前端返回以下运行时路径，便于排障：

- `service_ready`：本地 health probe 是否通过
- `workdir`：当前 resolver 工作目录
- `config_dir`：宿主为 resolver 预留的应用级配置目录
- `log_file`：宿主日志文件路径

当前 `start_resolver` 会：

- 创建 `app_config_dir()/resolver`
- 创建 `app_log_dir()/resolver/resolver-host.log`
- 把 `VIDGRAB_RESOLVER_CONFIG_DIR` 注入 resolver 进程环境变量
- 将 resolver 的 stdout/stderr 追加写入同一个日志文件
- 对 health endpoint 做短轮询等待，并把结果体现在返回状态里

## 下一步

要把当前“宿主雏形”推进到真正可运行，需要按顺序完成：

1. 安装 Rust 和 Cargo
2. 在应用内人工验证 `ResolverHostPanel` 的查询 / 启动 / 停止
3. 明确 resolver 如何消费 `VIDGRAB_RESOLVER_CONFIG_DIR`
4. 再进入 Windows 打包阶段
