// Unofficial read-only adapter for the public Comci teacher timetable.
const COMCI = 'http://comci.net:4082';
const ORIGINS = new Set(['https://garzondesne-dot.github.io','https://localhost','http://localhost','capacitor://localhost']);
let protocolCache;
const dataCache = new Map();
function json(body, status=200, origin='') {
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(ORIGINS.has(origin))headers['Access-Control-Allow-Origin']=origin;
 return new Response(JSON.stringify(body),{status,headers});
}
async function upstream(path) {
 const r=await fetch(COMCI+path,{headers:{Referer:COMCI+'/th','User-Agent':'Mozilla/5.0','X-Requested-With':'XMLHttpRequest'},signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('컴시간 서버 응답 오류 ('+r.status+')');
 const bytes=await r.arrayBuffer();
 if(bytes.byteLength>3000000)throw Error('컴시간 응답 크기 오류');
 let text=new TextDecoder().decode(bytes);
 if(text.includes('�'))text=new TextDecoder('euc-kr').decode(bytes);
 return text;
}
async function protocol() {
 if(protocolCache && Date.now()-protocolCache.at<3600000)return protocolCache;
 const s=await upstream('/th');
 const endpoint=s.match(/var sc3=['"]\.\/([a-zA-Z0-9_]+)\?/);
 const prefix=s.match(/sc_data\(['"](\d+_)['"]/);
 if(!endpoint||!prefix)throw Error('컴시간 연결 형식이 바뀌었습니다. 업데이트가 필요합니다.');
 protocolCache={endpoint:endpoint[1],prefix:prefix[1],at:Date.now()};return protocolCache;
}
async function load(school,index) {
 const key=school+':'+index,cached=dataCache.get(key);
 if(cached && Date.now()-cached.at<60000)return cached.data;
 const p=await protocol();
 const text=await upstream('/'+p.endpoint+'?'+btoa(p.prefix+school+'_0_'+index));
 let d;try{d=JSON.parse(text.slice(0,text.lastIndexOf('}')+1));}catch{throw Error('컴시간 시간표를 해석할 수 없습니다.');}
 if(!d.자료542||!d.자료446||!d.시작일)throw Error('학교 코드 또는 시간표 공개 상태를 확인하세요.');
 if(dataCache.size>100)dataCache.clear();
 dataCache.set(key,{data:d,at:Date.now()});return d;
}
function addDate(start,n){const d=new Date(start+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function weekStart(s){const m=String(s).match(/^(\d{2,4})-(\d{2})-(\d{2})/);return m?(m[1].length===2?'20'+m[1]:m[1])+'-'+m[2]+'-'+m[3]:null;}
function decode(raw,unit=1000){
 const n=Number(String(raw??0).replace(/^>/,''));if(!Number.isFinite(n)||n<0)throw Error('수업 코드가 올바르지 않습니다.');
 return unit===100?{group:Math.floor(n/100),subject:n%100}:{group:n%unit,subject:Math.floor(n/unit)};
}
export function normalize(d,teacherId){
 if(!d.자료542?.[teacherId]||!d.자료446?.[teacherId])throw Error('해당 교사가 없습니다. 교사 번호를 확인하세요.');
 const monday=weekStart(d.시작일);if(!monday)throw Error('시간표 날짜를 확인할 수 없습니다.');
 const unit=Number(d.분리)||100,base={};
 for(let g=1;g<=3;g++)for(let c=1;c<=(Number(d.학급수?.[g])||0);c++)for(let day=1;day<=5;day++)for(let p=1;p<=8;p++){
  const v=decode(d.자료481?.[g]?.[c]?.[day]?.[p],unit);
  if(v.group===teacherId)base[day+'-'+p]={classKey:g+'-'+c,subjectId:v.subject};
 }
 const starts=Array.from({length:8},(_,i)=>String(d.일과시간?.[i]||'').match(/([0-2]\d:[0-5]\d)/)?.[1]||null);
 const limit=weekStart(d.열람제한일);
 const dates={};
 for(let day=1;day<=5;day++){
  const date=addDate(monday,day-1);
  // Never reveal dates hidden by the source site's viewing cutoff.
  if(limit && limit>='2014-01-01' && date>=limit)continue;
  if(!Array.isArray(d.자료542[teacherId][day]))throw Error('요일 시간표가 빠져 있습니다.');
  const slots={};
  for(let p=1;p<=8;p++){
   const raw=d.자료542[teacherId][day][p]??0,v=decode(raw,1000);
   const grade=Math.floor(v.group/100),cls=v.group%100,subjectId=v.subject%unit;
   const lesson=v.subject>0&&grade>0&&cls>0?{classKey:grade+'-'+cls,subject:String(d.자료492?.[subjectId]||''),start:starts[p-1]}:null;
   const b=base[day+'-'+p];
   const changed=Number(d.변경알림)===1?String(raw).startsWith('>'):((lesson?.classKey||'')!==(b?.classKey||'')||subjectId!==(b?.subjectId||0));
   slots[p]={...(lesson||{}),classKey:lesson?.classKey||null,changed};
  }
  dates[date]=slots;
 }
 return {schemaVersion:1,source:'comci-teacher',schoolCode:String(d.__school),schoolName:String(d.학교명||''),teacherId,teacherLabel:String(d.자료446[teacherId]),weekStart:monday,sourceUpdatedAt:String(d.자료244||''),fetchedAt:new Date().toISOString(),starts,dates};
}
export function schoolInfo(d,school){
 if(!Number.isInteger(Number(d.교사수))||Number(d.교사수)<1||Number(d.교사수)>500)throw Error('교사 목록을 확인할 수 없습니다.');
 const teachers=[];
 for(let id=1;id<=Number(d.교사수);id++){
  const label=d.자료446?.[id];
  if(typeof label==='string'&&label.trim())teachers.push({id,label:label.trim()});
 }
 if(!teachers.length)throw Error('공개된 교사 목록이 없습니다.');
 return {ok:true,schemaVersion:1,source:'comci-teacher',schoolCode:String(school),schoolName:String(d.학교명||''),schoolYear:String(d.학년도||''),termStart:String(d.학기시작일자||''),teachers,fetchedAt:new Date().toISOString()};
}
export default {async fetch(request){
 const origin=request.headers.get('Origin')||'';
 if(origin&&!ORIGINS.has(origin))return json({ok:false,error:'허용되지 않은 앱 주소입니다.'},403,origin);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Max-Age':'3600','Vary':'Origin'}});
 if(request.method!=='GET')return json({ok:false,error:'GET 요청만 지원합니다.'},405,origin);
 const u=new URL(request.url);
 if(u.pathname==='/'||u.pathname==='/health')return json({ok:true,service:'class-progress-comci',version:1},200,origin);
 if(u.pathname==='/api/school'){
  const school=u.searchParams.get('school');
  if(!/^\d{4,7}$/.test(school||''))return json({ok:false,error:'학교 코드를 숫자로 입력하세요.'},400,origin);
  try{return json(schoolInfo(await load(school,1),school),200,origin);}
  catch(e){return json({ok:false,error:e.message},502,origin);}
 }
 if(u.pathname!=='/api/timetable')return json({ok:false,error:'Not found'},404,origin);
 const school=u.searchParams.get('school'),teacherId=Number(u.searchParams.get('teacher')),week=u.searchParams.get('week');
 if(!/^\d{4,7}$/.test(school||'')||!Number.isInteger(teacherId)||teacherId<1||teacherId>500||!/^\d{4}-\d{2}-\d{2}$/.test(week||''))return json({ok:false,error:'학교 코드·교사 번호·주간 날짜를 확인하세요.'},400,origin);
 try{
  let d=await load(school,1);
  const entry=d.일자자료?.find(v=>weekStart(v[1])===week);
  if(!entry)return json({ok:false,error:'컴시간에 공개된 주간 시간표가 없습니다.'},404,origin);
  if(Number(entry[0])!==1)d=await load(school,entry[0]);
  if(weekStart(d.시작일)!==week)throw Error('요청한 주와 수신한 시간표 날짜가 다릅니다.');
  const result=normalize({...d,__school:school},teacherId);
  return json({ok:true,...result},200,origin);
 }catch(e){console.warn('Comci request failed:',e.message);return json({ok:false,error:e.message},502,origin);}
}};

