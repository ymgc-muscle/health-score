'use strict';

const V060='0.6.0';

/* ---------- data helpers ---------- */
const coreEntryHasData=entryHasData;
entryHasData=function(e){return coreEntryHasData(e)||e?.snackKcal!=null};

function hasMealCalories(e){
  const vals=['breakfast','lunch','dinner'].map(k=>e?.mealKcal?.[k]).concat(e?.snackKcal);
  return vals.some(v=>v!=null&&v!==''&&Number.isFinite(+v));
}
function mealCaloriesTotal(e){
  if(!hasMealCalories(e))return null;
  return ['breakfast','lunch','dinner'].reduce((s,k)=>s+(Number.isFinite(+e?.mealKcal?.[k])?+e.mealKcal[k]:0),0)+(Number.isFinite(+e?.snackKcal)?+e.snackKcal:0);
}
function effectiveCalories(e){
  if(e?.caloriesActual!=null&&e.caloriesActual!==''&&Number.isFinite(+e.caloriesActual))return +e.caloriesActual;
  return mealCaloriesTotal(e);
}
function lastNDates(n,end=today()){
  const out=[],base=dateObj(end);for(let i=n-1;i>=0;i--){const d=new Date(base);d.setDate(d.getDate()-i);out.push(localDateString(d))}return out;
}
function doneRating(k,e){return k==='weight'?e?.weight!=null:k==='steps'?e?.steps!=null:!!e?.[k]}
function fullPointAchieved(k,e){
  if(k==='weight')return e?.weight!=null;
  if(k==='steps')return e?.steps!=null&&+e.steps>=(+st.settings.stepTarget||10000);
  if(k==='hiit')return e?.hiit==='done'||e?.hiit==='rest';
  return e?.[k]==='g';
}

/* ---------- richer immutable completion snapshot ---------- */
function v060Snapshot(e,score){
  return {
    version:V060,
    finalScore:score,
    weights:{...weights()},
    targets:{
      calorieTarget:+st.settings.calorieTarget||1800,
      stepTarget:+st.settings.stepTarget||10000,
      proteinTarget:+st.settings.proteinTarget||100,
      startDate:st.settings.startDate||null,
      startWeight:st.settings.startWeight??null,
      goalDate:st.settings.goalDate||null,
      goalWeight:st.settings.goalWeight??null
    },
    ratings:Object.fromEntries(ALL_KEYS.map(k=>[k,e?.[k]??(k==='weight'?e?.weight??null:k==='steps'?e?.steps??null:null)])),
    actuals:{calories:effectiveCalories(e),protein:e?.proteinActual??null,steps:e?.steps??null,weight:e?.weight??null},
    mealKcal:{...(e?.mealKcal||{}),snack:e?.snackKcal??null}
  };
}
completeDay=function(d){
  const e=snapshotEntry(ent(d));
  if(!entryHasData(e)){toast('先に何か記録してください');return}
  const score=liveScore(e);
  e.completed=true;e.finalScore=score;e.completedAt=new Date().toISOString();e.scoreSnapshot=v060Snapshot(e,score);
  setEntry(d,e);toast(`${score}点で記録を完了しました`);if(d===$('date').value)fillDetail(d);renderAll();
};

/* ---------- calorie auto-sum ---------- */
const inputActualCard=$('caloriesActual')?.closest('.card');
if(inputActualCard&&!$('snackKcal')){
  const grid=inputActualCard.querySelector('.grid2');
  const snack=document.createElement('div');snack.className='field';
  snack.innerHTML='<label>補食・間食 kcal</label><input type="number" id="snackKcal" min="0" step="1" placeholder="例 105">';
  grid?.appendChild(snack);
  const calLabel=$('caloriesActual')?.closest('.field')?.querySelector('label');
  if(calLabel)calLabel.textContent='1日合計を手動入力（任意）';
  const note=document.createElement('div');note.id='calorieAutoNote';note.className='auto-calc';inputActualCard.appendChild(note);
}

