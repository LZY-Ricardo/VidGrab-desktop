# VidGrab Desktop Migration Plan

## 1. 文档目的

本文档用于指导 `free-video-download` 向 `VidGrab Desktop` 的分阶段迁移。

目标不是一次性搬运旧代码，而是先冻结迁移边界、执行顺序、文件映射、风险与验收标准，后续每个阶段严格按本文档推进，避免出现以下问题：

- 只迁移了 UI，没有迁移契约和状态模型
- 旧项目中的线上假设被原样带入桌面端
- 本地解析、云端登录、会员能力之间职责混乱
- 回滚路径不清晰，导致迁移一半无法收拾

本文档是后续迁移执行的基线文档。任何迁移过程中的范围调整，都必须先更新本文档再动代码。

## 2. 背景与现状

### 2.1 旧仓库

- 路径：`F:/myProjects/free-video-download`
- 现状：Web 前端 + VPS 后端 + Supabase Postgres + Resend 邮件
- 问题：主流平台视频解析在机房出口上持续触发风控，线上能力不稳定

### 2.2 新仓库

- 路径：`F:/myProjects/VidGrab`
- 定位：桌面端优先，本地解析，本地下载，云端仅保留账号/会员/AI 鉴权类能力
- 现状：仅有骨架与基础架构说明，尚未迁移成熟业务代码

### 2.3 迁移总目标

将“依赖云端机房 IP 执行解析”的产品模型，重构为“用户本机执行解析和下载”的产品模型。

最终目标架构：

- 本地：解析、下载、封面代理、字幕提取、文件落盘
- 云端：登录、邮箱验证、会员状态、AI 权限/额度
- 桌面壳：承载 UI、本地服务生命周期、系统级能力、安装与发布

## 3. 迁移范围

### 3.1 要迁移的能力

1. 本地解析服务
2. 桌面端解析/下载 UI
3. 登录与会员状态同步
4. AI 功能的云端调用与本地鉴权联动
5. 本地服务与桌面宿主的启动编排
6. 发布打包与安装文档

### 3.2 明确不迁移的内容

以下能力在桌面端迁移阶段不做，避免范围失控：

- 现有 Web 站点 UI 的完整像素级复刻
- 云端 VPS 上的视频解析主流程
- 在线支付开通能力
- 浏览器扩展
- 自动更新系统
- macOS / Linux 正式发布支持
- 后台任务中心、管理后台、运营后台
- 任何“为了以后可能用到”的提前抽象

### 3.3 有条件迁移的内容

以下能力是否迁移，取决于阶段推进结果与技术验证：

- Tauri 作为最终桌面宿主
- Python 运行时打包进安装包
- 本地浏览器 Cookie 协同策略
- 下载目录、文件命名规则、任务恢复能力

## 4. 新旧系统职责边界

### 4.1 旧系统职责

旧仓库当前同时承担以下职责：

- Web 页面展示
- 解析与下载请求入口
- 云端执行视频解析
- 登录注册
- 会员识别
- AI 请求代理
- 邮件发送

这导致“机房 IP 被风控”直接打穿核心能力。

### 4.2 新系统职责

#### 本地桌面端

- 输入视频链接
- 请求本地 resolver 获取视频信息
- 发起并追踪下载任务
- 本地代理图片与封面
- 展示登录状态、会员状态、AI 可用状态
- 启动/停止本地 resolver
- 管理本地文件系统交互

#### 云端后端

- 账号注册/登录
- 邮箱验证
- JWT / Cookie / Session
- 会员状态查询
- AI 权限与额度控制
- AI 内容处理接口

#### 不再由云端承担

- 视频解析主路径
- 视频文件下载执行
- 与平台风控强耦合的抓取动作

## 5. 迁移原则

