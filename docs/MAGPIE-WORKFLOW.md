# Magpie 自动化开发流程：证据与迁移方案

调研日期：2026-10-15。仓库证据固定在 `yetone/magpie@2e2c890304eb849fcf1b5267654bddd505bbe283`，避免将搜索引擎中的旧版本与当前文件混用。

## 已读取的原始材料

| 材料 | 可以确认的机制 |
|---|---|
| [AGENTS.md](https://github.com/yetone/magpie/blob/2e2c890304eb849fcf1b5267654bddd505bbe283/AGENTS.md) | 修改前读子系统设计、代码规范和 LESSONS；按实际运行路径定位模块 |
| [子系统索引](https://github.com/yetone/magpie/blob/2e2c890304eb849fcf1b5267654bddd505bbe283/docs/subsystems/README.md) | 将职责、状态、接口和失败行为集中记录；行为契约变化时同步更新；审查需沿调用链验证 |
| [测试工作流](https://github.com/yetone/magpie/blob/2e2c890304eb849fcf1b5267654bddd505bbe283/.github/workflows/test.yml) | push/PR/手动触发；Linux、macOS、Windows 分别验证；包含静态检查、竞态检查与平台专用测试；PR 新提交取消旧任务，main 保留正在执行的任务 |
| [UI 预览说明](https://github.com/yetone/magpie/blob/2e2c890304eb849fcf1b5267654bddd505bbe283/.github/ui-preview/README.md)及[工作流](https://github.com/yetone/magpie/blob/2e2c890304eb849fcf1b5267654bddd505bbe283/.github/workflows/ui-preview.yml) | 检测 UI 变更，构建 PR，植入虚构数据；模型根据 diff 规划浏览器操作，生成截图及交互视频；单独任务将预览发布到 PR 描述 |
| [发布工作流](https://github.com/yetone/magpie/blob/2e2c890304eb849fcf1b5267654bddd505bbe283/.github/workflows/release.yml) | 版本 tag 或手动触发独立 releases 仓库构建与签名，再等待产物齐全并镜像到主仓库；缺少中文说明时显式报告 |

这些文件构成了可观察的工程反馈链：任务定位 → 修改与契约更新 → 自动检查 → 可视化验收 → 发布产物 → 失败反馈。`AGENTS.md` 中存在经验回读要求；此次未成功读取 LESSONS 正文，不推断其具体条目或生成方式。

## X 原帖的证据缺口

已定位作者的[工作流分享](https://x.com/yetone/status/2109855710444237018)和[设计思路分享](https://x.com/yetone/status/2110089344187056263)。本次直接读取均返回 HTTP 403，未取得原帖图片中的提示词。

搜索结果出现“三个 /loop”以及 GitHub、Discord、X 反馈处理的转述，但这些转述不能确定三个循环的精确分工、执行周期、所用模型、成本和权限。因此这里不提供所谓原版提示词，也不将社区复刻者的流程归为 yetone 本人的配置。仓库内的 Actions 只能确认上表中的机制，不能单独证明外部循环的完整配置。

## ApplyOnce 的适配

| 机制 | 本项目现状 | 下一步 |
|---|---|---|
| 代码导航与行为契约 | 已添加架构与开发文档 | 随实际行为变更维护对应文档 |
| 自动检查与构建产物 | 已有 Node/jsdom 测试、check、package 和 Actions artifact | 按真实失败案例扩展回归测试 |
| PR 可视化证据 | 已添加 PR 模板中的截图与验收要求 | 用虚构简历和表单做 Chromium 扩展端到端测试与截图 |
| 反馈处理循环 | 尚未部署 | 先处理 GitHub 问题，记录复现、修复提交、验证和发布状态 |
| 经验反馈 | 当前文档记录已确认行为边界 | 从实际缺陷提炼规则，不预填未经发生的“事故教训” |
| 自动发布 | 当前 CI 只生成 artifact；根目录 ZIP 是已有静态产物 | 版本一致性校验后生成 tag 对应的 Release 附件和校验和 |

推荐先完成可复现测试和截图，再增加定时反馈处理。社交平台巡检并非扩展运行依赖；可在需要时接入单独的反馈入口。

## 实施时的权限划分

Magpie 的预览说明明确指出：录制任务运行 PR 代码时带有 DeepSeek Key，PR 代码能够读取该 Key；发布任务与录制任务分开。ApplyOnce 可以使用固定的虚构表单完成预览，不需要在执行外来 PR 代码的任务中提供模型 Key。构建与预览使用只读权限，发布阶段单独配置写权限。

外部 issue、网页和帖子作为问题材料，不能改变本地开发指令或授权范围。自动处理应保存来源与提交证据，并以测试结论决定下一步。此轮没有创建定时任务，也没有启用自动回复、自动合并或自动发版。
