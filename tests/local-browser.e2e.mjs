import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
import {startApp} from '../local/server.mjs';
import {emptyProfile} from '../extension/schema.js';

test('local UI: persistent profile, region selection, fill/readback, undo, cancel and stale scan',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'apply-once-test-'));
  const context=await chromium.launchPersistentContext(join(dir,'browser'),{headless:process.env.APPLY_ONCE_HEADED!=='1',channel:process.env.APPLY_ONCE_BROWSER_CHANNEL||undefined,viewport:{width:1180,height:850}});
  const app=await startApp(context,dir);
  const fixture=http.createServer(async(req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');if(req.url==='/moka')return res.end(await readFile(new URL('../fixtures/moka.html',import.meta.url)));res.end(`<!doctype html><html lang="zh-CN"><title>虚构招聘表单</title><style>body{font:18px sans-serif;padding:30px}section{padding:20px;border:1px solid #bbb;margin:20px;width:500px}label{display:block;margin:16px}input{display:block;height:32px;width:300px}button{padding:10px}</style><h1>虚构招聘表单</h1><section id="inside"><label>姓名<input id="name"></label><label>邮箱<input id="email" value="keep@example.test"></label></section><section id="outside"><label>手机号<input id="phone"></label><label>证件号码<input id="identity"></label></section><button onclick="document.body.dataset.submitted='yes'">提交申请</button></html>`);});
  await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));
  const fixtureURL=`http://127.0.0.1:${fixture.address().port}`;
  try{
    const control=await context.newPage();await control.goto(app.origin);
    await control.locator('#status').filter({hasText:'先保存资料'}).waitFor();
    const profile=emptyProfile();profile.personal={name:'虚构候选人',email:'demo@example.test',phone:'13800000000',idNumber:'fictional-id'};
    control.once('dialog',d=>d.accept());
    await control.locator('#import').setInputFiles({name:'demo.profile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(profile))});
    await control.locator('#status').filter({hasText:'资料已导入'}).waitFor();
    assert.deepEqual(JSON.parse(await readFile(join(dir,'profile.json'),'utf8')),profile);
    await control.locator('#url').fill(fixtureURL);await control.locator('#open').click();
    await control.locator('#status').filter({hasText:'网页已打开'}).waitFor();
    const target=context.pages().find(p=>p.url().startsWith(fixtureURL));
    await control.locator('#region').click();
    await target.locator('[data-apply-once-ui="region"]').waitFor();
    const b=await target.locator('#inside').boundingBox();
    await target.mouse.move(b.x+b.width+5,b.y+b.height+5);await target.mouse.down();await target.mouse.move(b.x-5,b.y-5,{steps:8});await target.mouse.up();
    await control.locator('#scope').filter({hasText:'框选区域 · 2 个字段'}).waitFor();
    assert.equal(await control.locator('article.field').count(),2);
    await control.locator('#fill').click();await control.locator('#status').filter({hasText:'填写完成'}).waitFor();
    assert.equal(await target.locator('#name').inputValue(),'虚构候选人');
    assert.equal(await target.locator('#email').inputValue(),'keep@example.test');
    assert.equal(await target.locator('#phone').inputValue(),'');
    assert.equal(await target.locator('#identity').inputValue(),'');
    assert.equal(await target.locator('body').getAttribute('data-submitted'),null);
    if(process.env.APPLY_ONCE_SCREENSHOT_DIR){await mkdir(process.env.APPLY_ONCE_SCREENSHOT_DIR,{recursive:true});await control.screenshot({path:join(process.env.APPLY_ONCE_SCREENSHOT_DIR,'local-control.png'),fullPage:true});await target.screenshot({path:join(process.env.APPLY_ONCE_SCREENSHOT_DIR,'filled-region.png')});}
    await control.locator('#undo').click();await control.locator('#status').filter({hasText:'已还原 1 项'}).waitFor();
    assert.equal(await target.locator('#name').inputValue(),'');
    await control.locator('#region').click();await target.locator('[data-apply-once-ui="region"]').waitFor();await target.keyboard.press('Escape');
    await control.locator('#status').filter({hasText:'已取消框选'}).waitFor();assert.equal(await target.locator('[data-apply-once-ui]').count(),0);
    await assert.rejects(app.session.fill({requestId:'old',profile,mappings:[]}),/扫描已变化/);
    await control.locator('#scan').click();await control.locator('#scope').filter({hasText:'整页 · 4 个字段'}).waitFor();
    const cards=control.locator('article.field');assert.equal(await cards.nth(3).locator('input[type=checkbox]').isChecked(),false);
    await cards.nth(3).locator('input[type=checkbox]').check();await control.locator('#fill').click();
    await control.locator('#status').filter({hasText:'证件号码需要单独允许'}).waitFor();
    assert.equal(await target.locator('#name').inputValue(),''); // rejects the whole plan before writing
    await cards.nth(3).locator('input[type=checkbox]').uncheck();
    await cards.nth(1).locator('input[type=checkbox]').check();await control.locator('#overwrite').check();
    await control.locator('#fill').click();await control.locator('#status').filter({hasText:'填写完成'}).waitFor();
    assert.equal(await target.locator('#email').inputValue(),'demo@example.test');
    await target.locator('#name').fill('人工修改');await control.locator('#undo').click();
    await control.locator('#status').filter({hasText:'跳过 1 项'}).waitFor();
    assert.equal(await target.locator('#name').inputValue(),'人工修改');assert.equal(await target.locator('#email').inputValue(),'keep@example.test');
    await target.reload();await control.locator('#fill').click();
    await control.locator('#status.error').waitFor();assert.equal(await target.locator('#name').inputValue(),'');
    const rejected=await fetch(`${app.origin}/api/state`,{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});
    assert.equal(rejected.status,403);
    // Moka Sugar: region-only education, split dates, then repeated language records.
    profile.education=[{school:'虚构大学',startDate:'2024-09',endDate:'2027-06'}];
    profile.languages=[{name:'英文',reading:'熟练'},{name:'日语',reading:'一般'}];
    await control.getByText('我的资料',{exact:true}).click();control.once('dialog',d=>d.accept());
    await control.locator('#import').setInputFiles({name:'moka.profile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(profile))});
    await control.locator('#status').filter({hasText:'资料已导入'}).waitFor();
    await target.goto(`${fixtureURL}/moka`);
    await control.locator('#region').click();await target.locator('[data-apply-once-ui="region"]').waitFor();
    const education=await target.locator('#education').boundingBox();
    await target.mouse.move(education.x-3,education.y-3);await target.mouse.down();await target.mouse.move(education.x+education.width+3,education.y+education.height+3,{steps:6});await target.mouse.up();
    await control.locator('#scope').filter({hasText:'框选区域 · 5 个字段'}).waitFor();
    assert.equal(await control.locator('article.field').count(),5);
    assert.ok((await control.locator('article.field').allTextContents()).every(t=>t.includes('moka-select')));
    await control.locator('#fill').click();await control.locator('#status').filter({hasText:'填写完成'}).waitFor();
    for(const [id,value] of Object.entries({'school':'虚构大学','start-year':'2024','start-month':'9','end-year':'2027','end-month':'6'}))assert.equal(await target.locator(`#${id}-value`).textContent(),value);
    assert.equal(await target.locator('#language-0-value').textContent(),'');
    assert.equal(await target.locator('#reading-0-value').textContent(),'精通');
    await control.locator('#undo').click();await control.locator('#status').filter({hasText:'跳过 5 项'}).waitFor();
    assert.equal(await target.locator('#school-value').textContent(),'虚构大学');
    await control.locator('#overwrite').uncheck();
    await control.locator('#scan').click();await control.locator('#scope').filter({hasText:'整页 · 9 个字段'}).waitFor();
    await control.locator('#fill').click();await control.locator('#status').filter({hasText:'填写完成'}).waitFor();
    assert.equal(await target.locator('#language-0-value').textContent(),'英文');
    assert.equal(await target.locator('#language-1-value').textContent(),'日语');
    assert.equal(await target.locator('#reading-0-value').textContent(),'精通');
    assert.equal(await target.locator('#reading-1-value').textContent(),'一般');
    if(process.env.APPLY_ONCE_SCREENSHOT_DIR){await control.screenshot({path:join(process.env.APPLY_ONCE_SCREENSHOT_DIR,'moka-control.png'),fullPage:true});await target.screenshot({path:join(process.env.APPLY_ONCE_SCREENSHOT_DIR,'moka-filled.png'),fullPage:true});}
  }finally{
    await context.close();await app.close();await new Promise(resolve=>fixture.close(resolve));await rm(dir,{recursive:true,force:true});
  }
});