1. 先冻结契约，再迁移实现。
2. 先迁移最稳定、最独立的模块，后迁移耦合模块。
3. 每个阶段必须可单独验收，不允许“大爆炸迁移”。
4. 新仓库优先保留清晰边界，不为了复用而强行共享旧代码。
5. 桌面端只接必要云能力，不把旧后端所有路由照搬过来。
6. 所有迁移都以“Windows 首发可用”作为第一目标，不提前兼容全部平台。
7. 任何阶段失败，都必须能够回退到上一个稳定里程碑。

## 6. 目录职责规划

当前新仓库目录如下：

- `desktop/`：桌面 UI 与宿主集成层
- `resolver/`：本地 Python 解析服务
- `shared/`：共享契约、DTO、常量
- `docs/`：架构、迁移、发布、运维文档

建议后续逐步补充：

- `desktop/src/api/`
- `desktop/src/composables/`
- `desktop/src/components/`
- `desktop/src/types/`
- `desktop/src/stores/` 或等价状态层
- `desktop/src-tauri/` 或其他宿主目录
- `scripts/`：本地开发与打包脚本

## 7. 迁移阶段总览

| Phase | 名称 | 目标 | 输出 |
| --- | --- | --- | --- |
| Phase 0 | 文档与契约冻结 | 冻结目标架构、接口契约、执行边界 | 本文档、契约文档、阶段清单 |
| Phase 1 | 迁移本地 Resolver | 将成熟本地解析服务迁入新仓库并跑通 | `resolver/` 可独立运行 |
| Phase 2 | 迁移桌面 UI 最小闭环 | 做到“输入链接 -> 解析 -> 展示 -> 下载” | 可本地运行的桌面前端 |
| Phase 3 | 接入云端登录与会员 | 接入现有账号体系与会员状态 | 登录/退出/会员显示可用 |
| Phase 4 | 接入 AI 与权限控制 | 将 AI 功能按桌面端边界接回 | AI 功能按会员和额度生效 |
| Phase 5 | 宿主集成与本地编排 | 管理 resolver 生命周期与桌面能力 | 桌面应用能托管本地服务 |
| Phase 6 | 打包发布与运维 | 构建安装包、发布文档、排障文档 | 可分发的 Windows 安装物 |

## 8. Phase 0：文档与契约冻结

### 8.1 目标

在任何真实迁移开始前，先完成迁移执行面上的约束。

### 8.2 必做项

1. 冻结新旧仓库职责边界
2. 冻结桌面端 MVP 范围
3. 冻结本地 resolver 对外 API
4. 冻结桌面端与云端最小接口集合
5. 明确“不迁移”的内容清单
6. 明确分阶段验收门槛

### 8.3 输出物

- `docs/DESKTOP-MIGRATION-PLAN.md`
- `shared/contracts.ts` 的契约基线
- 后续阶段任务清单文档

### 8.4 验收标准

- 团队能够只靠文档判断下一步该迁什么、不该迁什么
- 每个阶段有输入、输出、风险和回滚路径
- 不需要再靠口头记忆区分本地与云端职责

## 9. Phase 1：迁移 Resolver

### 9.1 目标

把旧仓库中已经验证可用的本地解析服务完整迁入新仓库，先让 `resolver/` 独立可运行。

### 9.2 输入

- 旧仓库 `local-resolver/`
- 新仓库 `resolver/` 骨架

### 9.3 迁移范围

- HTTP API
- 视频信息获取
- 下载任务管理
- 文件返回
- 图片代理
- README 与依赖定义

### 9.4 非目标

- 与桌面壳自动联动启动
- 安装包嵌入 Python
- 跨平台兼容优化

### 9.5 输出

- 新仓库 `resolver/` 能单独安装依赖并运行
- 本地接口与旧仓库能力一致
- 关键接口有最小冒烟验证

### 9.6 验收标准

- `GET /api/health` 正常
- `POST /api/info` 能返回视频信息
- `POST /api/download` 能创建任务
- 状态查询和文件下载接口可用
- 图片代理可用

