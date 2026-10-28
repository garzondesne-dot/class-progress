import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import worker,{normalize,schoolInfo} from './comci-worker.mjs';
const raw={교사수:36,자료446:Array.from({length:37},(_,i)=>i===4?'김찬*':i?'교사'+i:''),학급수:[0,5,0,0],자료492:[0,'국어','독서','경수','수학'],분리:1000,변경알림:1,시작일:'2026-10-26',열람제한일:'1899-12-30',자료244:'2026-10-27 11:53:45',자료481:[],자료542:[],일과시간:['1(09:00)','2(10:00)','3(11:00)','4(12:00)','5(14:00)','6(15:00)','7(16:10)','8(17:00)'],__school:'74865',학교명:'예시 학교'};
raw.자료542[4]=[0,[0,4105,0,4103,4104,0,0,0,0],[0,'>4102','>0','>4105',0,'>4101',4101,0,0],[0],[0],[0]];
raw.자료542[1]=[0,[0],[0],[0],[0],[0]];
const school=schoolInfo(raw,'74865'),snapshot={ok:true,...normalize(raw,4)},otherSnapshot={ok:true,...normalize(raw,1)};
assert.equal(school.teachers.length,36);assert.equal(school.teachers[3].label,'김찬*');
assert.equal(snapshot.dates['2026-10-27'][2].classKey,null);assert.equal(snapshot.dates['2026-10-27'][2].changed,true);
assert.equal(snapshot.dates['2026-10-27'][1].classKey,'1-2');
assert.equal(Object.keys(normalize({...raw,열람제한일:'2026-10-28'},4).dates).length,2);
assert.throws(()=>normalize(raw,99),/교사/);
assert.equal((await worker.fetch(new Request('https://example.test/api/school?school=bad'))).status,400);
assert.equal((await worker.fetch(new Request('https://example.test/health',{headers:{Origin:'https://evil.example'}}))).status,403);
const html=fs.readFileSync('index.html','utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
scripts.forEach(s=>new vm.Script(s));
const core=scripts.find(s=>s.includes('const STORAGE_KEY')),identity=scripts.find(s=>s.includes('const IDENTITY_VERSION'));
assert.ok(identity);assert.ok(html.includes('screen-identitySetup'));assert.ok(!html.includes('id="screen-onboarding"'));
const nodes=new Map(),store=new Map(),callbacks=[],notices=[];
class Classes{constructor(){this.classes=new Set(['hidden']);}add(c){this.classes.add(c)}remove(c){this.classes.delete(c)}contains(c){return this.classes.has(c)}toggle(c,b){if(b===undefined)b=!this.contains(c);b?this.add(c):this.remove(c);}}
const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',disabled:false,checked:false,setAttribute(){},click(){},focus(){},classList:new Classes(),options:[],replaceChildren(...v){this.options=v;this.value=v[0]?.value||''},add(v){this.options.push(v)}});return nodes.get(id)};
const Clock=class extends Date{constructor(...a){super(...(a.length?a:['2026-10-27T10:50:00+09:00']))}};
const context=vm.createContext({navigator:{onLine:true},location:{protocol:"file:"},Date:Clock,URL,AbortSignal,console,Option:class{constructor(text,value){this.text=text;this.value=value}},document:{hidden:false,addEventListener(){},getElementById:node},window:{lucide:{createIcons(){}},addEventListener:(event,fn)=>{if(event==='DOMContentLoaded')callbacks.push(fn)},scrollTo(){}},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},lucide:{createIcons(){}},setInterval(){},setTimeout(){},clearTimeout(){},alert(){},fetch:async u=>({ok:true,json:async()=>new URL(u).pathname==='/api/school'?school:snapshot})});
vm.runInContext(core,context);vm.runInContext(identity,context);
const run=s=>vm.runInContext(s,context),json=s=>JSON.parse(run('JSON.stringify('+s+')'));
context.school=school;context.snapshot=snapshot;context.otherSnapshot=otherSnapshot;
run("ensureClassProgressStructure();appState.isConfigured=true;appState.progress['1-1'].sessions[1]={step:'dist',date:'2026-10-20 09:50',memoDist:'기존 메모',memoSolve:'문항 3',memoCheck:'검사 메모'};appState.sessionTopics[1]='집합';appState.alarmTimes=['09:45','10:50','11:50','12:50','14:50','16:00','17:00'];saveState()");
const legacy=store.get('smart_lesson_checklist_v3_state'),legacyProgress=json('appState.progress');
callbacks[0]();assert.equal(run('needsIdentitySetup()'),true);assert.equal(node('screen-identitySetup').classList.contains('hidden'),false);assert.equal(node('screen-main').classList.contains('hidden'),true);
assert.equal(store.get('smart_lesson_checklist_v3_state'),legacy,'Opening the required selector must not rewrite old storage');
node('identitySchoolCode').value='74865';await run('lookupIdentitySchool()');
assert.equal(node('identityTeacher').options.length,37);
node('identityTeacher').value='4';run('selectIdentityTeacher()');assert.equal(node('identityContinue').disabled,false);
await run('confirmIdentitySelection()');
assert.equal(run('needsIdentitySetup()'),false);
assert.deepEqual(json('appState.progress'),legacyProgress);
assert.equal(run("appState.sessionTopics[1]"),'집합');
assert.equal(run('appState.alarmTimes[0]'),'09:45');
assert.equal(store.get('smart_lesson_checklist_v3_state_before_identity_v1'),legacy);
assert.equal(run("getTimetableClass('2026-10-27',1)"),'1-2');
assert.equal(run("getTimetableClass('2026-10-27',2)"),'');
assert.equal(run("getTimetableClass('2026-11-03',2)"),'','An unpublished week must never repeat a stale base week');
run("appState.progress['1-1'].sessions[1].memoDist='추가 메모';saveState()");
run('appState=buildIdentityState(appState,school,school.teachers[0],otherSnapshot)');
assert.deepEqual(json('appState.progress'),{});assert.deepEqual(json('appState.sessionTopics'),{});
run('appState=buildIdentityState(appState,school,school.teachers[3],snapshot)');
assert.equal(run("appState.progress['1-1'].sessions[1].memoDist"),'추가 메모');
assert.equal(run('appState.alarmTimes[0]'),'09:45');
assert.equal(run("appState.sessionTopics[1]"),'집합');
run('saveState();loadState()');assert.equal(run('needsIdentitySetup()'),false);
assert.equal(run("appState.progress['1-1'].sessions[1].memoCheck"),'검사 메모');
// A temporarily disabled poller keeps the last imported timetable visible.
node('comciAuto').checked=false;run('toggleComciAuto()');assert.equal(run("getTimetableClass('2026-10-27',1)"),'1-2');
// A wrong teacher label is never silently accepted after staff numbers change.
assert.throws(()=>run("validateComciSnapshot(snapshot,{schoolCode:'74865',teacherId:4,teacherLabel:'다른 교사'},'2026-10-26')"),/교사 목록/);
// Saved memos must survive storage failure during reselection.
run('openIdentitySetup()');node('identitySchoolCode').value='74865';await run('lookupIdentitySchool()');node('identityTeacher').value='1';
context.fetch=async()=>({ok:true,json:async()=>otherSnapshot});
const before=json('appState');const savedSet=context.localStorage.setItem;context.localStorage.setItem=()=>{throw Error('저장 공간 부족')};
await run('confirmIdentitySelection()');assert.deepEqual(json('appState'),before);context.localStorage.setItem=savedSet;
// Network failure must not reassign the teacher or clear the current snapshot.
context.fetch=async()=>{throw Error('통신 끊김')};await run('confirmIdentitySelection()');assert.deepEqual(json('appState'),before);
// A refresh that finishes after changing the identity must be discarded.
let finish;context.fetch=()=>new Promise(resolve=>{finish=()=>resolve({ok:true,json:async()=>snapshot})});
run('appState.comci.enabled=true');const pending=run('refreshComci(true)');run('openIdentitySetup()');finish();await pending;
assert.equal(run("appState.progress['1-1'].sessions[1].memoDist"),'추가 메모');
console.log('PASS: 36-teacher schema, cancellation, viewing cutoff, mandatory legacy reselection, no write on entry, automatic placement, exact memo/topic/time preservation, backup, isolated profiles, returning profile, persistence, disabled polling, teacher mismatch, storage/network failure, stale refresh');

