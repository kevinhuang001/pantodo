Pantodo 的首个 Tauri 桌面测试版，欢迎安装后反馈。

- 全屏专注：隐藏导航与列表，显示当前 Todo、计时、暂停/继续与停止。退出专注后仍继续工作计时。
- 可爱的纸张创建页、玻璃导航与清晰的 Todo 列表。
- 日/周/月/日程时间表，支持缩放、计划时间块和独立的截止线。
- 工作计时、补录、编辑与时间统计；补录会整条替换重叠记录。
- 组合筛选面板、网格宽度与排序、四象限模板，以及项目/视图 emoji。
- 主题与语言集中在设置里。
- Rust 原生文件持久化，关闭/休眠时停止计时，重新打开不自动继续。

| 系统                | 文件                    |
| ------------------- | ----------------------- |
| macOS Apple Silicon | aarch64.dmg             |
| macOS Intel         | x64.dmg                 |
| Windows x64         | setup.exe 或 .msi       |
| Linux x64           | .AppImage、.deb 或 .rpm |

macOS 包采用 ad-hoc 签名，尚未经过 Apple 公证；首次打开可能需要在系统设置的“隐私与安全性”中允许。Windows 测试包未配置商业签名，可能出现 SmartScreen 提示。

Linux 需要 WebKitGTK 4.1；原生休眠通知使用 systemd-logind。请测试你的实际系统上的休眠与恢复行为。

本地数据保存在系统应用数据目录下的 `io.github.kevinhuang001.pantodo/workspace.json`，也可以从设置导出 JSON。浏览器预览数据与桌面版的数据目录独立。