### 9.7 风险

- 依赖版本漂移
- Windows Python 环境兼容性
- 本地浏览器/平台 Cookie 与风控差异

### 9.8 回滚策略

- 若新仓库 resolver 无法稳定运行，保留旧仓库 `local-resolver` 作为临时参考实现
- 不删除旧仓库逻辑，只做复制和重组

## 10. Phase 2：迁移桌面 UI 最小闭环

### 10.1 目标

在不接入复杂云能力之前，先做出桌面端最小解析闭环。

### 10.2 输入

- 新仓库 `desktop/` 骨架
- Phase 1 可运行的 `resolver/`
- 旧仓库前端解析/下载相关页面与组合逻辑

### 10.3 必须实现

- URL 输入
- 视频信息展示
- 格式选择
- 下载发起
- 下载进度展示
- 错误提示
- 本地 resolver 健康检查

### 10.4 暂不实现

- 登录弹窗联动
- AI 助手
- 会员卡完整体验
- 复杂导航或页面切换

### 10.5 输出

- 桌面前端页面替代当前占位页
- 能连接本地 resolver 完成基本流程

### 10.6 验收标准

- 用户打开桌面端后能看到可用主页
- 未启动 resolver 时有明确错误提示
- 启动 resolver 后可完成解析与下载操作
- UI 状态切换没有明显死锁或脏状态

### 10.7 风险

- 旧 Web 端状态逻辑耦合登录/会员
- 桌面端环境变量与浏览器端不同
- 下载文件保存路径在桌面环境中需要重新设计

## 11. Phase 3：接入云端登录与会员

### 11.1 目标

把桌面端接回现有云端账号体系，但只接“必须要有”的能力。

### 11.2 输入

- 旧仓库认证与会员逻辑
- 当前线上云端接口

### 11.3 迁移范围

- 登录
- 注册
- 邮箱验证流程
- 当前用户信息
- 会员状态展示
- 登出

### 11.4 明确不迁移

- Web 支付开通流程
- 云端解析接口
- 开发态 mock 支付分支

### 11.5 输出

- 桌面端可完成登录/注册/退出
- 可拉取会员信息并控制 UI 展示

### 11.6 验收标准

- 桌面端登录成功后可保持会话
- 重启桌面端后能恢复登录状态或正确要求重新登录
- 会员用户与普通用户在 UI 层行为有明确区分

### 11.7 风险

- Cookie / Token 在桌面宿主中的持久化策略
- 跨域与本地端口策略
- 邮箱验证跳转地址如何回到桌面端

### 11.8 回滚策略

- 若会话策略尚不稳定，可暂时改为显式 Token 登录模式
- 先保证会员读取正确，再优化自动登录体验

## 12. Phase 4：接入 AI 与权限控制

### 12.1 目标

恢复桌面端中的 AI 能力，但严格走云端鉴权、云端额度控制。

### 12.2 输入

- 旧仓库 AI 组件与组合逻辑
- 云端 AI 路由与额度服务

### 12.3 迁移范围

- AI 助手入口
- 视频摘要 / 思维导图 / 字幕衍生能力
- 会员与额度校验
- 错误态和限额态提示

### 12.4 输出

- 只有已登录且具备权限的用户能使用 AI
- 桌面端与云端会员状态保持一致

### 12.5 验收标准

- 非会员点击 AI 能得到正确提示
- 会员用户可完成一次完整 AI 流程
- 云端额度耗尽时，桌面端有清晰提示

### 12.6 风险

- AI 输入依赖字幕/文本抽取质量
- 桌面端上传内容与云端处理链路长度增加
- 权限错误容易和网络错误混淆

## 13. Phase 5：宿主集成与本地编排

### 13.1 目标

让桌面宿主真正管理本地 resolver，而不是让用户手工分别启动两个进程。

### 13.2 关键事项

