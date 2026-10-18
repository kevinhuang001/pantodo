# Pantodo 0.6.13

- Repeat 底层只保存一条 Todo，各次 occurrence 的开始、结束、due、状态、完成时间和删除标记都保存在其内部。
- 列表与 Panel 展开全部历史周期和今天的周期；跨日自动生成当天记录，重新打开时补齐关闭期间的周期。未来日历条目继续实时计算。
- 修改计划或重复规则保留已记录周期的时间和状态，关闭 Repeat 后仍保留历史。
- 完成、重开、单次删除及计时按日期独立操作；专注记录保留对应的 occurrence 日期。
- 兼容迁移旧版状态与跳过记录。WebDAV 自动合并不同周期的修改，同周期冲突保留人工选择。
- 更新中英日 README、使用说明与周期历史截图；Repeat 保持无默认常驻边框，编辑器状态保持只读。

Installers are published only after checks, browser workflows and all desktop builds pass.
