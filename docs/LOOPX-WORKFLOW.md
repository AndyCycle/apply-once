# LoopX：长期自动化开发的状态与验收

调研日期：2026-10-15。原始材料固定在 `loopx-project/loopx@4b838ba09e69f0b2a79d5b4047711ea8ead0f6b6`。本次阅读了项目说明、开发指令、概念导读、Reward Memory 与 Explore 说明，并抽查任务租约及验收失败处理代码；未安装或运行 LoopX，下面区分文档约定、代码观察与 ApplyOnce 的采用建议。

## 与 Magpie 的互补

Magpie 的公开工作流说明三个循环分别处理哪些反馈、审查和维护工作。LoopX 进一步把跨会话的目标、任务归属、证据、权限、等待和恢复状态写入持久控制层，让下一轮重新读取当前事实后行动。

因此，循环需要同时回答：本轮要产生什么可验收结果、谁负责、哪些证据仍有效、等待什么、上次操作是否已经完成。持续唤醒本身不证明这些条件已经成立。

## 值得采用的原则

| 原则 | 原始依据 | ApplyOnce 的具体采用 |
|---|---|---|
| 保存紧凑状态 | [概念导读](https://github.com/loopx-project/loopx/blob/4b838ba09e69f0b2a79d5b4047711ea8ead0f6b6/docs/development/control-plane-course/00-concept-primer.md) 将目标、任务、证据和恢复条件外置；每轮重新生成执行信息 | 任务记录保留验收条件、当前提交、下一步和恢复条件；接手时重新核对仓库与 CI |
| 交付用户可见结果 | [AGENTS.md](https://github.com/loopx-project/loopx/blob/4b838ba09e69f0b2a79d5b4047711ea8ead0f6b6/AGENTS.md) 要求沿用一份交付摘要，检查实现、集成、失败路径和结果回读 | “23 项测试通过”记录为验证证据；招聘表单上的实际填写行为仍需独立验收 |
| 明确写入归属 | [租约获取实现](https://github.com/loopx-project/loopx/blob/4b838ba09e69f0b2a79d5b4047711ea8ead0f6b6/loopx/control_plane/coordination/task_lease_acquire.ts) 检查 owner、版本、工作区、写入范围及依赖，返回冲突或恢复信息 | 当前采用单个任务负责人和独立分支；并行开发时再增加独立 worktree 与任务交接机制 |
| 证据绑定到当前版本 | 租约代码在重放回执后仍检查当前证明；[验收失败实现](https://github.com/loopx-project/loopx/blob/4b838ba09e69f0b2a79d5b4047711ea8ead0f6b6/loopx/control_plane/turn_driver/task_validation_failure.ts) 区分 host 返回与独立后置条件验证 | CI、截图和审查记录关联目标 SHA；提交变化后重新判断证据覆盖范围 |
| 重试先确认已发生的效果 | 租约代码用幂等键与请求摘要保存回执，写入结果不确定时要求用同一操作身份恢复 | 推送超时先读取远端 SHA；发布或创建 PR 超时先查现有对象，避免重复创建 |
| 等待要有恢复条件 | 概念导读要求 monitor、backoff、恢复条件和最终验收 | CI 运行中记录 run URL 与下次检查条件；认证阻塞只暂停依赖认证的步骤；完成后停止轮询 |
| 经验需有来源和作用域 | [Reward Memory](https://github.com/loopx-project/loopx/blob/4b838ba09e69f0b2a79d5b4047711ea8ead0f6b6/loopx/capabilities/reward_memory/README.md) 分离反馈证据、策略内容与行动权限，并声明该能力默认关闭、实验性 | LESSONS 记录失败与回归证据；适用到对应模块，过期时修订；反馈不自动扩大行动权限 |

代码抽查证明这些检查出现在所读路径中，不能据此宣称所有执行路径、宿主和恢复场景均已端到端验证。

## 本项目的轻量落地

以 Git 提交、GitHub CI/PR 和任务记录作为对应事实的来源。任务记录链接这些对象，避免复制一份会过时的测试状态。当前使用 [开发循环](AUTOMATION.md) 中的记录模板和人工/Agent 执行协议，尚没有数据库、原子租约、幂等事件存储或常驻调度器。

先做好三件事：明确验收、刷新证据、可恢复交接。等实际出现多个工作者争抢任务、跨会话频繁恢复或大量定时任务时，再评估接入 LoopX 控制层的维护收益。本轮不引入 LoopX 运行依赖，不修改扩展的离线运行结构。

## 研究与宣传数字的边界

[项目 README](https://github.com/loopx-project/loopx/blob/4b838ba09e69f0b2a79d5b4047711ea8ead0f6b6/README.zh-CN.md) 提供了特定模型、任务集与执行设置下的 benchmark 结果。本次未复算这些实验，不能将其转化为 ApplyOnce 开发效率或正确率的预期增益。采用理由来自上述状态与验收机制对当前项目问题的适用性。