- 选择最终宿主技术
- 管理 resolver 启动、停止、健康检查
- 处理端口冲突
- 管理本地日志
- 管理本地配置路径

### 13.3 待决策事项

1. 最终是否采用 Tauri
2. Python 运行时是内嵌、外置还是首次安装引导
3. resolver 进程由宿主拉起还是独立守护进程

### 13.4 输出

- 用户不需要手工运行 `python server.py`
- 桌面应用打开后能自动检测或启动本地 resolver

### 13.5 验收标准

- 冷启动体验清晰
- resolver 未启动、启动失败、端口占用三种状态可识别
- 桌面端退出时，resolver 生命周期符合预期

### 13.6 风险

- Python 打包体积
- 杀毒软件误报
- Windows 权限/路径问题

## 14. Phase 6：打包发布与运维

### 14.1 目标

形成真正可发布、可安装、可排障的 Windows 发行流程。

### 14.2 必须产物

- 本地开发文档
- 打包文档
- 发行检查清单
- 用户安装说明
- 常见问题排障文档

### 14.3 验收标准

- 新用户能够根据文档完成安装与首次使用
- 常见故障可以通过文档定位
- 发布过程可重复执行

## 15. 文件级迁移映射

### 15.1 Resolver 迁移映射

| 旧仓库文件 | 新仓库目标 | 迁移策略 | 备注 |
| --- | --- | --- | --- |
| `local-resolver/README.md` | `resolver/README.md` | 覆盖式重写或合并 | 以新仓库开发方式为准 |
| `local-resolver/requirements.txt` | `resolver/requirements.txt` | 直接迁移后再校正版本 | 先求可运行 |
| `local-resolver/server.py` | `resolver/server.py` | 主体迁移 | Phase 1 核心文件 |

### 15.2 前端到桌面端迁移映射

| 旧仓库文件 | 新仓库目标建议 | 迁移策略 | 所属阶段 |
| --- | --- | --- | --- |
| `frontend/src/App.vue` | `desktop/src/App.vue` | 重构迁移 | Phase 2-4 |
| `frontend/src/api/localResolverClient.ts` | `desktop/src/api/localResolverClient.ts` | 近似直接迁移 | Phase 2 |
| `frontend/src/api/client.ts` | `desktop/src/api/cloudClient.ts` | 重命名并重构 | Phase 3 |
| `frontend/src/components/DownloadForm.vue` | `desktop/src/components/DownloadForm.vue` | 重构迁移 | Phase 2 |
| `frontend/src/components/FormatSelector.vue` | `desktop/src/components/FormatSelector.vue` | 直接或轻量重构 | Phase 2 |
| `frontend/src/components/ProgressBar.vue` | `desktop/src/components/ProgressBar.vue` | 直接或轻量重构 | Phase 2 |
| `frontend/src/components/VideoInfo.vue` | `desktop/src/components/VideoInfo.vue` | 重构迁移 | Phase 2 |
| `frontend/src/composables/useDownload.ts` | `desktop/src/composables/useDownload.ts` | 重构迁移 | Phase 2 |
| `frontend/src/types/index.ts` | `desktop/src/types/index.ts` 或 `shared/contracts.ts` | 拆分迁移 | Phase 1-2 |
| `frontend/src/components/AuthModal.vue` | `desktop/src/components/AuthModal.vue` | 重构迁移 | Phase 3 |
| `frontend/src/components/UserMenu.vue` | `desktop/src/components/UserMenu.vue` | 重构迁移 | Phase 3 |
| `frontend/src/components/MembershipCard.vue` | `desktop/src/components/MembershipCard.vue` | 重构迁移 | Phase 3 |
| `frontend/src/composables/useAuth.ts` | `desktop/src/composables/useAuth.ts` | 重构迁移 | Phase 3 |
| `frontend/src/composables/useMembership.ts` | `desktop/src/composables/useMembership.ts` | 重构迁移 | Phase 3 |
| `frontend/src/components/AIAssistant.vue` | `desktop/src/components/AIAssistant.vue` | 重构迁移 | Phase 4 |
| `frontend/src/components/MindMapTree.vue` | `desktop/src/components/MindMapTree.vue` | 重构迁移 | Phase 4 |
| `frontend/src/composables/useVideoAI.ts` | `desktop/src/composables/useVideoAI.ts` | 重构迁移 | Phase 4 |

