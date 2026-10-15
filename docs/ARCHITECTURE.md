# ApplyOnce 架构与数据流

本项目是原生 JavaScript 的 Chrome Manifest V3 扩展，没有构建步骤或后台业务服务器。此文根据 2026-10-15 的代码整理，供本会话及后续开发交接使用。

## 模块入口

| 文件 | 职责 | 修改时关联验证 |
|---|---|---|
| `extension/manifest.json` | 权限、侧栏、service worker、CSP | `npm run check` 与 Chrome 加载 |
| `extension/background.js` | 点击图标打开侧栏，限制存储访问上下文 | 实际 Chrome 权限与侧栏验收 |
| `extension/schema.js` | 资料结构校验、展平、字段别名与唯一匹配 | `tests/core.test.mjs` |
| `extension/engine.js` | 页面扫描、字段身份、填值、回读和撤销 | `tests/core.test.mjs` 与虚构表单 |
| `extension/panel.js` | 资料编辑、映射预览、授权与填表编排 | `tests/panel.test.mjs` |
| `extension/assist.js` | 任务导出、建议校验、兼容 API 请求 | `tests/assist.test.mjs` |
| `scripts/package.mjs` | 从扩展目录生成可加载发布目录 | `npm run package` |

## 一次填写的执行过程

1. 用户点击扩展图标，`activeTab` 提供当前页临时访问权，侧栏读取 `chrome.storage.local` 中的 `profile` 和 `mapping`。
2. 点击扫描后，侧栏注入 `engine.js`。引擎遍历文档及开放的 Shadow DOM，读取可见控件的标签、类型、当前值和经历上下文，排除密码、文件、提交等控件。
3. 每个控件获得本轮 ID 和用于复用的指纹。指纹包含分组、记录序号、标签、标签名、输入类型、name、autocomplete 与重复序号。
4. 侧栏优先使用已保存映射，否则按规范化标签与别名做唯一匹配。经历字段还需匹配分组和记录序号。无明确区分的重复字段不默认勾选。
5. 用户核对映射和本次值。记住映射时，键为 `origin + route`；route 包含 pathname 和去掉查询部分的 hash。保存的是字段到资料路径的对应关系。
6. 填写前检查标签页和来源，页面端再次检查控件身份、连接状态、可见性、已有值、长度和日期格式。原生 select 只接受唯一精确匹配。
7. 引擎调用原生 setter，触发 input/change/blur，短暂等待后回读。撤销只还原仍等于本次写入值的控件，导航或刷新会丢失内存撤销记录。

## 可选模型路径

`makeTask` 仅导出控件标签、分组、种类以及非敏感资料字段的路径和名称，不携带资料值或页面当前值。网页标签本身仍需检查个人信息。

Agent 与兼容 API 都返回 `version + requestId + mappings`。校验拒绝过期请求、未知路径、重复字段等；建议仅加入空白预览行，并保持未勾选。实际值始终从侧栏资料库读取。API Key 留在侧栏内存，请求结束清空。

## 当前验证边界

自动化测试使用 Node test runner 和 jsdom。它们验证 DOM 逻辑与模拟的扩展接口；Chrome 的真实权限、侧栏生命周期以及具体招聘站点的组件行为仍需浏览器验收。Moka 自定义选择器需手动操作，北森和大易仅有通用识别说明，不能据此宣称已逐站验证。

仓库内的两个 ZIP 是已有下载产物；运行 `npm run package` 输出 `dist/apply-once/`，不会自动刷新这两个 ZIP。发布时须核对版本与产物来源。