const coreCollectDetail=collectDetail;
collectDetail=function(){
  const e=coreCollectDetail();
  const sn=$('snackKcal');if(sn)e.snackKcal=sn.value===''?null:+sn.value;
  return e;
};
const coreFillDetail=fillDetail;
fillDetail=function(d=$('date').value){
  coreFillDetail(d);const e=ent(d);if($('snackKcal'))$('snackKcal').value=e.snackKcal??'';renderAutoCalorieNote(e);
};
function renderAutoCalorieNote(e=collectDetail()){
  const box=$('calorieAutoNote');if(!box)return;const sum=mealCaloriesTotal(e),manual=e.caloriesActual;
  if(manual!=null&&manual!==''&&Number.isFinite(+manual))box.innerHTML=`<b>1日合計：${(+manual).toLocaleString()} kcal</b><span>手動入力を使用中。空欄にすると食事kcalの自動合計を使います。</span>`;
  else if(sum!=null)box.innerHTML=`<b>自動合計：${sum.toLocaleString()} kcal</b><span>朝・昼・夕・補食の入力から計算</span>`;
  else box.innerHTML='<b>1日合計：--</b><span>各食事kcalを入力すると自動合計します。</span>';
}

const coreRenderActuals=renderActuals;
renderActuals=function(e){
  const total=effectiveCalories(e),display={...e,caloriesActual:total};coreRenderActuals(display);
  const card=$('actualsCard');if(!card)return;
  const sum=mealCaloriesTotal(e),manual=e.caloriesActual!=null&&e.caloriesActual!==''&&Number.isFinite(+e.caloriesActual);
  const info=document.createElement('div');info.className='auto-calc compact';
  info.innerHTML=manual?`<b>合計は手動入力</b><span>${(+e.caloriesActual).toLocaleString()} kcal</span>`:sum!=null?`<b>食事から自動合計</b><span>${sum.toLocaleString()} kcal</span>`:'<b>自動合計</b><span>詳細入力で食事kcalを追加</span>';
  card.appendChild(info);
  const input=$('homeCalories');if(input){input.value=e.caloriesActual??'';const lab=input.closest('.field')?.querySelector('label');if(lab)lab.textContent='1日合計を手動入力（任意）'}
};

/* ---------- score insights ---------- */
const homeActual=$('actualsCard');
if(homeActual&&!$('scoreInsights')){const c=document.createElement('div');c.id='scoreInsights';c.className='card';homeActual.after(c)}
function pointLosses(e){
  const rows=[];
  for(const k of ALL_KEYS){
    if(!doneRating(k,e))continue;const max=maxFor(k),got=earnedFor(k,e),loss=max-got;if(loss>0)rows.push({k,loss,got,max});
  }
  return rows.sort((a,b)=>b.loss-a.loss);
}
function remainingPotential(e){return ALL_KEYS.reduce((s,k)=>s+(!doneRating(k,e)?maxFor(k):0),0)}
function nextStepOpportunity(e){
  if(e.steps==null)return null;const n=+e.steps,t=+st.settings.stepTarget||10000,max=maxFor('steps');if(!Number.isFinite(n)||n>=t)return null;
  const s60=Math.ceil(t*.6),s80=Math.ceil(t*.8);
  let target,pts;if(n<s60){target=s60;pts=Math.round(max*.5)}else if(n<s80){target=s80;pts=Math.round(max*.8)-stepPoints(n)}else{target=t;pts=max-stepPoints(n)}
  return pts>0?{need:Math.max(0,target-n),pts,target}:null;
}
function renderScoreInsights(e){
  const box=$('scoreInsights');if(!box)return;const losses=pointLosses(e),remain=remainingPotential(e),step=nextStepOpportunity(e);
  const lossHtml=losses.length?losses.slice(0,3).map(x=>`<div class="insight-row"><span>${LABELS[x.k]}</span><b>−${x.loss}点</b></div>`).join(''):'<div class="help">入力済み項目では大きな失点はありません。</div>';
  const action=[];if(remain>0)action.push(`未入力項目で最大 <b>+${remain}点</b>`);if(step)action.push(`あと <b>${Math.ceil(step.need).toLocaleString()}歩</b>で <b>+${step.pts}点</b>`);
  box.innerHTML=`<div class="rowhead"><div class="title">スコアの理由</div><div class="sub">失点TOP3</div></div><div class="insight-list">${lossHtml}</div>${!e.completed&&action.length?`<div class="recoverable">${action.join('　')}</div>`:''}`;
}