### 15.3 后端到云端接口映射

下表不是把后端代码迁入新仓库，而是定义桌面端后续依赖哪些云能力。

| 旧仓库文件 | 新体系角色 | 迁移动作 |
| --- | --- | --- |
| `backend/app/routers/auth.py` | 云端保留 | 桌面端接接口，不迁代码 |
| `backend/app/routers/membership.py` | 云端保留 | 桌面端接接口，不迁代码 |
| `backend/app/routers/ai.py` | 云端保留 | 桌面端接接口，不迁代码 |
| `backend/app/services/auth_service.py` | 云端保留 | 不迁 |
| `backend/app/services/email_service.py` | 云端保留 | 不迁 |
| `backend/app/services/membership_service.py` | 云端保留 | 不迁 |
| `backend/app/services/ai_quota_service.py` | 云端保留 | 不迁 |
| `backend/app/services/video_ai_service.py` | 云端保留 | 不迁 |
| `backend/app/database.py` | 云端保留 | 不迁 |
| `backend/app/db_models.py` | 云端保留 | 不迁 |
| `backend/app/security.py` | 云端保留 | 不迁 |

### 15.4 明确不应迁入桌面仓库的旧后端能力

以下能力保留在云端仓库，不进入桌面仓库：

- `backend/app/routers/info.py`
- `backend/app/routers/download.py`
- `backend/app/routers/image.py`
- `backend/app/services/ytdlp_service.py`
- `backend/app/services/douyin_service.py`
- `backend/app/services/task_manager.py`
- `backend/app/routers/billing.py`
- `backend/app/routers/dev_mock_billing.py`
- `backend/app/services/billing_service.py`

原因：

- 解析、下载、图片代理应转到本地 resolver
- 支付当前线上关闭，不属于当前迁移目标

## 16. 共享契约迁移策略

`shared/contracts.ts` 不应只是占位文件，后续应承载以下最小契约：

- 视频信息请求与响应 DTO
- 下载任务创建、状态、结果 DTO
- 用户信息 DTO
- 会员状态 DTO
- AI 请求与响应 DTO
- 错误码或错误结构

策略如下：

1. Phase 1 先定义 resolver 相关契约
2. Phase 3 再补认证与会员契约
3. Phase 4 再补 AI 契约

不要在 Phase 0 就把所有未来字段一次性设计完。

## 17. 环境变量迁移规划

### 17.1 桌面端环境变量

预期会需要：

- `VITE_LOCAL_RESOLVER_BASE_URL`
- `VITE_CLOUD_API_BASE_URL`
- `VITE_APP_ENV`

### 17.2 Resolver 环境变量

视实现再决定，但至少要为以下能力留口：

- 监听地址
- 监听端口
- 下载目录
- 日志级别

### 17.3 明确不应带入桌面仓库的云端变量

- `DATABASE_URL`
- `JWT_SECRET`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- 任何 Supabase Service Role Key

原则：桌面端仓库不保存云端敏感密钥。

## 18. 测试与验收策略

### 18.1 每阶段最低验证要求

#### Phase 1

- resolver 冒烟测试
- 关键接口人工验证

#### Phase 2

- UI 冒烟测试
- 解析与下载闭环验证

#### Phase 3

- 登录/登出验证
- 会话恢复验证
- 会员状态验证

#### Phase 4

- AI 入口权限验证
- 额度提示验证
- 正常 AI 返回验证

#### Phase 5

