// Runs only after a user gesture. Never reads extension storage or submits a form.
(() => {
  if(globalThis.__applyOnce) return;
  let fields=new Map(), serial=0, undo=[];
  const sectionWords={education:/教育背景|教育经历|education/i,experience:/实习经历|工作经历|work experience|employment/i,projects:/项目经验|项目经历|projects/i,languages:/语言能力|语言技能|languages/i,awards:/获奖经历|获奖情况|awards/i};
  const excluded=new Set(['hidden','password','file','checkbox','radio','submit','button','reset','image','range','color']);
  const supported='input,textarea,select,[contenteditable="true"],[role="combobox"]';
  function visible(e){return !e.disabled && !e.closest('[hidden],[inert],[aria-hidden="true"]') && getComputedStyle(e).display!=='none' && getComputedStyle(e).visibility!=='hidden' && e.getClientRects().length>0;}
  function roots(){const result=[document];for(let i=0;i<result.length;i++)for(const e of result[i].querySelectorAll('*'))if(e.shadowRoot)result.push(e.shadowRoot);return result;}
  function text(e){return (e?.innerText||e?.textContent||'').trim().replace(/\s+/g,' ').slice(0,160);}
  function label(e){
    const root=e.getRootNode();
    const labelled=e.getAttribute('aria-labelledby');
    if(labelled){const t=labelled.split(/\s+/).map(id=>text(root.querySelector(`#${CSS.escape(id)}`))).join(' ').trim();if(t)return t;}
    if(e.getAttribute('aria-label'))return e.getAttribute('aria-label');
    if(e.labels?.length){const l=e.labels[0].cloneNode(true);l.querySelectorAll('input,select,textarea,button').forEach(n=>n.remove());if(text(l))return text(l);}
    // Moka/sugar and common form component wrappers: read the field label, not options.
    const group=e.closest('[class*="form-item"],[class*="FormItem"],[class*="field-item"],[class*="fieldItem"],.ant-form-item,.el-form-item,.form-group');
    if(group){const l=group.querySelector('label,[class*="label"],[class*="Label"]');if(l&&!l.contains(e)&&text(l))return text(l);}
    let p=e.parentElement;
    for(let i=0;i<4&&p;i++,p=p.parentElement){
      const siblings=[...p.children];
      const candidate=siblings.find(n=>!n.contains(e)&&!n.matches(supported)&&n.querySelectorAll(supported).length===0&&text(n).length>1&&text(n).length<35);
      if(candidate && !/^[\d\W]+$/.test(text(candidate)))return text(candidate);
    }
    return e.placeholder||e.name||e.id||'未命名字段';
  }
  function context(e){
    let record=e.closest('[data-apply-record],fieldset,[class*="experience-item"],[class*="education-item"],[class*="repeat-item"]');
    let section='';
    const explicit=e.closest('[data-apply-section]');
    if(explicit)section=explicit.dataset.applySection;
    if(!section){
      for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){
        const h=p.querySelector('legend,h2,h3,h4,[class*="section-title"],[class*="module-title"]');
        if(h){section=Object.keys(sectionWords).find(k=>sectionWords[k].test(text(h)))||'';if(section)break;}
      }
    }
    let recordIndex=0;
    if(record){
      if(record.hasAttribute('data-apply-record'))recordIndex=Number(record.dataset.applyRecord)||0;
      else if(record.parentElement)recordIndex=[...record.parentElement.children].filter(n=>n.tagName===record.tagName&&n.className===record.className).indexOf(record);
    }
    return {section,recordIndex:Math.max(0,recordIndex)};
  }
  function kind(e){
    if(e.matches('select'))return 'select';
    if(e.readOnly||e.getAttribute('role')==='combobox'||e.getAttribute('aria-autocomplete')||e.closest('[class*="Select-container"],.ant-select,.el-select,[class*="DatePicker"],[class*="Cascader"]'))return 'custom';
    if(e.isContentEditable||e.getAttribute('contenteditable')==='true')return 'richtext';
    return e.type==='date'?'date':e.type==='month'?'month':'text';
  }
  function value(e){return e.isContentEditable||e.getAttribute('contenteditable')==='true'?e.textContent:e.value;}
  function fingerprint(e,l,c){return [c.section,c.recordIndex,l,e.tagName,e.type||'',e.name||'',e.getAttribute('autocomplete')||''].join('|');}
  function scan(){
    fields=new Map();const result=[], seen=new Set(), occurrences=new Map();
    for(const root of roots())for(const e of root.querySelectorAll(supported)){
      if(!visible(e)||excluded.has(e.type)||e.closest('[data-apply-once-ui]')||seen.has(e))continue;
      if(e.getAttribute('role')==='combobox'&&e.querySelector('input'))continue;
      if(e.closest('[contenteditable="true"]')!==e&&e.closest('[contenteditable="true"]'))continue;
      seen.add(e);const l=label(e), c=context(e), base=fingerprint(e,l,c);
      const occurrence=occurrences.get(base)||0;occurrences.set(base,occurrence+1);
      const key=`${base}|${occurrence}`, id=`f${++serial}`;
      const item={id,key,label:l,...c,kind:kind(e),current:value(e)||'',required:!!e.required||e.getAttribute('aria-required')==='true',ambiguous:occurrence>0,options:e.matches('select')?[...e.options].map(o=>({text:o.textContent,value:o.value,disabled:o.disabled})):[]};
      fields.set(id,{e,item});result.push(item);
    }
    // Repeated indistinguishable labels require manual confirmation, including the first.
    for(const item of result)if((occurrences.get(item.key.replace(/\|\d+$/,''))||0)>1)item.ambiguous=true;
    return {fields:result,origin:location.origin,route:location.pathname+location.hash.split('?')[0],title:document.title,platform:/mokahr\.com$/.test(location.hostname)?'Moka（自定义选项需手选）':/zhiye\.com$/.test(location.hostname)?'北森（通用识别）':/dayee\.com$/.test(location.hostname)?'大易（通用识别）':'通用表单',iframeCount:document.querySelectorAll('iframe').length};
  }
  function set(e,v){
    if(e.isContentEditable||e.getAttribute('contenteditable')==='true')e.textContent=v;
    else {const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,v);}
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.dispatchEvent(new Event('blur',{bubbles:true}));
  }
  const pause=()=>new Promise(r=>setTimeout(r,100));
  async function fill(plan,overwrite){
    undo=[];const results=[];
    for(const row of plan){
      const found=fields.get(row.id);if(!found){results.push({id:row.id,status:'字段已变化，请重新扫描'});continue;}
      const {e,item}=found;
      if(!e.isConnected||!visible(e)||excluded.has(e.type)||kind(e)==='custom'){results.push({id:row.id,status:'需要手动选择'});continue;}
      if(fingerprint(e,label(e),context(e))!==item.key.replace(/\|\d+$/,'')){results.push({id:row.id,status:'字段身份变化，请重新扫描'});continue;}
      const before=value(e)||'';
      if(before && !overwrite){results.push({id:row.id,status:'保留已有值'});continue;}
      let v=String(row.value||'');if(!v.trim()){results.push({id:row.id,status:'资料为空，跳过'});continue;}
      if(item.kind==='select'){
        const norm=s=>s.trim().toLowerCase();
        const matches=[...e.options].filter(o=>!o.disabled&&(norm(o.value)===norm(v)||norm(o.textContent)===norm(v)));
        if(matches.length!==1){results.push({id:row.id,status:'选项未唯一匹配，请手选'});continue;}v=matches[0].value;
      }
      if(item.kind==='month')v=v.slice(0,7);
      if((item.kind==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(v))||(item.kind==='month'&&!/^\d{4}-\d{2}$/.test(v))){results.push({id:row.id,status:'日期格式需核对'});continue;}
      if(e.maxLength>0 && v.length>e.maxLength){results.push({id:row.id,status:`超出${e.maxLength}字限制，未填入`});continue;}
      try{set(e,v);await pause();const ok=e.isConnected&&value(e)===v;
        if(e.isConnected&&value(e)===v)undo.push({e,before,after:v});
        results.push({id:row.id,status:ok?(e.validity&&!e.validity.valid?'已填入，但不符合页面校验':'已填入并核对'):'页面未保留值，请手动核对'});
      }catch{results.push({id:row.id,status:'填写失败，请手动核对'});}
    }
    return results;
  }
  async function revert(){let restored=0,skipped=0;for(const x of undo){if(x.e.isConnected&&value(x.e)===x.after){set(x.e,x.before);await pause();if(value(x.e)===x.before)restored++;else skipped++;}else skipped++;}undo=[];return {restored,skipped};}
  function locate(id){const item=fields.get(id);if(!item?.e.isConnected)return false;const e=item.e;e.scrollIntoView({block:'center',behavior:'smooth'});const old=e.style.outline;e.style.outline='3px solid #0d9488';setTimeout(()=>e.style.outline=old,1600);e.focus({preventScroll:true});return true;}
  globalThis.__applyOnce={scan,fill,revert,locate};
})();
