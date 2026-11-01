import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {validateProfile,flatten,infer} from '../extension/schema.js';
import {selectRegion} from './region.js';

const engine=await readFile(new URL('../extension/engine.js',import.meta.url),'utf8');
export class BrowserSession {
  constructor(context,controlURL){this.context=context;this.controlURL=controlURL;this.pages=new Map();this.scanState=null;}
  async tabs(){
    const pages=this.context.pages().filter(p=>/^https?:/.test(p.url())&&!p.url().startsWith(this.controlURL));
    for(const [id,p] of this.pages)if(!pages.includes(p))this.pages.delete(id);
    return Promise.all(pages.map(async p=>{let id=[...this.pages].find(([,v])=>v===p)?.[0];if(!id){id=randomUUID();this.pages.set(id,p);}return {id,title:await p.title(),url:p.url()};}));
  }
  async open(url){const u=new URL(url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Error('请输入 HTTP/HTTPS 招聘网页地址');const p=await this.context.newPage();await p.goto(u.href,{waitUntil:'domcontentloaded'});return this.tabs();}
  async scan(id,regionMode){
    const page=this.pages.get(id);if(!page||page.isClosed())throw new Error('请刷新标签页列表并选择招聘页');
    this.scanState=null;
    await page.bringToFront();await page.evaluate(engine);
    const region=regionMode?await page.evaluate(selectRegion):null;
    if(regionMode&&!region)return {cancelled:true};
    const snapshot=await page.evaluate(r=>globalThis.__applyOnce.scan(r),region);
    const requestId=randomUUID();this.scanState={page,url:page.url(),requestId,snapshot};
    return {requestId,snapshot,region};
  }
  async fill({requestId,profile,mappings,overwrite=false,allowSensitive=false}){
    const state=this.scanState;
    if(!state||state.requestId!==requestId||state.page.isClosed()||state.page.url()!==state.url)throw new Error('页面或扫描已变化，请重新扫描');
    const entries=flatten(validateProfile(profile));const ids=new Set();
    if(!Array.isArray(mappings)||mappings.length>state.snapshot.fields.length)throw new Error('填写列表无效');
    const plan=mappings.map(row=>{
      const field=state.snapshot.fields.find(f=>f.id===row.id),entry=entries.find(e=>e.path===row.path);
      if(!field||!entry||ids.has(row.id))throw new Error('字段或资料路径无效');ids.add(row.id);
      if((entry.sensitive||/身份证|证件号码|id.?number/i.test(field.label))&&!allowSensitive)throw new Error('证件号码需要单独允许');
      if(typeof row.value!=='string'||row.value.length>12000)throw new Error('本次填写值无效');
      return {id:row.id,value:row.value};
    });
    return state.page.evaluate(({plan,overwrite})=>{if(!globalThis.__applyOnce)throw new Error('页面已更新，请重新扫描');return globalThis.__applyOnce.fill(plan,overwrite);},{plan,overwrite});
  }
  async undo(){const s=this.scanState;if(!s||s.page.isClosed()||s.page.url()!==s.url)throw new Error('页面已变化，请重新扫描');return s.page.evaluate(()=>globalThis.__applyOnce.revert());}
}
export function suggestions(snapshot,profile){const entries=flatten(validateProfile(profile));return snapshot.fields.map(field=>{const entry=field.ambiguous?null:infer(field,entries);return {id:field.id,path:entry?.path||'',value:entry?.value||'',checked:!!entry?.value&&!entry.sensitive&&!field.current&&!field.ambiguous&&field.kind!=='custom'};});}
