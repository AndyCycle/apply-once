import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import * as schema from '../extension/schema.js';
import * as assist from '../extension/assist.js';
const html=readFileSync(new URL('../extension/panel.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../extension/panel.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');
async function panel(){
  const dom=new JSDOM(html,{url:'https://extension.example.test',runScripts:'outside-only'}),w=dom.window;
  Object.assign(w,schema,assist);const store={},calls=[];
  w.chrome={storage:{local:{setAccessLevel:async()=>{},get:async()=>store,set:async x=>Object.assign(store,x)}},tabs:{query:async()=>[{id:10,url:'https://jobs.example.test/apply'}]},scripting:{executeScript:async config=>{calls.push(config);if(config.files)return [];if(config.args[0]==='scan')return [{result:{origin:'https://jobs.example.test',route:'/apply',title:'Demo',platform:'通用',iframeCount:0,fields:[{id:'f1',key:'name',label:'姓名',kind:'text',current:'',options:[]},{id:'f2',key:'identity',label:'证件号码',kind:'text',current:'',options:[]},{id:'f3',key:'custom',label:'期望城市',kind:'custom',current:'',options:[]}]}}];return [{result:config.args[1][0].map(x=>({id:x.id,status:'已填入并核对'}))}];}}};
  await w.eval(`(async()=>{${source}\n})()`);return {w,doc:w.document,store,calls};
}
test('profile editor persists input and repeat records',async()=>{const {doc,store}=await panel();doc.querySelector('[data-key=personal][data-field=name]').value='Demo';await doc.querySelector('#save').onclick();assert.equal(store.profile.personal.name,'Demo');assert.ok(doc.querySelector('#profile-view').hidden===false);});
test('preview checks plain fields, keeps sensitive and custom fields unchecked, and fills selected values only',async()=>{const {doc,store,calls}=await panel();store.profile=schema.emptyProfile();store.profile.personal={name:'Demo',idNumber:'fictional-only'};store.profile.intent.city='Test City';await doc.querySelector('#scan').onclick();const cards=doc.querySelectorAll('.field');assert.equal(cards.length,3);assert.equal(cards[0].querySelector('textarea').value,'Demo');assert.ok(cards[0].querySelector('input').checked);assert.equal(cards[1].querySelector('input').checked,false);assert.equal(cards[2].querySelector('input').disabled,true);await doc.querySelector('#fill').onclick();const fill=calls.find(c=>c.args?.[0]==='fill');assert.equal(fill.args[1][0].length,1);assert.equal(fill.args[1][0][0].value,'Demo');});
test('remembered mappings contain keys only, no personal values',async()=>{const {doc,store}=await panel();store.profile=schema.emptyProfile();store.profile.personal.name='Private Demo';await doc.querySelector('#scan').onclick();await doc.querySelector('#remember').onclick();assert.equal(store.mapping['https://jobs.example.test/apply'].name,'personal.name');assert.ok(!JSON.stringify(store.mapping).includes('Private Demo'));});
test('agent import populates preview only, keeps suggestions unchecked, rejects stale scan',async()=>{
  const {doc,store,calls}=await panel();store.profile=schema.emptyProfile();store.profile.personal.name='Local Person';store.profile.summary.text='Local summary';
  await doc.querySelector('#scan').onclick();await doc.querySelector('#prepare-assist').onclick();
  const task=JSON.parse(doc.querySelector('#assist-preview').value);assert.ok(!JSON.stringify(task).includes('Local Person'));
  const input=doc.querySelector('#import-proposal');
  doc.querySelectorAll('.field')[1].querySelector('select').value='';
  Object.defineProperty(input,'files',{configurable:true,value:[{size:100,text:async()=>JSON.stringify({version:1,requestId:task.requestId,mappings:[{fieldId:'f1',profilePath:'summary.text'},{fieldId:'f2',profilePath:'summary.text'}]})}]});
  await input.onchange();const cards=doc.querySelectorAll('.field');assert.equal(cards[0].querySelector('textarea').value,'Local Person');assert.equal(cards[1].querySelector('textarea').value,'Local summary');assert.equal(cards[1].querySelector('input').checked,false);assert.equal(calls.filter(c=>c.args?.[0]==='fill').length,0);
  await doc.querySelector('#scan').onclick();await input.onchange();assert.match(doc.querySelector('#status').textContent,/先生成本轮任务/);
});
