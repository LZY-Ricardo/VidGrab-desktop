# VidGrab 本地 Resolver

`resolver/` 负责在用户本机执行视频解析、下载、封面代理和任务查询。

这是桌面端迁移的第一阶段核心模块，目标是把原仓库里已经验证过的本地解析能力迁入新仓库，并保持接口兼容。

## 启动方式

```bash
cd resolver
pip install -r requirements.txt
python server.py
```

默认监听：

- `http://127.0.0.1:61337`

## 已提供接口

- `GET /api/health`
- `POST /api/info`
- `POST /api/download`
- `GET /api/download/status/{task_id}`
- `GET /api/download/file/{task_id}`
- `GET /api/proxy/image`

## 说明

- 本地 resolver 默认优先尝试读取本机浏览器 cookies
- 当前以 Windows 本机开发和验证为主
- 这一阶段只保证 resolver 单独可运行，不负责桌面壳自动托管