/* ---------- weight pace interpretation + forecast ---------- */
const coreRenderWeightProgress=renderWeightProgress;
renderWeightProgress=function(e){coreRenderWeightProgress(e);appendWeightPace()};
function weightForecast(){
  const p=st.settings,gw=+p.goalWeight,sw=+p.startWeight;if(!Number.isFinite(gw)||!Number.isFinite(sw))return null;
  const pts=Object.entries(st.entries).filter(([,e])=>e.weight!=null&&Number.isFinite(+e.weight)).map(([d,e])=>({d,w:+e.weight})).sort((a,b)=>a.d.localeCompare(b.d));
  if(pts.length<8||daysBetween(pts[0].d,pts.at(-1).d)<13)return null;
  const recent=pts.filter(x=>daysBetween(x.d,pts.at(-1).d)<=21),x0=dateObj(recent[0].d),xs=recent.map(x=>(dateObj(x.d)-x0)/86400000),ys=recent.map(x=>x.w),xm=xs.reduce((a,b)=>a+b,0)/xs.length,ym=ys.reduce((a,b)=>a+b,0)/ys.length;
  const den=xs.reduce((s,x)=>s+(x-xm)**2,0);if(!den)return null;const slope=xs.reduce((s,x,i)=>s+(x-xm)*(ys[i]-ym),0)/den;
  const dir=Math.sign(gw-sw);if((dir<0&&slope>=-.005)||(dir>0&&slope<=.005))return null;
  const days=(gw-ym)/slope;if(!Number.isFinite(days)||days<0||days>180)return null;const d=new Date(x0);d.setDate(d.getDate()+Math.round(xm+days));return localDateString(d);
}
function appendWeightPace(){
  const box=$('weightProgress'),p=st.settings,avg=recentWeightAverage(),target=targetWeightForDate(today());if(!box||!avg||!Number.isFinite(target)||!Number.isFinite(+p.startWeight)||!Number.isFinite(+p.goalWeight))return;
  const delta=avg.avg-target,dir=Math.sign(+p.goalWeight-+p.startWeight),ahead=dir<0?delta<-.2:delta>.2,behind=dir<0?delta>.2:delta<-.2;
  const text=ahead?`目標ラインより ${Math.abs(delta).toFixed(1)} kg先行`:behind?`目標ラインより ${Math.abs(delta).toFixed(1)} kg遅れ`:'ほぼ予定通り';
  const cls=ahead?'good':behind?'warn':'neutral',fc=weightForecast();
  box.insertAdjacentHTML('beforeend',`<div class="pace ${cls}"><b>${text}</b>${fc?`<span>現在の傾向からの参考到達日：${fmtShort(fc)}ごろ</span>`:'<span>到達日予測は14日以上のデータがたまると表示します。</span>'}</div>`);
}