// Manual mode and full backup/reset regression coverage.
run("appState=buildOfflineState(appState,{name:'김찬우',subject:'수학',school:'학교',classes:'1-1,1-2'})");
run("appState.timetable={'화-1':'1-1','화-2':''};appState.progress['1-1'].sessions[1].memoDist='오프라인 메모'");
assert.equal(run("getTimetableClass('2026-10-27',1)"),'1-1');
assert.equal(run("getTimetableClass('2026-10-27',2)"),'');
assert.equal(run('appState.comci.enabled'),false);
run('const savedBackup=JSON.stringify(makeBackup());const restored=parseBackup(savedBackup)');
assert.equal(run("restored.progress['1-1'].sessions[1].memoDist"),'오프라인 메모');
assert.ok(run('Object.keys(restored.teacherProfiles).length')>=2);
assert.throws(()=>run("parseBackup('{\"__proto__\":{}}')"),/안전/);
assert.throws(()=>run("parseBackup('{\"format\":\"class-progress-backup\",\"schemaVersion\":2}')"),/지원/);
run("appState=buildIdentityState(appState,school,school.teachers[3],snapshot)");
assert.equal(run("appState.progress['1-1'].sessions[1].memoDist"),'추가 메모');
run("appState=buildOfflineState(appState,{name:'김찬우',subject:'수학',school:'학교',classes:'1-1,1-2'})");
assert.equal(run("appState.progress['1-1'].sessions[1].memoDist"),'오프라인 메모');
const originalSet=context.localStorage.setItem;
context.localStorage.setItem=()=>{throw Error('저장 실패')};
const currentBefore=json('appState');run("pendingRestore=restored;applyBackupRestore()");
assert.deepEqual(json('appState'),currentBefore);
context.localStorage.setItem=originalSet;context.localStorage.removeItem=k=>store.delete(k);
run("requestFullReset();performFullReset()");assert.equal(run('appState.isConfigured'),true);
node('resetTyped').value='초기화';run('performFullReset()');
assert.equal(run('needsIdentitySetup()'),true);assert.deepEqual(json('appState.progress'),{});
console.log('PASS: offline timetable, empty periods, profile return, full backup round trip, malicious/unsupported backup rejection, failed restore preservation, typed reset and setup return');
const cancelled=[],scheduled=[];
context.window.Capacitor={isNativePlatform:()=>true,Plugins:{LocalNotifications:{checkPermissions:async()=>({display:'granted'}),checkExactNotificationSetting:async()=>({exact_alarm:'granted'}),getPending:async()=>({notifications:[{id:100001},{id:990001}]}),cancel:async n=>cancelled.push(...n.notifications),schedule:async n=>scheduled.push(...n.notifications)}}};
run("appState=buildOfflineState(appState,{name:'테스트',subject:'수학',school:'',classes:'1-1'});appState.timetable={'화-7':'1-1'}");
await run('window.scheduleNativeClassAlarms(false)');
assert.deepEqual(JSON.parse(JSON.stringify(cancelled)),[{id:100001}]);assert.ok(scheduled.length>0);assert.ok(scheduled.every(n=>n.body.includes('1-1 7교시')));
cancelled.length=0;scheduled.length=0;run('appState=newBlankState()');await run('window.scheduleNativeClassAlarms(false)');assert.equal(scheduled.length,0);assert.equal(cancelled.length,1);
console.log('PASS: native alarm reschedule, reserved ID isolation, offline timetable alarms, reset cancels old alarms');



