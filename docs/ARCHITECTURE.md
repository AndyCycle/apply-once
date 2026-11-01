# ApplyOnce 架构与数据流

本项目提供原生 JavaScript 的 Chrome Manifest V3 扩展，以及 Node.js + Playwright 本地版。扩展无需构建；本地版增加仅监听回环地址的控制服务，复用 schema 与页面引擎。此文更新于 2026-11-01。

## 本地浏览器入口

`local/start.mjs` 启动专用持久浏览器和 `local/server.mjs`，控制页面由 `local/index.html`、`app.js`、`style.css` 提供。`local/browser.mjs` 管理目标标签页、扫描轮次和填写请求，`local/region.js` 在目标页面安装临时拖框遮罩，Esc 或 pointercancel 清理遮罩并取消。

框选坐标以当前视口 CSS 像素计，选择期间拦截滚轮。`engine.scan(region)` 先计算整页的字段指纹和歧义，再按控件中心点筛选并缩小可填写句柄表，保留整页经历序号。框选后只显示区域内字段；填写前核对轮次、目标页与资料路径，沿用引擎的字段身份检查与回读。刷新后旧句柄失效，需要重新扫描。

资料显式保存到用户目录 `.apply-once/profile.json`，专用浏览器目录为 `.apply-once/browser`；可通过 `APPLY_ONCE_DATA_DIR` 指定其他目录。资料不加密，控制服务不记录表单值日志。API 仅接受本机绑定 Host、同源 Origin 和每次启动随机令牌，请求大小上限 2MB；令牌只供本机控制页面使用。第三方招聘页面仍会收到用户选中的填写值。

本地模式提供规则匹配、人工改映射、框选、填写与撤销。它不读取扩展 storage；两入口通过 version 1 资料 JSON 手动迁移。共享引擎现适配 Moka Sugar 单选与拆分年月：读取 apply-field 标题和显示值，按 apply-block / apply-fields 定位分组和重复记录，展开控件内菜单后只点击唯一精确选项并回读。引擎版本为 3，重扫时替换旧注入实例。Moka 选项暂不自动撤销，两入口都提示这一限制；原生字段撤销保持不变。

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

自动化测试使用 Node test runner 和 jsdom，另有真实 Chrome/Chromium 的本地控制页端到端测试。虚构 Moka Sugar 样例覆盖单选、年月、已有值及重复记录；DOM 测试额外覆盖重复/缺失/禁用选项和回读失败。Chrome 扩展的真实权限、侧栏生命周期以及具体招聘站点的组件行为仍需独立验收；北森、大易及其他 Moka 控件尚未逐站验证。

仓库内的两个 ZIP 是已有下载产物；运行 `npm run package` 输出 `dist/apply-once/`，不会自动刷新这两个 ZIP。发布时须核对版本与产物来源。
