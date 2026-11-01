import {chromium} from 'playwright';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {startApp} from './server.mjs';

const dataDir=process.env.APPLY_ONCE_DATA_DIR||join(homedir(),'.apply-once');
const context=await chromium.launchPersistentContext(join(dataDir,'browser'),{headless:false,viewport:null,channel:process.env.APPLY_ONCE_BROWSER_CHANNEL||undefined});
const app=await startApp(context,dataDir);
const page=await context.newPage();await page.goto(app.origin);
console.log(`ApplyOnce 本地版：${app.origin}\n资料与专用浏览器数据：${dataDir}\n关闭浏览器或按 Ctrl+C 退出。`);
context.on('close',()=>app.close());
process.once('SIGINT',()=>context.close());
