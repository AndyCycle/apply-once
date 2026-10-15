import {sections,emptyProfile,validateProfile,flatten,infer} from './schema.js';
import {makeTask,validateProposal,endpointURL,requestProposal} from './assist.js';
const $=id=>document.getElementById(id);
let profile=emptyProfile(),entries=[],mapping={},snapshot=null,tabId=null,rows=[];
let assistTask=null;
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function el(tag,attrs={},text=''){const e=document.createElement(tag);Object.assign(e,attrs);e.textContent=text;return e;}
async function run(action){const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{await action();}catch(e){status(e.message||String(e),true);}finally{buttons.forEach(b=>b.disabled=false);}}
function show(view){$('fill-view').hidden=view!=='fill';$('profile-view').hidden=view!=='profile';$('tab-fill').classList.toggle('active',view==='fill');$('tab-profile').classList.toggle('active',view==='profile');}
$('tab-fill').onclick=()=>show('fill');$('tab-profile').onclick=()=>show('profile');
function renderProfile(){
  const target=$('profile-form');target.replaceChildren();
  for(const [key,s] of Object.entries(sections)){
    const group=el('section');group.append(el('h3',{},s.title));
    const records=s.repeat?profile[key]:[profile[key]];
    records.forEach((record,index)=>{
      const block=el('div',{className:'record'});
      if(s.repeat){block.append(el('small',{},`${s.title} ${index+1}`));const remove=el('button',{type:'button'},'删除此条');remove.onclick=()=>{readEditor();profile[key].splice(index,1);renderProfile();};block.append(remove);}
      for(const [field,title] of Object.entries(s.fields)){
        const label=el('label',{},title);
        const long=/description|responsibilities|text/.test(field);
        const input=el(long?'textarea':'input',{value:record[field]||''});input.dataset.key=key;input.dataset.index=index;input.dataset.field=field;
        if(!long){input.type=field==='idNumber'?'password':'text';input.autocomplete='off';}
        if(/Date$/.test(field)||field==='date')input.placeholder='2027-07-01';
        label.append(input);block.append(label);
      }
      group.append(block);
    });
    if(s.repeat){const add=el('button',{type:'button'},`＋ 添加${s.title}`);add.onclick=()=>{readEditor();if(profile[key].length>=30)return status('每组最多30条',true);profile[key].push({});renderProfile();};group.append(add);}
    target.append(group);
  }
}
function readEditor(){for(const input of $('profile-form').querySelectorAll('input,textarea')){const {key,index,field}=input.dataset;(sections[key].repeat?profile[key][Number(index)]:profile[key])[field]=input.value;}profile=validateProfile(profile);entries=flatten(profile);}
$('save').onclick=()=>run(async()=>{readEditor();await chrome.storage.local.set({profile});status('资料已保存到本机。返回适配页面后重新扫描。');});
$('export').onclick=()=>run(async()=>{readEditor();const blob=new Blob([JSON.stringify(profile,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=el('a',{href:url,download:'apply-once.profile.json'});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('已导出，请保管好含个人信息的文件。');});
$('import').onchange=()=>run(async()=>{const file=$('import').files[0];if(!file)return;if(file.size>2_000_000)throw new Error('资料文件应小于2MB');const next=validateProfile(JSON.parse(await file.text()));if(!confirm('导入会替换当前资料。已备份并继续？'))return;profile=next;entries=flatten(profile);await chrome.storage.local.set({profile});renderProfile();rows=[];$('fields').replaceChildren();snapshot=null;status('导入成功，请重新扫描页面。');$('import').value='';});
async function currentTab(){const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.id||!/^https?:/.test(tab.url||''))throw new Error('请在招聘网站点击工具栏扩展图标，再扫描。');return tab;}
async function call(method,args=[]){
  const current=await currentTab();
  if(current.id!==tabId)throw new Error('当前标签页已变化，请重新扫描。');
  const result=await chrome.scripting.executeScript({target:{tabId},func:async(method,args)=>{if(!globalThis.__applyOnce)throw new Error('页面已更新，请重新扫描');return await globalThis.__applyOnce[method](...args);},args:[method,args]});
  return result[0].result;
}
function siteKey(){return `${snapshot.origin}${snapshot.route}`;}
$('scan').onclick=()=>run(async()=>{
  const saved=await chrome.storage.local.get(['profile','mapping']);profile=validateProfile(saved.profile||emptyProfile());entries=flatten(profile);mapping=saved.mapping||{};
  const tab=await currentTab();tabId=tab.id;
  await chrome.scripting.executeScript({target:{tabId},files:['engine.js']});snapshot=await call('scan');
  $('site').textContent=`${snapshot.origin} · ${snapshot.platform} · ${snapshot.fields.length}个字段${snapshot.iframeCount?' · 存在内嵌表单，请单独打开后扫描':''}`;
  assistTask=null;$('assist-preview').value='';renderFields();status(`发现${snapshot.fields.length}个字段。核对勾选项和本次值后填写。`);
});
function renderFields(){
  rows=[];const target=$('fields');target.replaceChildren();
  for(const field of snapshot.fields){
    const remembered=mapping[siteKey()]?.[field.key];
    const suggested=remembered?entries.find(e=>e.path===remembered):field.ambiguous?null:infer(field,entries);
    const card=el('article',{className:'field'}),head=el('label',{className:'check'}),check=el('input',{type:'checkbox'});
    check.checked=!!suggested?.value&&!suggested?.sensitive&&field.kind!=='custom'&&!field.current&&!field.ambiguous;
    head.append(check,el('strong',{},field.label));card.append(head);
    card.append(el('div',{className:'meta'},`${field.section?sections[field.section]?.title||field.section:'未分类'} · ${field.kind}${field.current?' · 已有内容':''}${field.ambiguous?' · 重复字段，需手动核对':''}`));
    const select=el('select',{'ariaLabel':`匹配 ${field.label}`});select.append(el('option',{value:''},'手动选择资料字段 / 仅本次输入'));
    for(const entry of entries)select.append(el('option',{value:entry.path},entry.label));select.value=suggested?.path||'';
    const input=el('textarea',{className:'value',value:suggested?.value||'',ariaLabel:`本次填写 ${field.label}`});
    const result=el('div',{className:'result'});
    const row={field,check,select,input,result};rows.push(row);
    select.onchange=()=>{const entry=entries.find(e=>e.path===select.value);input.value=entry?.value||'';check.checked=!!entry?.value&&!entry.sensitive&&field.kind!=='custom'&&!field.current;};
    card.append(select,input);
    const actions=el('div',{className:'actions'});
    const locate=el('button',{},'定位');locate.onclick=()=>run(async()=>{if(!await call('locate',[field.id]))throw new Error('字段已变化，请重新扫描');});
    const copy=el('button',{},'复制本次值');copy.onclick=()=>run(async()=>{await navigator.clipboard.writeText(input.value);status('已复制。切换页面后可粘贴。');});actions.append(locate,copy);card.append(actions,result);
    if(field.kind==='custom'){check.disabled=true;card.append(el('p',{className:'warning'},'此控件需手动选择。复制后在页面搜索，并点击正确选项。'));}
    target.append(card);
  }
}
$('remember').onclick=()=>run(async()=>{if(!snapshot)throw new Error('请先扫描');const table={};for(const r of rows)if(r.select.value)table[r.field.key]=r.select.value;mapping[siteKey()]=table;await chrome.storage.local.set({mapping});status('已记住此页面的字段对应关系。重复字段下次仍需核对。');});
$('forget').onclick=()=>run(async()=>{if(!snapshot)throw new Error('请先扫描');delete mapping[siteKey()];await chrome.storage.local.set({mapping});status('已忘记此页面的映射。');});
$('fill').onclick=()=>run(async()=>{
  if(!snapshot)throw new Error('请先扫描');
  const selected=rows.filter(r=>r.check.checked&&r.field.kind!=='custom');
  const sensitive=r=>r.select.value==='personal.idNumber'||/身份证|证件号码|id.?number/i.test(r.field.label);
  if(selected.some(sensitive)&&!$('sensitive').checked)throw new Error('包含证件号码，请先明确允许本次填写。');
  if(!selected.length)throw new Error('请勾选需要填写的字段。');
  const tab=await currentTab();if(tab.id!==tabId||new URL(tab.url).origin!==snapshot.origin)throw new Error('页面已切换，请重新扫描');
  const results=await call('fill',[selected.map(r=>({id:r.field.id,value:r.input.value})),$('overwrite').checked]);
  for(const r of results){const row=rows.find(x=>x.field.id===r.id);if(row)row.result.textContent=r.status;}
  $('sensitive').checked=false;status('本轮填写完成，请检查各行结果及网页。申请尚未提交。');
});
$('undo').onclick=()=>run(async()=>{const r=await call('revert');status(`已还原${r.restored}项，跳过${r.skipped}项（页面变化或已被再次编辑）。`);});
function prepareTask(){if(!snapshot)throw new Error('请先扫描');assistTask=makeTask(snapshot,entries,crypto.randomUUID());$('assist-preview').value=JSON.stringify(assistTask,null,2);return assistTask;}
function applyProposal(data){if(!assistTask)throw new Error('请先生成本轮任务');const suggestions=validateProposal(data,assistTask);for(const m of suggestions){const row=rows.find(r=>r.field.id===m.fieldId);if(!row||row.select.value||row.input.value)continue;row.select.value=m.profilePath;row.input.value=entries.find(e=>e.path===m.profilePath)?.value||'';row.check.checked=false;row.result.textContent='Agent 建议：请核对并手动勾选';}status('建议已加入空白预览行，请核对后勾选。已有匹配保留。');}
$('prepare-assist').onclick=()=>run(async()=>{prepareTask();status('任务已生成。检查下方文字后，可导出给本地 agent 或发送 API。');});
$('export-task').onclick=()=>run(async()=>{if(!assistTask)prepareTask();const url=URL.createObjectURL(new Blob([JSON.stringify(assistTask,null,2)],{type:'application/json'}));el('a',{href:url,download:'apply-once.task.json'}).click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('import-proposal').onchange=()=>run(async()=>{const file=$('import-proposal').files[0];if(!file)return;if(file.size>1_000_000)throw new Error('建议文件过大');applyProposal(JSON.parse(await file.text()));$('import-proposal').value='';});
$('call-api').onclick=()=>run(async()=>{
  if(!assistTask)throw new Error('请先生成并检查任务');
  const endpoint=endpointURL($('api-url').value.trim()),task=assistTask;
  if(!confirm(`将下方任务中的字段标签发送至 ${endpoint.origin}。标签来自网页，可能包含个人信息，请先检查。继续？`))return;
  if(!await chrome.permissions.request({origins:[`${endpoint.origin}/*`]}))throw new Error('未授权此 API 站点');
  const key=$('api-key').value;try{const proposal=await requestProposal({endpoint:endpoint.href,key,model:$('api-model').value.trim(),task});if(task!==assistTask)throw new Error('扫描已变化，请重试');applyProposal(proposal);}finally{$('api-key').value='';}
});
await run(async()=>{await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});const saved=await chrome.storage.local.get(['profile','mapping']);profile=validateProfile(saved.profile||emptyProfile());mapping=saved.mapping||{};entries=flatten(profile);renderProfile();if(!saved.profile)show('profile');});
