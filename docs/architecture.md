# OpenLess 2.0 架构

状态：canonical（2026-09-07 以源码为准重写）；更新：2026-09-07。

## 1. 分层与工作区

应用唯一源是 `openless-all/app/`。Cargo workspace 成员为 `crates/openless-core` + `linux-egui`；`src-tauri`（及其 `backend-tests` 测试 crate）被 exclude，独立构建。

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 界面（桌面/移动） | `src/`（React/TypeScript/i18next，五语言） | 唯一桌面 UI；页面、设置分类、窗口分支；不另写业务规则 |
| Host（Win/mac/Android） | `src-tauri/`（crate `2.0.0-Beta.1`） | IPC 命令面（`src/lib.rs` 两个 `generate_handler!`，共 188 个注册）；原生 Adapter：窗口、热键、音频、凭据、插入、IME、coordinator |
| 共享 Core | `crates/openless-core/`（crate `0.1.0`） | 全部业务规则与状态机；平台动作只经 `ports.rs` 接口注入 |
| Linux Host + UI | `linux-egui/`（crate `openless-linux-egui` 0.1.0） | 与 Core 同进程：`backend.rs` 组装 `OpenLessBackend`，`main.rs` 跑 egui 界面，不依赖 Tauri/WebKitGTK |

Android 侧：`src-tauri/src/android/`（JNI/桥接）+ `android/`（aidl、kotlin、manifests、frontend）；`android/frontend` 经 vite 别名 `@android` 被 `src/` 引用；manifest 由 `scripts/merge-android-*.mjs` 合成。

## 2. 数据流

- 桌面：React → 类型化 IPC 门面（`src/lib/ipc/`）→ Tauri command → Core；Core 事件由 Host 转发回界面。
- Linux：egui UI → `LinuxHost`（`lib.rs`：`snapshot` / `subscribe` / `save_settings` / `drain_events` 等）→ `OpenLessBackend` → Core，类型化 Rust 接口，不经 IPC。
- 浏览器预览：provider 公开目录由 Core 生成到 `src/lib/ipc/provider-descriptors.generated.json`（`cargo run --locked -p openless-core --example export_provider_descriptors` 重新生成；只含公开元数据，无凭据）；原生端走同一受启动合同保护的 IPC。
- 旧 React command/event 名称只保留在 Tauri 兼容 Adapter；跨平台合同以 `contract/backend-2.0.json` 为准。

## 3. Core 模块地图（按域，见 `src/lib.rs` pub mod 清单）

- 听写链路：`dictation_engine` / `dictation_context` / `audio` / `external_audio` / `silence_auto_stop` / `streaming_insert` / `hotkey_interpreter` / `voice_session`
- 服务与凭据：`provider_rules` / `provider_registry` / `provider_resolution` / `provider_service` / `provider_transport` / `cloud_providers` / `providers` / `omni` / `llm_gemini` / `credentials`(+`credentials_legacy`) / `endpoint_security` / `net`
- 本地模型：`model_store` / `local_asr_service` / `local_asr_catalog` / `asr/`（云与本地 provider 实现）
- 文本加工：`polish` / `prompt_compose`(+`prompts/`，`include_str!` 编译进二进制) / `output_cleaning` / `correction` / `vocabulary`
- 知识与历史：`history` / `activity` / `style_packs` / `style_pack_store`(+`style_pack_archive`) / `marketplace`
- 交互域：`qa_service` / `selection_service` / `selection_voice_service`(+`selection_voice_intent`) / `edit_plan` / `less_computer` / `coding_agent`(+`coding_agent_guard`) / `remote_input_service` / `auxiliary` / `cli`
- 基座：`api` / `events` / `ports` / `settings` / `preferences` / `persistence` / `config` / `errors` / `types` / `shared_types` / `shortcut_types` / `domains` / `android_types` / `host_document/` / `testing` / `vendor/`

## 4. Host 注入点

Core 不直接做平台动作；Host 通过 `ports.rs` 接口注入能力。注入清单以 `linux-egui/src/backend.rs` 的 builder 为准：`with_task_spawner` / `with_recorder` / `with_auxiliary_polisher` / `with_text_inserter` / `with_credential_store` / `with_services` / `with_host_actions` / `with_settings_runtime` / `with_local_asr_runtime` / `with_polish_failure_policy`。业务规则缺失时回报 Core 修复，不在 UI/Host 复制规则。

## 5. 窗口体系

`tauri.conf.json` 声明 `main`、`capsule` 两个窗口；其余窗口由运行时按 `?window=` 种类创建（`src/App.tsx` 分支）：`qa`、`selection` 追问、划词润色预览、语音意图选择、Less Computer（含 glow 变体）与移动端变体。Linux 单实例由 `linux-egui/src/single_instance.rs` 守护并转发启动意图。

## 6. 验证入口

在 `openless-all/app/`：`npm test`（构建 + 前端/合同测试，含 Core 快捷键回归）；`cargo fmt --check`（三 crate）；`cargo test -p openless-core --locked`；`cargo test -p openless-linux-egui --locked`。`src-tauri` 按平台独立构建，macOS 需 `git submodule update --init --recursive`（vendored qwen-asr C 引擎）。
