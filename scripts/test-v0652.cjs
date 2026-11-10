// Run with: node scripts/test-v0652.cjs (no dependencies).
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
function section(file,from,to){const s=read(file);return s.slice(s.indexOf(from),s.indexOf(to,s.indexOf(from)))}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
const c=vm.createContext({console,Date,setTimeout,clearTimeout});
vm.runInContext(`
 const elements={date:{value:'2026-11-10'},autosave:{},hs51CelebrationClose:{}};
 const $=id=>elements[id]||null;
 let st={settings:{proteinTarget:100},entries:{}};
 const today=()=>'2026-11-10';
 const dateObj=s=>new Date(s+'T00:00:00');
 const localDateString=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const fmtShort=s=>s.slice(5);
 const lastNDates=(n,end=today())=>Array.from({length:n},(_,i)=>{const d=dateObj(end);d.setDate(d.getDate()-n+1+i);return localDateString(d)});
 const entryHasData=e=>!!e;
 const scoreForDay=e=>e.finalScore||0;
 const effectiveCalories=e=>e.caloriesActual??null;
 const ALL_KEYS=[],LABELS={};
 const ent=d=>st.entries[d]||{};
 let storageFails=false,form={},reloaded=0,messages=0;
 const saveState=()=>{if(storageFails)throw Error('storage full')};
 const setEntry=(d,e)=>{st.entries[d]=JSON.parse(JSON.stringify(e));saveState()};
 let collectDetail=()=>JSON.parse(JSON.stringify(form));
 const setAutosave=()=>{},toast=()=>{};
 const updateDetailSuggestions=()=>{},updateLiveScore=()=>{},renderHome=()=>{},renderCalendar=()=>{},renderWeekly=()=>{},renderCompleteCard=()=>{};
 let autosaveTimer=null,pendingDetailSave=null;
`,c);
vm.runInContext(section('app.js','function scheduleDetailSave','function setAutosave'),c);
vm.runInContext(section('insights-v0651.js','function hs51Number','// Preserve'),c);
vm.runInContext(section('insights-v0651.js','function hs51CompareWeeks','// The user'),c);
const run=s=>vm.runInContext(s,c);
test('protein excludes missing values, includes zero and reports recorded denominator',()=>{
 run(`st.entries={};[100,null,80,'',undefined,0,120].forEach((p,i)=>st.entries[lastNDates(7)[i]]={proteinActual:p});`);
 assert.equal(run('hs51Week(0).protAvg'),75);assert.equal(run('hs51Week(0).proteinCount'),4);assert.equal(run('hs51Week(0).proteinDays'),2);
 assert.match(run('weeklyReviewHtml()'),/平均P（記録4日）/);
 run('Object.values(st.entries).forEach(e=>e.proteinActual=null)');assert.equal(run('hs51Week(0).protAvg'),null);
});
test('protein goal boundary and start date clipping',()=>{
 run(`st.entries={};st.entries[today()]={proteinActual:90};`);assert.equal(run('hs51Week(0).proteinDays'),1);
 run('st.settings.proteinTarget=120');assert.equal(run('hs51Week(0).proteinDays'),0);
 run(`st.settings.startDate=today()`);assert.equal(run('hs51Week(0).periodDays'),1);run('st.settings.startDate=null');
});
test('rolling comparison uses completed days and guards sparse data',()=>{
 run(`st.entries={};lastNDates(7).slice(0,3).forEach(d=>st.entries[d]={completed:true,finalScore:80});lastNDates(7,hs51DateOffset(today(),-7)).slice(0,3).forEach(d=>st.entries[d]={completed:true,finalScore:70});`);
 assert.equal(run('hs51WeekDelta(hs51Week(0),hs51Week(1))'),'前7日比 +10点');
 run('st.entries[lastNDates(7)[0]].completed=false');assert.equal(run('hs51WeekDelta(hs51Week(0),hs51Week(1))'),'比較データ不足');
});
test('pending draft flush prevents older autosave overwriting planned rest',()=>{
 run(`st.entries={};form={memo:'keep me'};scheduleDetailSave(10000);flushDetailSave();const rest=collectDetail();rest.hiit='rest';rest.specialRestReason='illness';setEntry(today(),rest);flushDetailSave();`);
 assert.equal(run('ent(today()).memo'),'keep me');assert.equal(run('ent(today()).specialRestReason'),'illness');assert.equal(run('pendingDetailSave'),null);
});
test('pending save retains original date across date switches and skips locked entries',()=>{
 run(`st.entries={};elements.date.value='2026-11-09';form={memo:'Monday'};scheduleDetailSave(10000);elements.date.value='2026-11-10';form={memo:'Tuesday'};scheduleDetailSave(10000);flushDetailSave();`);
 assert.equal(run(`ent('2026-11-09').memo`),'Monday');assert.equal(run('ent(today()).memo'),'Tuesday');
 run(`st.entries[today()].completed=true;form={memo:'overwrite'};scheduleDetailSave(10000);flushDetailSave()`);assert.equal(run('ent(today()).memo'),'Tuesday');
});
test('focused weight draft is flushed before reload without a premature render',()=>{
 run(`st.entries={};form={weight:75.3};stageDetailSave()`);assert.equal(run('autosaveTimer'),null);assert.equal(run('ent(today()).weight'),undefined);run('flushDetailSave()');assert.equal(run('ent(today()).weight'),75.3);
});
test('storage failure retains pending draft for retry',()=>{
 run(`st.entries={};form={memo:'retry'};scheduleDetailSave(10000);storageFails=true`);assert.throws(()=>run('flushDetailSave()'));assert.notEqual(run('pendingDetailSave'),null);run('storageFails=false;flushDetailSave()');
});
vm.runInContext(`
 const HS51_REST_REASONS={illness:'体調不良',travel:'出張・移動'};
 const maxFor=()=>5;
 const exercise={};
 const document={querySelector:()=>exercise};
 elements.hs51RestCard={previousElementSibling:exercise,remove(){delete elements.hs51RestCard}};
 elements.hs51RestReason={value:'illness'};
 const fillDetail=d=>{form=JSON.parse(JSON.stringify(ent(d)))};
 const renderAll=()=>{};
`,c);
vm.runInContext(section('ui-v086.js','function u86ExercisePlan','function u86ExerciseCriteria'),c);
vm.runInContext(section('insights-v0651.js','const hs51CoreCollectDetail','const hs51CoreFillDetail'),c);
test('actual rest handler preserves queued input, clears rest and respects completed lock',()=>{
 run(`st.entries={};form={memo:'real handler draft'};scheduleDetailSave(10000);hs51RestControl();elements.hs51RestReason.onchange();flushDetailSave()`);
 assert.equal(run('ent(today()).memo'),'real handler draft');assert.equal(run('ent(today()).specialRestReason'),'illness');assert.equal(run('ent(today()).hiit'),'rest');
 run(`elements.hs51RestReason.value='';elements.hs51RestReason.onchange()`);assert.equal(run('ent(today()).hiit'),undefined);
 run(`st.entries[today()].completed=true;fillDetail(today());elements.hs51RestReason.value='travel';elements.hs51RestReason.onchange()`);assert.equal(run('ent(today()).specialRestReason'),undefined);
 run(`elements.date.value='2026-11-14';hs51RestControl()`);assert.equal(run('elements.hs51RestCard'),undefined);run(`elements.date.value=today()`);
});
test('detail exercise change removes the old planned rest reason',()=>{
 run(`form={hiit:'done',specialRestReason:'illness'}`);assert.equal(run('collectDetail().specialRestReason'),undefined);
});
vm.runInContext(`
 const swHandlers={};const navigator={serviceWorker:{register:()=>Promise.resolve({addEventListener(){}}),addEventListener:(name,fn)=>swHandlers[name]=fn}};
 const location={reload:()=>reloaded++};
 elements.applyUpdate={};
`,c);
vm.runInContext(section('enhancements-v060.js','let waitingWorker=null','/* ---------- render wrappers'),c);
run(`watchServiceWorker();waitingWorker={postMessage:()=>messages++}`);
test('PWA reload and apply update flush pending drafts',()=>{
 run(`st.entries={};form={memo:'update draft'};scheduleDetailSave(10000);swHandlers.controllerchange()`);assert.equal(run('reloaded'),1);assert.equal(run('ent(today()).memo'),'update draft');
 run(`form={memo:'apply draft'};scheduleDetailSave(10000);elements.applyUpdate.onclick()`);assert.equal(run('messages'),1);assert.equal(run('ent(today()).memo'),'apply draft');
});
test('PWA storage failure blocks reload and worker activation',()=>{
 run(`reloading=false;form={memo:'unsaved'};scheduleDetailSave(10000);storageFails=true;swHandlers.controllerchange();elements.applyUpdate.onclick()`);assert.equal(run('reloaded'),1);assert.equal(run('messages'),1);run('storageFails=false;flushDetailSave()');
});
vm.runInContext(`
 document.createElement=()=>({querySelector:()=>({}),remove(){},innerHTML:''});document.body={appendChild:e=>{elements.hs51Celebration=e}};
`,c);
vm.runInContext(section('insights-v0651.js','function hs51CelebrateMilestone','function hs51UpdateAwards'),c);
test('all simultaneous achievements appear in one celebration',()=>{
 run(`hs51CelebrateMilestone([{label:'記録完了 10日'},{label:'週間平均85点'}])`);assert.match(run('elements.hs51Celebration.innerHTML'),/記録完了 10日 \/ 週間平均85点/);
});
test('every local page dependency is precached at the exact version',()=>{
 const sw=read('sw.js');const assets=vm.runInNewContext(sw.slice(0,sw.indexOf("self.addEventListener"))+';ASSETS');
 const urls=[...read('index.html').matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]);
 for(const url of urls)assert.ok(assets.includes('./'+url),'not precached: '+url);
 assert.doesNotMatch(section('sw.js',"self.addEventListener('install'","self.addEventListener('activate'"),/skipWaiting/);
});
console.log(passed+' checks passed');
