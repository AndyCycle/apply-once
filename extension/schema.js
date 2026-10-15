export const sections = {
  personal: {title:'基本资料', fields:{name:'姓名',phone:'手机号',email:'邮箱',idNumber:'证件号码',birthDate:'出生日期',gender:'性别',nationality:'国家/地区',ethnicity:'民族',nativePlace:'籍贯',location:'所在地',school:'毕业学校',major:'最近毕业专业',degree:'最高学历',graduationDate:'预计毕业日期',englishExam:'英语等级考试',englishScore:'英语成绩'}},
  intent: {title:'求职意向', fields:{city:'期望城市',salary:'期望薪资',availableDate:'到岗日期',internshipDate:'实习开始日期',duration:'实习时长',relocate:'是否服从调剂',channel:'招聘信息渠道'}},
  summary: {title:'自我描述',fields:{text:'自我描述'}},
  education: {title:'教育背景',repeat:true,fields:{school:'学校名称',major:'专业名称',degree:'学历',startDate:'入学日期',endDate:'毕业日期'}},
  experience: {title:'实习/工作经历',repeat:true,fields:{company:'公司名称',title:'职位名称',department:'所在部门',location:'工作地点',startDate:'开始日期',endDate:'结束日期',description:'工作职责'}},
  projects: {title:'项目经验',repeat:true,fields:{name:'项目名称',role:'担任角色',startDate:'开始日期',endDate:'结束日期',description:'项目描述',responsibilities:'项目中职责'}},
  languages: {title:'语言能力',repeat:true,fields:{name:'语言类型',reading:'阅读能力',speaking:'口语能力',writing:'书写能力'}},
  awards: {title:'获奖经历',repeat:true,fields:{name:'奖项名称',date:'获奖日期'}}
};
export function emptyProfile(){return {version:1,personal:{},intent:{},summary:{},education:[],experience:[],projects:[],languages:[],awards:[]};}
export function validateProfile(data){
  if(!data || data.version!==1) throw new Error('资料格式不正确，需要 version: 1');
  const out=emptyProfile();
  for(const [key,s] of Object.entries(sections)){
    const list=s.repeat?data[key]||[]:[data[key]||{}];
    if(!Array.isArray(list)||list.length>30) throw new Error(`${s.title}最多30条`);
    const clean=list.map(record=>{
      if(!record||typeof record!=='object'||Array.isArray(record)) throw new Error(`${s.title}格式错误`);
      const value={};
      for(const field of Object.keys(s.fields)){
        if(record[field]===undefined) continue;
        if(typeof record[field]!=='string'||record[field].length>12000) throw new Error(`${s.fields[field]}必须是12000字以内的文本`);
        value[field]=record[field];
      }
      return value;
    });
    out[key]=s.repeat?clean:clean[0];
  }
  return out;
}
export function flatten(profile){
  const values=[];
  for(const [key,s] of Object.entries(sections)){
    (s.repeat?profile[key]:[profile[key]]).forEach((record,i)=>{
      for(const [field,title] of Object.entries(s.fields)){
        const path=s.repeat?`${key}.${i}.${field}`:`${key}.${field}`;
        const label=`${s.title}${s.repeat?` ${i+1}`:''} · ${title}`;
        values.push({path,label,value:record[field]||'',sensitive:field==='idNumber'});
        if(/Date$/.test(field)||field==='date'){
          const m=(record[field]||'').match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
          for(const [part,index] of [['year',1],['month',2]]) values.push({path:`${path}.${part}`,label:`${label}（${part==='year'?'年':'月'}）`,value:m?String(Number(m[index])):''});
        }
      }
    });
  }
  return values;
}
export const aliases={
  'personal.name':['姓名','中文姓名','真实姓名','name','full name','姓名name'],
  'personal.phone':['手机号码','手机号','联系电话','手机','mobile','phone','phone number'],
  'personal.email':['邮箱','电子邮箱','电子邮件','email','email address'],
  'personal.idNumber':['证件号码','身份证号','身份证号码','id number'],
  'personal.birthDate':['出生日期','出生年月','出生日期年龄','date of birth'],
  'personal.gender':['性别','gender'], 'personal.nationality':['国家地区','国籍','nationality'],
  'personal.ethnicity':['民族'], 'personal.nativePlace':['籍贯'], 'personal.location':['所在地','现居住地','现居地'],
  'personal.school':['毕业学校','最高学历毕业院校'], 'personal.major':['最近毕业专业'],
  'personal.degree':['最高学历'], 'personal.graduationDate':['预估毕业时间','预计毕业时间','预计毕业日期'],
  'personal.englishExam':['英语等级考试'], 'personal.englishScore':['英语等级考试分数级别','英语成绩','六级分数'],
  'intent.city':['意向工作城市','期望城市','期望工作地点','preferred city'], 'intent.salary':['期望薪资','期望薪酬','expected salary'],
  'intent.availableDate':['预估到岗时间','到岗时间','available date'], 'intent.internshipDate':['预估可实习时间','实习开始时间'],
  'intent.duration':['实习时长','可实习时长'], 'intent.relocate':['是否服从调剂'], 'intent.channel':['获取招聘信息的渠道'],
  'summary.text':['自我描述','自我评价','个人介绍','简介','summary'],
  'education.school':['学校名称','毕业院校','学校','school','university'], 'education.major':['专业名称','专业','major'],
  'education.degree':['学历','学位','degree'], 'education.startDate':['入学日期','开始时间','start date'], 'education.endDate':['毕业日期','结束时间','end date'],
  'experience.company':['公司名称','实习单位','单位名称','company','employer'], 'experience.title':['职位名称','职务','岗位名称','job title'],
  'experience.department':['所在部门','部门','department'], 'experience.location':['工作地点','location'],
  'experience.description':['工作职责','工作内容','实习内容','responsibilities'], 'experience.startDate':['开始时间','开始日期','start date'], 'experience.endDate':['结束时间','结束日期','end date'],
  'projects.name':['项目名称','project name'], 'projects.role':['职责','担任角色','项目角色','role'],
  'projects.description':['项目描述','项目介绍','description'], 'projects.responsibilities':['项目中职责','个人职责','我的职责'],
  'projects.startDate':['开始时间','开始日期','start date'], 'projects.endDate':['结束时间','结束日期','end date'],
  'languages.name':['语言类型','语种','language'], 'languages.reading':['阅读能力'], 'languages.speaking':['口语能力'], 'languages.writing':['书写能力'],
  'awards.name':['奖项名称','奖项','award name'], 'awards.date':['获奖时间','获奖日期']
};
export function normalize(value){return String(value||'').toLowerCase().replace(/[\s*：:（）()\/\-_]/g,'').replace(/^请输入|^请选择|^选择/,'');}
export function infer(field,entries){
  const label=normalize(field.label);
  if(!label||['年','月','内容','请选择'].includes(label)) return null;
  const matches=[];
  for(const [key,names] of Object.entries(aliases)){
    if(!names.some(n=>normalize(n)===label))continue;
    const [section,prop]=key.split('.');
    if(sections[section].repeat){
      if(field.section!==section)continue;
      const e=entries.find(x=>x.path===`${section}.${field.recordIndex||0}.${prop}`);
      if(e)matches.push(e);
    }else{
      if(field.section && sections[field.section]?.repeat)continue;
      const e=entries.find(x=>x.path===key); if(e)matches.push(e);
    }
  }
  return matches.length===1?matches[0]:null;
}
