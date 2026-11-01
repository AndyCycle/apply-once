import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {emptyProfile,flatten,infer} from '../extension/schema.js';

const engine=readFileSync(new URL('../extension/engine.js',import.meta.url),'utf8');
const select=(label,value='',options=['一般','熟练','精通'])=>`<div class="apply-field-test"><div class="title-test">${label}<span class="required-asterisk-test"></span></div><div class="sd-Dropdown-container-test"><label class="sd-Select-container-test"><span class="sd-Input-display-value-test">${value}</span><input placeholder="请选择"></label><div class="sd-Select-menu-test" hidden>${options.map(x=>`<div class="sd-Select-common-item-test"><div class="option-label-test">${x}</div></div>`).join('')}</div></div></div>`;
function page(html){
  const dom=new JSDOM(html,{url:'https://jobs.example.test/apply',runScripts:'outside-only'}),w=dom.window;
  w.CSS={escape:s=>s};w.HTMLElement.prototype.getClientRects=function(){return this.closest('[hidden]')?[]:[{width:100,height:20}];};
  for(const wrapper of w.document.querySelectorAll('[class*="sd-Dropdown-container-"]')){
    const input=wrapper.querySelector('input'),menu=wrapper.querySelector('[class*="sd-Select-menu-"]'),display=wrapper.querySelector('[class*="sd-Input-display-value-"]');
    input.addEventListener('click',()=>{menu.hidden=false;});
    input.addEventListener('keydown',e=>{if(e.key==='Escape')menu.hidden=true;});
    for(const option of menu.children)option.addEventListener('click',()=>{display.textContent=option.textContent;menu.hidden=true;input.value='';});
  }
  w.eval(engine);return {api:w.__applyOnce,doc:w.document,w};
}
test('Moka labels, selected values and repeated record context are preserved',()=>{
  const {api}=page(`<div class="apply-block-test"><div class="blockTitle-test">语言能力</div><div class="apply-fields-test">${select('语言类型','英文',['中文','英文'])}${select('阅读能力','精通')}</div><div class="apply-fields-test">${select('语言类型','日语',['中文','英文','日语'])}</div></div>`);
  const s=api.scan();assert.equal(s.fields[0].label,'语言类型');assert.equal(s.fields[0].current,'英文');assert.equal(s.fields[0].kind,'moka-select');assert.equal(s.fields[1].required,true);assert.equal(s.fields[2].recordIndex,1);assert.equal(s.fields[2].section,'languages');
});
test('Moka select chooses one exact option, reads display text, preserves existing selection',async()=>{
  const {api,doc}=page(select('书写能力')+select('阅读能力','精通'));
  const s=api.scan(),r=await api.fill(s.fields.map(f=>({id:f.id,value:'熟练'})),false);
  assert.equal(r[0].status,'已填入并核对');assert.equal(r[1].status,'保留已有值');
  assert.deepEqual(Array.from(doc.querySelectorAll('[class*="sd-Input-display-value-"]'),e=>e.textContent),['熟练','精通']);
  assert.equal(api.scan().fields[0].current,'熟练');assert.equal((await api.revert()).skipped,1);
});
test('Moka duplicate, disabled and missing options never select an arbitrary item',async()=>{
  for(const options of [['熟练','熟练'],['一般'],['熟练']]){
    const {api,doc}=page(select('书写能力','',options));
    if(options.length===1&&options[0]==='熟练')doc.querySelector('[class*="sd-Select-common-item-"]').setAttribute('aria-disabled','true');
    const s=api.scan(),r=await api.fill([{id:s.fields[0].id,value:'熟练'}],false);
    assert.equal(r[0].status,'选项未唯一匹配，未填入');assert.equal(api.scan().fields[0].current,'');
  }
});
test('Moka option that rejects selection reports failure',async()=>{
  const {api,doc}=page(select('书写能力'));
  doc.querySelector('[class*="sd-Input-display-value-"]').addEventListener('unused',()=>{});
  doc.querySelectorAll('[class*="sd-Select-common-item-"]')[1].addEventListener('click',()=>{doc.querySelector('[class*="sd-Input-display-value-"]').textContent='一般';});
  const s=api.scan(),r=await api.fill([{id:s.fields[0].id,value:'熟练'}],false);assert.equal(r[0].status,'页面未保留值，请手动核对');
});
test('Moka date components map to the right record and start/end month',()=>{
  const dates=Array.from({length:4},()=>select('', '',['2024','2027','6','9']).replace(/<div class="apply-field-test"><div class="title-test">.*?<\/div>/,'').replace(/<\/div>$/,'')).join('');
  const {api}=page(`<div class="apply-block-test"><div class="blockTitle-test">教育背景</div><div class="apply-fields-test"><div class="apply-field-test"><div class="title-test">就读时间</div>${dates}</div></div></div>`);
  const p=emptyProfile();p.education=[{startDate:'2024-09',endDate:'2027-06'}];const entries=flatten(p);
  assert.deepEqual(Array.from(api.scan().fields,f=>infer(f,entries)?.value),['2024','9','2027','6']);
});