run("appState=buildOfflineState(appState,{name:'교사',subject:'수학',school:'',classes:'1-1'}); appState.sessionTopics={}");
run("advanceClassStep('1-1','dist')");
assert.equal(run("appState.progress['1-1'].currentStep"),'none');
run("saveTopicAndStart()");assert.equal(run("appState.progress['1-1'].currentStep"),'none');
run("cancelTopicStart()");assert.equal(run("appState.progress['1-1'].currentStep"),'none');
run("advanceClassStep('1-1','dist')");node('topicInput').value='  집합  ';run("saveTopicAndStart()");
assert.equal(run("appState.sessionTopics[1]"),'집합');assert.equal(run("appState.progress['1-1'].currentStep"),'dist');
run("appState.progress['1-1'].currentStep='none';advanceClassStep('1-1','dist')");assert.equal(run("appState.progress['1-1'].currentStep"),'dist');
console.log('PASS: topic required, empty and cancel preserve progress, save starts and existing topic starts immediately');
// Starting from the timetable must not record a lesson until the topic is saved.
run("appState=buildOfflineState(newBlankState(),{name:'교사',subject:'수학',school:'',classes:'1-1'});appState.sessionTopics={}");
const beforeTopic=JSON.stringify(json('appState.progress'));
run("advanceLesson('1-1',1)");
assert.equal(JSON.stringify(json('appState.progress')),beforeTopic);
run('cancelTopicStart()');assert.equal(JSON.stringify(json('appState.progress')),beforeTopic);
run("advanceLesson('1-1',1)");node('topicInput').value='함수';run('saveTopicAndStart()');
assert.equal(run("appState.progress['1-1'].currentStep"),'dist');
assert.equal(run("appState.progress['1-1'].sessions[1].actions.length"),1);
assert.equal(run("appState.progress['1-1'].sessions[1].actions[0].period"),1);
console.log('PASS: timetable start waits for topic; cancel does not mutate; save records one action');
