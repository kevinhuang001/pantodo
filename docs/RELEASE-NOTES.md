# Pantodo 0.6.0

- 侧栏改为中度磨砂，提高底层颜色可见度，保留浅色／深色遮色和原生 Sidebar / Acrylic 材质。
- 自定义 View 统一承载面板；面板内容只保留 list / gallery，移除 board 和重复的 grid 排列。
- 面板排列保留纵向和 column。column 默认两列，列数只在 View 设置中调整；面板宽度移入面板编辑器。
- 设置页重新设计，使用图标导航、分组卡片和统一的 shadcn/ui 表单。
- 新增 WebDAV 手动／自动同步、连接测试、状态反馈、冲突选择、删除标记和 ETag 并发保护。任务、项目、标签、自定义面板视图及工作记录可以跨设备同步。
- 网页版默认使用 localStorage。同步按需启用，登录信息、外观设置和运行中的计时器保留在当前设备。

WebDAV uses an existing directory and requires strong ETags. Browser sync also requires server CORS configuration; desktop uses native HTTP. See [README](../README.md#sync-your-devices) for setup.

Installers are published only after checks, browser workflows and all desktop builds pass.
