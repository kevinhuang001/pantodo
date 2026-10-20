# Pantodo 0.6.14

- 修复 WebDAV 对有效文件的误判：支持 UTF-8 BOM、Pantodo 工作区导出文件和缺省视图显示参数，校验失败会标明问题记录。
- WebDAV 自动同步间隔可设置为 30–86400 秒；左下角新增可用的手动同步按钮、旋转状态、上次成功同步时间及具体失败原因。
- 重复 Todo 重新打开时补齐全部错过的周期；完成本次后立即生成下一次，即使日期尚未到达。保留原定日期和各次独立状态，遵守次数与结束日期限制，避免重复生成。
- About 删除技术栈与 Milestone，新增检查更新、新版本下载入口及失败说明；支持识别 Pantodo 已发布的预发布版本。
- 更新中文、英语、日语文案和使用说明，并补充同步、重复任务与更新检查的回归测试。

Installers are published only after checks, browser workflows and all desktop builds pass.