- resolver 生命周期验证
- 宿主启动失败场景验证

#### Phase 6

- 安装包安装验证
- 干净机器首次启动验证

### 18.2 验收门槛

每个阶段结束前，至少满足：

1. 代码能在本机稳定运行
2. 核心路径有人工验证记录
3. 未决问题已显式列出
4. 下一阶段输入已经准备好

## 19. 风险清单

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 本地解析在部分平台仍触发风控 | 核心能力不稳定 | 优先保证本地 cookie / 浏览器环境兼容，保留手工排障文档 |
| Python 打包困难 | 发布链路受阻 | 先允许开发期外置 Python，后续再统一内嵌方案 |
| 桌面宿主技术选型反复 | 进度拖延 | 在 Phase 5 前冻结选型，不提前过度实现 |
| 登录会话在桌面端不稳定 | 会员/AI 功能不可用 | 先做显式会话方案，再优化无感登录 |
| 旧 Web 代码耦合严重 | 迁移成本升高 | 采用“按能力重构迁移”，不做目录级复制 |
| 云端接口调整 | 桌面端联调失败 | 把桌面端依赖接口收敛到最小集合 |

## 20. 回滚策略

### 20.1 原则

- 每个阶段单独提交
- 新仓库阶段内失败，不影响旧仓库线上系统
- 只要旧仓库不删、不改核心线上行为，就始终存在退路

### 20.2 执行方式

1. Phase 1 失败：回退到 resolver 骨架，重新梳理依赖
2. Phase 2 失败：保留桌面壳占位页，暂停 UI 迁移
3. Phase 3 失败：先只保留本地解析能力，不阻塞核心下载
4. Phase 4 失败：临时关闭 AI 入口，不影响主下载流程
5. Phase 5 失败：继续采用“手工启动 resolver”的开发模式，待后续补宿主能力

## 21. 里程碑定义

#### Milestone A

本地 resolver 在新仓库稳定运行。

#### Milestone B

桌面 UI 能完成本地解析与下载闭环。

#### Milestone C

桌面端登录、会员状态可用。

#### Milestone D

AI 功能在权限控制下恢复。

#### Milestone E

桌面宿主可托管本地服务并生成 Windows 安装物。

## 22. 当前未决问题

这些问题不阻塞 Phase 0 文档落地，但在进入对应阶段前必须决策。

1. 最终桌面宿主是否采用 Tauri，还是先保持纯 Vite 开发壳
2. Python 运行时是外置依赖、安装器内置，还是首次启动下载
3. 登录态在桌面端采用 Cookie 持久化、Token 持久化，还是两者混合
4. 邮箱验证链接如何从浏览器回跳到桌面端
5. 下载文件默认路径、文件冲突命名策略、用户自定义目录策略如何设计
6. 本地 resolver 端口是否固定为 `61337`
7. 图片代理是否继续通过本地 HTTP 接口，还是直接改成本地文件/二进制桥接

## 23. 推荐执行顺序

后续严格按以下顺序推进：

1. 先完成 Phase 0 文档与契约冻结
2. 再迁移 `resolver/`
3. 再迁移解析/下载 UI
4. 再接登录与会员
5. 再接 AI
6. 最后做宿主托管与打包

不要跳过 Phase 1 去提前做登录或 Tauri 打包，否则会把核心问题再次掩盖。

## 24. 本文档后续维护规则

1. 每进入新阶段前，先补充该阶段的具体执行清单
2. 每完成一阶段，更新对应验收结果与遗留问题
3. 若发现某文件不应迁移或应新增映射，先修改本文档
4. 若范围变化影响里程碑定义，必须先更新文档再改代码

## 25. 当前结论

当前阶段只完成了迁移文档基线落地。

接下来可以进入的第一个真实代码阶段是：

- Phase 1：迁移并稳定 `resolver/`

在得到明确指令前，不开始实际代码迁移。