/* ---------- weekly review ---------- */
const focusCard=$('focusCard');
if(focusCard&&!$('weeklyHome')){const c=document.createElement('div');c.id='weeklyHome';c.className='card';focusCard.after(c)}
function weeklyStats(){
  const dates=lastNDates(7),pairs=dates.map(d=>[d,st.entries[d]]),entries=pairs.filter(([,e])=>e&&entryHasData(e)),done=pairs.filter(([,e])=>e?.completed),scores=done.map(([,e])=>scoreForDay(e));
  const avgScore=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;
  const achieved=done.filter(([,e])=>scoreForDay(e)>=70).length;
  const cal=entries.map(([,e])=>effectiveCalories(e)).filter(Number.isFinite),prot=entries.map(([,e])=>+e.proteinActual).filter(Number.isFinite);
  const stepDays=entries.filter(([,e])=>e.steps!=null&&+e.steps>=(+st.settings.stepTarget||10000)).length,proteinDays=entries.filter(([,e])=>e.proteinActual!=null&&+e.proteinActual>=(+st.settings.proteinTarget||100)*.9).length,buyDays=entries.filter(([,e])=>e.buying==='g').length;
  const weights7=entries.filter(([,e])=>e.weight!=null&&Number.isFinite(+e.weight)).map(([d,e])=>({d,w:+e.weight}));const weightDelta=weights7.length>=2?weights7.at(-1).w-weights7[0].w:null;
  const weakness=ALL_KEYS.map(k=>{const seen=entries.filter(([,e])=>doneRating(k,e));if(!seen.length)return{k,rate:null};return{k,rate:seen.filter(([,e])=>fullPointAchieved(k,e)).length/seen.length}}).filter(x=>x.rate!=null).sort((a,b)=>a.rate-b.rate)[0]||null;
  return{dates,entries,done,avgScore,achieved,calAvg:cal.length?Math.round(cal.reduce((a,b)=>a+b,0)/cal.length):null,protAvg:prot.length?Math.round(prot.reduce((a,b)=>a+b,0)/prot.length):null,stepDays,proteinDays,buyDays,weightDelta,weakness};
}
function weeklyReviewHtml(){
  const w=weeklyStats(),rate=Math.round(w.achieved/7*100),weak=w.weakness?LABELS[w.weakness.k]:'--';
  return `<div class="weekly-head"><div><div class="sub">直近7日</div><div class="weekly-rate">達成率 ${rate}%</div></div><div class="weekly-score"><span>平均</span><b>${w.avgScore??'--'}</b></div></div><div class="kpi-grid weekly-kpis"><div class="kpi"><span class="sub">完了</span><b>${w.done.length}/7</b></div><div class="kpi"><span class="sub">70点以上</span><b>${w.achieved}/7</b></div><div class="kpi"><span class="sub">体重変化</span><b>${w.weightDelta==null?'--':`${w.weightDelta>=0?'+':''}${w.weightDelta.toFixed(1)}`}</b></div></div><div class="week-detail"><div><span>平均摂取</span><b>${w.calAvg==null?'--':`${w.calAvg.toLocaleString()} kcal`}</b></div><div><span>平均P</span><b>${w.protAvg==null?'--':`${w.protAvg} g`}</b></div><div><span>歩数目標</span><b>${w.stepDays}/7日</b></div><div><span>P目標圏</span><b>${w.proteinDays}/7日</b></div><div><span>買い食い回避</span><b>${w.buyDays}/7日</b></div><div><span>改善余地</span><b>${weak}</b></div></div>`;
}
function renderWeeklyHome(){const box=$('weeklyHome');if(box)box.innerHTML=`<div class="title">週間レビュー</div>${weeklyReviewHtml()}`}
renderWeekly=function(){const box=$('weekly');if(box)box.innerHTML=weeklyReviewHtml()};

/* ---------- incomplete past days ---------- */
const calSection=$('calendar');
if(calSection&&!$('incompletePast')){const c=document.createElement('div');c.id='incompletePast';c.className='card incomplete-card';calSection.prepend(c)}
function renderIncompletePast(){
  const box=$('incompletePast');if(!box)return;const from=new Date();from.setDate(from.getDate()-30);
  const arr=Object.entries(st.entries).filter(([d,e])=>dateObj(d)<dateObj(today())&&dateObj(d)>=from&&entryHasData(e)&&!e.completed).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6);
  if(!arr.length){box.style.display='none';return}box.style.display='block';box.innerHTML=`<div class="rowhead"><div class="title">未完了の記録</div><div class="sub">過去30日</div></div><div class="incomplete-list">${arr.map(([d,e])=>`<button data-incomplete="${d}"><span>${fmtShort(d)}</span><b>${completionCount(e)}/8</b></button>`).join('')}</div>`;box.querySelectorAll('[data-incomplete]').forEach(b=>b.onclick=()=>{$('date').value=b.dataset.incomplete;fillDetail(b.dataset.incomplete);goto('input')});
}
const coreRenderCalendar=renderCalendar;
renderCalendar=function(){coreRenderCalendar();renderIncompletePast()};

