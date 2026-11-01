# 本地版安装与使用

## 启动

安装 Node.js 22 或更新版本，下载完整源码并解压。Windows 已安装 Google Chrome 时，在仓库目录执行 `npm ci`，以后双击根目录 `start-local.cmd`。

其他平台或希望使用 Playwright 配套 Chromium 时：

```sh
npm ci
npx playwright install chromium
npm start
```

Linux 若提示缺少系统依赖，按 Playwright 提示运行 `npx playwright install --with-deps chromium`。控制页面地址使用随机本机端口，启动后自动打开。关闭整个专用浏览器或在启动终端按 Ctrl+C 退出。

## 一次框选填写

1. 在「我的资料」编辑基本信息及经历，点击保存。已有扩展资料可先从扩展导出 JSON，再在本地版导入；导入会确认替换当前资料。
2. 输入招聘网页地址并打开，在专用浏览器中自行完成登录和页面导航。也可以手动新建标签页，然后点击控制页面的「刷新标签页」。
3. 选择要填写的标签页，先滚动到目标区域，再点「框选区域」。程序切到招聘页后，用鼠标左键拖出矩形；按 Esc 取消。也可点「扫描整页」。
4. 返回 ApplyOnce 控制标签页，核对区域内各字段的映射和本次值，勾选要填写的字段。字段中心点在框内才入选；重复字段需人工核对。
5. 点击「填写勾选字段」，再到招聘页核查。默认保护已有内容；需要覆盖时明确勾选。证件号码需单独允许。可撤销上次填写，已手动改过的值会保留。

框选只限定扫描范围，仍由用户核对后填写。当前视口以外的字段需滚动后重新框选；新增经历、刷新或跳转后重新扫描。跨域 iframe 请将其中表单单独打开。

Moka Sugar 的单选和拆分年月下拉已接入扩展及本地版，框选后也可填写。选项文字须与资料值唯一精确匹配；重复、禁用、缺失选项保持未填并显示结果。教育经历的 `2024-09` 等日期会拆成年与月映射。Moka 选项暂不支持自动撤销，需要在网页手动调整；其他自定义下拉和级联仍需手动选择。上传、验证码、协议和最终提交由本人完成。

## 资料与登录

默认数据目录是用户主目录下 `.apply-once`，其中 `profile.json` 为资料，`browser/` 为专用浏览器登录数据。扩展存储与本地版独立，使用 JSON 导入导出迁移。本地版当前不保存站点映射，不提供 API/Agent 建议。

如需指定目录，在启动前设置环境变量，例如 PowerShell：

```powershell
$env:APPLY_ONCE_DATA_DIR='D:\ApplyOnceData'
$env:APPLY_ONCE_BROWSER_CHANNEL='chrome'
npm start
```

专用目录保存资料与登录信息，不应上传到 GitHub或与他人共享；资料文件为明文。工具默认只在本机提供控制界面，招聘网站仍能读取填写进它的值。

## 验证

```sh
npm run validate
npm run test:browser
```

`test:browser` 使用临时资料和虚构招聘表单，覆盖浏览器中的框选、范围外保护、已有值保护、撤销、Esc 取消、敏感字段授权、刷新后失效和跨来源 API 拒绝；还通过 `fixtures/moka.html` 验证 Moka 菜单展开、学校单选、四个年月字段、重复语言记录及已有选项保护。该虚构样例与 DOM 回归不代表所有 Moka 企业站点均已实站验收。默认无头执行，`APPLY_ONCE_HEADED=1` 可显示浏览器；`APPLY_ONCE_BROWSER_CHANNEL=chrome` 使用已安装 Chrome。`APPLY_ONCE_SCREENSHOT_DIR` 可指定虚构验收截图目录。测试结束关闭浏览器并清理临时资料，不接触用户的专用数据目录。
