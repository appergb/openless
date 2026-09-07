# 04：页面与领域操作

状态：draft；阶段：partial-implementation；更新：2026-09-07。页面实现与自动证据不等于 Linux 原生验收通过。

对应 L04–L09。现有[main.rs](../../openless-all/app/linux-egui/src/main.rs)是可复用的真实 UI 起点，但并非功能齐全的产品。
接口查[Core api.rs](../../openless-all/app/crates/openless-core/src/api.rs)与[domains.rs](../../openless-all/app/crates/openless-core/src/domains.rs)。

## 1. 已有页面与需要补齐的操作

| 领域 | 当前生产UI | egui团队接入要求 |
| --- | --- | --- |
| Provider/渠道 | ASR/LLM/Omni渠道创建、重命名、启停、排序、激活、删除、编辑、列模型和校验已有 | 复用 descriptor；完善 vault 锁定/错误恢复、状态刷新和正式交互，不重做认证规则 |
| 本地模型 | Qwen列表、下载、激活、取消已有 | 接 `LocalAsrApi` 的路径/镜像、model_card/remote_info、状态、删除、preload/release、prepare/test_model及取消；激活使用 Core 原子事务 |
| QA | 文本/语音、流式回答、取消/关闭已有 | 接 `set_edit_instruction_mode`、编辑预览、应用/撤回及状态；用每轮 recording token 停止录音 |
| Selection polish | 可编辑预览、确认、取消、完成后撤回已有 | 保留原目标/session核验和错误反馈，不将剪贴板旧选区当有效原目标 |
| Selection Voice | Core service已有，Linux完整触发/意图路由与UI缺失 | 见下节；不是只加一个按钮即可完成 |
| Less Computer | 文本/语音、输出/工具状态、Allow/Deny审批和取消已有 | 接 `CodingAgentApi` 的detect/list_models/run_test/cancel_test和provider/model/executable/workdir/permission配置；不自建审批与续聊策略 |
| 风格包 | 无管理页 | 接Core列表、创建/编辑、启停/激活、内置重置、删除、提示词诊断、ZIP导入/导出；快捷键依赖L01 |
| 词典/纠错 | 无页面 | 接词条增删/启停、预设、规则；pending corrections接受/拒绝/清空。自动建议来源依赖L02 |
| Marketplace | service和下载归档Host已有，无页面 | 接 `MarketplaceApi` 的列表/详情/安装/下载/上传、点赞/作品、设备OAuth启动/轮询/取消/退出 |
| 历史/统计 | 仅最近20条只读和插入状态 | 完整浏览及历史操作、删除/清空、重润色/重转写、复制/导出、录音播放/定位/清理、活动统计；音频先补L03 |
| 设置 | 环境准备与现有streaming_insert、Agent启用；Remote开关/端口独立到手机输入页 | 补Linux适用的麦克风/静音、语言/翻译、模式/热键、QA历史、选区、隐私/日志和外观；每项必须有真实消费者 |
| Remote Input | 独立页面保留开关、地址、PIN与重置，增加服务状态/连接数/陈旧地址提示及LAN/证书说明，TLS/H5已接 | 继续补二维码、完整连接错误恢复与证书信任体验；复用服务并进行真手机验收 |

不要给 Linux 暴露无实现的 Windows TSF 或 macOS AX 权限按钮。当前 Linux 本地运行时为 Generic Qwen；Foundry/Apple MLX 不是这一轮要求跨平台移植的功能。

## 2. Selection Voice 接入链

1. Linux Host 捕获原生目标、选区及会话身份，接入 Core 的共享语音互斥和停止/取消路径。
2. 使用 `SelectionVoiceApi` 的 `begin`、`process_transcript`、`confirm_intent`；由 Core 决定 `route_disposition`。
3. UI 消费 Selection Voice 事件，展示意图选择或路由后的 QA/编辑结果；当前 main.rs 尚未消费这些事件。
4. 编辑经过 `prepare_edit`、`begin_preview_apply`，Host 按 ticket 核验并执行替换，再以真实结果调用 `finish_preview_apply`。
5. 目标失效、取消、重复确认和未知插入结果都应保持安全，不能绕过 Core 事务直接粘贴。

