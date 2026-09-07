# Linux 环境引导：官方资料

状态：canonical；阶段：implementation-backed；来源类型：外部知识。


获取日期：2026-09-06；新鲜度：normal；复核期限：2026-09-16；置信度：高（官方文档/源码），具体桌面可用性仍依设备验证。项目使用egui/eframe 0.31.1；以下Fcitx 5与Secret Service资料是当日上游页面，不声明为本机安装版本。

- [Fcitx 5设置](https://fcitx-im.org/wiki/Setup_Fcitx_5)：桌面启动、输入法框架与会话配置。
- [Fcitx 5 on Wayland](https://fcitx-im.org/wiki/Using_Fcitx_5_on_Wayland)：配置依桌面与GTK/Qt等工具包而异。
- [fcitx5-remote官方源码](https://github.com/fcitx/fcitx5/blob/master/src/tools/remote.cpp)：`-r`调用`ReloadConfig`，不是插件安装/进程重启。
- [Secret Service官方规范](https://specifications.freedesktop.org/secret-service/latest/)：会话、集合锁定及解锁语义；不能从已有渠道配置推断当前vault可访问。