/* ---------- undo for home ratings ---------- */
if(!$('undoBar')){const u=document.createElement('div');u.id='undoBar';u.className='undo-bar';u.innerHTML='<span id="undoText"></span><button id="undoBtn">元に戻す</button>';document.body.appendChild(u)}
let undoTimer=null,undoAction=null;
function showUndo(text,fn){undoAction=fn;$('undoText').textContent=text;$('undoBar').classList.add('show');clearTimeout(undoTimer);undoTimer=setTimeout(()=>{$('undoBar').classList.remove('show');undoAction=null},4500)}
$('undoBtn').onclick=()=>{if(undoAction)undoAction();$('undoBar').classList.remove('show');undoAction=null;clearTimeout(undoTimer)};
const coreQuickRatingSave=quickRatingSave;
quickRatingSave=function(k,v){const before=snapshotEntry(ent(today())),old=before[k];coreQuickRatingSave(k,v);showUndo(`${LABELS[k]}を${k==='hiit'?(v==='done'?'実施':v==='rest'?'休養':'未実施'):ratingLabel(v)}に変更`,()=>{const restore=snapshotEntry(ent(today()));if(old==null)delete restore[k];else restore[k]=old;setEntry(today(),restore);renderHome();renderCalendar();renderWeekly()})};

/* ---------- CSV export ---------- */
function csvCell(v){const s=v==null?'':String(v);return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function exportCsv(){
  const header=['Date','Completed','Score','WeightKg','Calories','ProteinG','Breakfast','Lunch','Buying','Dinner','Steps','HIIT','BreakfastKcal','LunchKcal','DinnerKcal','SnackKcal','Memo'];
  const rows=Object.entries(st.entries).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,e])=>[d,e.completed?'1':'0',scoreForDay(e),e.weight??'',effectiveCalories(e)??'',e.proteinActual??'',ratingLabel(e.breakfast),ratingLabel(e.lunch),ratingLabel(e.buying),ratingLabel(e.dinner),e.steps??'',e.hiit??'',e.mealKcal?.breakfast??'',e.mealKcal?.lunch??'',e.mealKcal?.dinner??'',e.snackKcal??'',e.memo??'']);
  const csv='\ufeff'+[header,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`health-score-${today()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
const backupCard=$('export')?.closest('.card');
if(backupCard&&!$('exportCsv')){const b=document.createElement('button');b.className='btn2';b.id='exportCsv';b.type='button';b.style.marginTop='8px';b.textContent='CSVを書き出す';backupCard.appendChild(b);b.onclick=exportCsv}

/* ---------- update notification ---------- */
if(!$('updateBanner')){const b=document.createElement('div');b.id='updateBanner';b.className='update-banner';b.innerHTML='<span>新しいバージョンがあります</span><button id="applyUpdate">更新</button>';document.body.appendChild(b)}
let waitingWorker=null,reloading=false;
function showUpdate(worker){waitingWorker=worker;$('updateBanner').classList.add('show')}
function watchServiceWorker(){
  if(!('serviceWorker'in navigator))return;
  navigator.serviceWorker.register('./sw.js').then(reg=>{
    if(reg.waiting)showUpdate(reg.waiting);
    reg.addEventListener('updatefound',()=>{const nw=reg.installing;if(!nw)return;nw.addEventListener('statechange',()=>{if(nw.state==='installed'&&navigator.serviceWorker.controller)showUpdate(nw)})});
  }).catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload()});
  $('applyUpdate').onclick=()=>{if(waitingWorker)waitingWorker.postMessage({type:'SKIP_WAITING'})};
}

/* ---------- render wrappers ---------- */
const coreRenderHome=renderHome;
renderHome=function(){coreRenderHome();renderScoreInsights(ent(today()));renderWeeklyHome()};
const coreScheduleDetailSave=scheduleDetailSave;
scheduleDetailSave=function(delay=220){renderAutoCalorieNote();coreScheduleDetailSave(delay)};
const coreRenderAll=renderAll;
renderAll=function(){coreRenderAll();renderIncompletePast()};

/* ---------- v0.6 initialization ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  if($('snackKcal'))$('snackKcal').addEventListener('input',()=>{renderAutoCalorieNote();updateDetailSuggestions();scheduleDetailSave(180)});
  $('rated')?.addEventListener('input',ev=>{if(ev.target.matches('[data-mealkcal]'))renderAutoCalorieNote()});
  $('caloriesActual')?.addEventListener('input',()=>renderAutoCalorieNote());
  $('version').textContent=`Health Score v${V060}`;
  renderAutoCalorieNote(ent($('date')?.value||today()));renderHome();renderCalendar();renderWeekly();watchServiceWorker();
});