Linux QA 的 target rekey 适配和现有 Selection runtime可以复用；headless直接调用Core的测试不算生产接线完成。
QA 内的预览必须传当前 turn token，使用 `QaApi::begin_edit_preview_apply`／`revert_edit_preview`；原生应用完成后用 `dismiss_session` 只关闭所属回合。不要拆成读取 conversation owner 后直接改 Selection Voice，再无条件关闭 QA。独立 Selection Voice 的 `begin_preview_apply`／`revert_preview` 是无异步原生效果的同步状态操作；`PasteSent` 只表示已发送，不能标成 `Inserted` 或失败。

## 3. 共同交互规则

- UI只保留编辑草稿、焦点等显示状态；持久化变更走Core facade，不直接读写JSON、凭据或风格ZIP内容。
- 设置携带revision，冲突后重读；渠道ID与provider类型分开，默认值/认证来自descriptor。
- 长操作在Host runtime调度，事件驱动重绘；egui frame不阻塞等待网络、模型下载或进程。
- 字段禁用、加载、取消、错误、空列表、重试与重开须齐备；按钮存在但效果未接入应标明不可用。
- 历史重转使用Auxiliary服务与`apply_history_retranscription`，真实provider/model/timing由Core生成；不要根据当前设置猜历史归因。
- API密钥只写入不读回；配对PIN通过显式配对接口受控显示，不进入通用日志/状态广播。

## 4. 关闭标准

每个领域交付“用户入口 → Core调用 → Host效果 → 事件/持久化”的实际流程；验证成功、失败、取消、重新打开和重启。
领域UI完成不自动关闭相关原生缺口；L02/L03/L01分别验收上下文、音频归档和全局热键。

## 5. 2026-09-06 导航与 Linux 准备引导

页面复用现有 Core 与 Linux Host 接口。

| 入口 | 当前行为 |
| --- | --- |
| 开始 | 环境准备 → AI 服务或本地模型 → 听写；按 Core 有效模式分别显示 ASR/LLM 或 Omni 配置，已配置与校验通过分开；连接后可直达问答、选区润色、Agent、手机输入、历史 |
| 工作页面 | 听写、问答、选区润色、Less Computer 分页；每页独立滚动，草稿与会话保存在同一个 App 状态中 |
| 准备与管理 | AI 服务保留原渠道操作；本地模型保留列表/下载/激活/取消；历史保留最近20条只读与插入结果分类 |
| 环境与设置 | 只提供已有消费者的流式插入与Agent启用，保留revision保存；手机输入配置共用原设置草稿，保存/重新读取明确说明影响 |
| 手机输入 | 配置、保存、状态刷新、连接数、配对码重置；停止、地址陈旧时隐藏PIN和URL，状态读取失败清除旧显示 |

宽窗口使用左侧导航；小于760逻辑像素时改用可换行的顶部导航。主循环仍先无条件`poll`再渲染当前页面，保留50ms重绘、sequence去重、session归属、lag重放、退出shutdown与Esc语音取消。

- QA/Selection/Agent与听写/模型/Remote后台事件给对应导航增加提醒，访问该页面只清除该页未读状态，不取消后台工作。
- `ShowQa`、`ShowSelectionPreview`、`ShowLessComputer`打开所属页面；普通`ShowMain`保留当前页面。隐藏窗口/面板的既有Host语义保留。
- Agent审批固定在页面滚动区外：显示原command与原token对应的允许/拒绝；所有页面可直接取消Agent。取消请求与审批结果仍走原Core facade。
- QA有打开、原文本/语音操作、关闭及显式取消；全局任务栏保留问答取消、选区预览取消和当前语音取消。选区确认/撤回仍核验原session。
- Agent `VoiceState`仅增加导航提示，不把录音session当聊天session，不伪造首帧或电平。完整typed语音反馈与投影恢复仍按[06](./06-events-and-sessions.md)继续接入。

