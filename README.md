# ApplyOnce · 一次填写

本地优先的 Chrome 求职填表扩展。维护一份资料，在不同企业的招聘系统中扫描、核对并填写，手动修正的字段映射可供下次复用。

Local-first Chrome recruitment autofill. Deterministic rules work without an LLM. Bring your own OpenAI-compatible API or export a mapping task to a local agent. Every suggestion is reviewed before filling. MIT licensed. [Agent integration guide](docs/AGENT-PROTOCOL.md).

## 三种使用方式

| 方式 | 适用内容 | 接入方式 |
|---|---|---|
| 本地规则 | 姓名、联系方式、学校、专业、日期等常见字段 | 开箱即用，无需模型 |
| 自带 LLM API | 特殊字段名称的语义匹配 | 侧栏填写完整接口地址、模型和 Key，预览任务后发送 |
| 本地 Agent | 在 Codex、Claude Code 等本地工具中辅助匹配 | 导出任务 JSON，让 agent 生成建议 JSON，再导入核对 |

辅助模式只提供字段映射，资料值始终由本机资料库填入。详见 [接入协议与可复制提示词](docs/AGENT-PROTOCOL.md)。

## 安装（Chrome 116+）

直接下载：[扩展安装包](https://github.com/AndyCycle/apply-once/raw/refs/heads/main/apply-once-v0.1.0.zip)（解压后加载 `apply-once` 目录）；或通过 **Code → Download ZIP** 下载完整仓库后按下列步骤加载 `extension` 目录。

1. 下载代码并解压，保留 `extension` 文件夹。
2. 打开 `chrome://extensions`，启用右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择 `extension`。
4. 固定工具栏中的 ApplyOnce 图标。打开招聘网页后点击图标，侧栏会展开。

无需构建即可加载，无需 API Key。更新代码后在扩展管理页点击重新加载。

## 使用

1. 在「我的资料」填写基本信息，添加教育、实习、项目、语言及奖项，保存。也支持导入/导出 version 1 JSON。
2. 在目标招聘页点击工具栏图标授予当前页临时访问权，再点击「扫描当前页面」。
3. 核对识别结果；通过下拉框更换资料字段。本次值可修改，修改不会覆盖主资料库。
4. 点击「记住当前映射」，以后同一来源及页面路径可复用。
5. 勾选字段并填写。默认保留已有值，证件号码需要单独允许。
6. 对自定义下拉/级联控件，用「定位」「复制本次值」在页面完成选择。按需手动增加第二条、第三条经历，再重新扫描。
7. 核对各行填写结果和网页内容；附件上传、邮箱确认、协议及最终提交自行完成。

每次填写可撤销一次，仅还原仍保持本扩展填入值的字段，已手动修改的内容保留。重新填写会替换撤销记录；导航/刷新后记录消失。

## 支持边界

| 类型 | v0.1 |
|---|---|
| 原生 input/textarea/contenteditable | 支持，触发 input/change，回读验证 |
| 原生 select | 唯一精确匹配选项文字或 value |
| 原生 date/month | 支持标准 ISO 日期 |
| React 等受控输入 | 使用原生 setter + 事件；页面拒绝值时显示提示 |
| Moka 等组件式表单 | 字段标签识别；自定义下拉/日期/级联需手动选择 |
| 北森、大易等 | 通用字段识别与站点映射；尚未逐站真实验证 |
| 重复经历 | 有明确 section/record 容器时按顺序识别；其他情况手动映射，重复字段不默认勾选 |
| Shadow DOM | 可遍历开放的 shadow roots；封闭根不支持 |
| iframe | 提示存在内嵌表单；需在独立标签页打开该表单 |
| 文件上传、验证码、协议、提交 | 保留本人操作 |

本版不承诺任意招聘网站的自定义控件都能一键完成。跨站复用依赖语义识别 + 可保存的人工映射，而非模拟所有网站的选项操作。动态新增表单后重新扫描，重复经历顺序调整后检查映射。

## 隐私与权限

- `activeTab`：点击扩展图标后临时访问当前页面。
- `scripting`：注入扫描/填写逻辑。
- `storage`：只使用 `chrome.storage.local`，禁用内容脚本直接读取；不使用云同步。
- `sidePanel`：展示资料与匹配预览。
- 默认无网络请求，无后台服务器、遥测或第三方脚本。只有点击发送 API 时向用户选定的服务发出请求；可选站点权限按 API 来源申请。密钥只留在当前侧栏内存，请求后清空，不写入备份或本地存储。
- API/Agent 任务不包含资料值和页面已填值。字段标签来自网页，仍需检查其中的个人信息。资料不是加密保险箱，浏览器账户和备份文件需自行保护。
- 仅选中的本次值会发给当前页面；网站可在最终提交前收集已输入内容。
- 仓库不收录真实资料。`private/`、`*.profile.json` 等被 Git 忽略。

## 开发与验证

```sh
npm ci
npm test
npm run check
npm run package
```

运行测试仅使用虚构数据。`fixtures/form.html` 可在本地 HTTP 服务打开，用于人工验收。测试覆盖字段识别、敏感/危险字段排除、重复字段、填值回读、已有内容保护、下拉匹配、日期及撤销冲突。`dist/apply-once/` 为可加载的发布目录。

参考：[activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)、[Side Panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)、[Storage](https://developer.chrome.com/docs/extensions/reference/api/storage)。

## License

[MIT](LICENSE). 欢迎贡献字段别名、虚构表单样例和站点适配。提交问题时请删除个人资料、凭据和含令牌的招聘链接。