### 环境状态的证据边界

启动失败仍能查看开始页与环境引导。现有插件安装检查的Ready/Updated/Missing/错误结果被保留；Updated/Missing仍阻止启动原生运行时。未连接Core的领域页面展示准备入口，不开放假可用操作。

- 桌面类型来自`LinuxCapabilitySnapshot`的环境判断，不是端到端桌面可用性测试。
- fcitx探测是现有D-Bus Peer Ping，只能说明探测有响应；插件文件存在不能证明加载，加载不能证明任意目标应用落字。
- “重新检测会话与D-Bus”在后台执行，只更新环境探测；不会重新安装插件或启动Core。本次启动的插件检查结果保留，修复后需重启OpenLess。
- 麦克风显示未验证录音／当前环境不支持，不将Unknown当授权成功。Secret Service没有独立连接/解锁探测，UI明确说明未知，并引导用户解锁桌面密钥环后通过原渠道保存/验证获得真实结果。
- 不因X11 overlay或AppImage auto-update能力flag显示假浮层、托盘或更新器，也不新增Windows/macOS专属设置。

可复制的`fcitx5-diagnose`用于诊断；`fcitx5-remote -r`仅重载配置，不能称为重新安装或重启插件。新插件仍未加载时，指引重新登录桌面并重启OpenLess。Wayland指向桌面/工具包对应官方指导，不给所有桌面统一写环境变量。

### 定向验证与剩余实测

导航状态位于[ui_state.rs](../../openless-all/app/linux-egui/src/ui_state.rs)，可在非Linux平台测试。主文件定向测试覆盖后台审批跨页可见、迟到终态隔离、QA/Selection草稿与取消提示、启动失败引导、陈旧Remote地址/PIN隐藏，并保留原两轮QA/Agent回归。

在`openless-all/app`执行：

```sh
rustfmt --edition 2021 --check --config skip_children=true linux-egui/src/main.rs linux-egui/src/ui_state.rs
cargo test -p openless-linux-egui --locked
```

完整主文件的`linux_app::tests`由Linux cfg控制；macOS直接运行上面的Cargo测试不会编译egui主界面。Linux机器还须执行：

```sh
cargo check -p openless-linux-egui --all-targets --locked
cargo test -p openless-linux-egui --bin openless-linux-egui --locked
```

原生依赖沿用[07验收](./07-acceptance.md)与现有CI。真机仍须覆盖420×400短窄窗口与宽窗口、中文字体、后台QA/Selection/Agent触发、跨页审批/取消、插件首次安装及重载、X11/Wayland目标应用、麦克风、密钥环、真实Qwen/CLI与手机TLS。自动布局绘制不是实际窗口/设备验收。

本次实际自动证据（macOS，Homebrew rustc 1.97.1）：

- `cargo test -p openless-linux-egui --locked`：50个Host单元测试、4个Host合同测试及首轮2个导航测试通过；设备测试在此平台为0个，不能作设备证据。
- 为检查Linux cfg内的主界面，在独立临时crate复制本次`main.rs`/`ui_state.rs`，仅临时启用其UI编译，使用仓库已有eframe 0.31.1和同一Core/Linux Host路径依赖；`cargo test --offline`共9个测试通过（含最新3个导航测试、原2个事件回归和新增4个场景绘制测试）。未运行生产启动函数，未改变仓库Cargo清单或锁文件。该证据仅覆盖macOS上的UI类型、状态与无窗口绘制，Host仍使用macOS cfg。
- 尝试`cargo check -p openless-linux-egui --all-targets --target x86_64-unknown-linux-gnu --locked`，因目标`core/std`缺失（E0463）失败；本机Docker服务未运行。**没有Linux目标编译通过证据**，须在配置好原生依赖的Linux环境执行上方两条命令。

### 官方资料

来源、版本、获取日期和有效期以各官方项目发布页为准。
