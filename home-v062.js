'use strict';

const HOME_VERSION='0.6.2';

function ahIcon(name){
  const p={
    weight:'<path d="M5 8.5a7 7 0 0 1 14 0v8.5H5z"/><path d="M12 8.5l2.7-2.3"/><path d="M8 17h8"/>',
    flame:'<path d="M13.2 3.5c.5 3-1.4 4.2-2.5 5.8-1.1 1.5-1 3.3.4 4.2-3.7-.6-4.7-3.7-3.5-6.3C5 9.1 4.7 12 5.8 14.5A6.7 6.7 0 0 0 12 18.5a6.5 6.5 0 0 0 6.4-6.6c0-3.7-2.5-6.5-5.2-8.4z"/>',
    protein:'<path d="M5 9v6M8 7v10M16 7v10M19 9v6M8 12h8"/>',
    steps:'<path d="M9.4 4.2c1.2.5 1.4 2.2.7 3.8S8 10.5 6.8 10s-1.4-2.2-.7-3.8 2.1-2.5 3.3-2zM15.2 13.2c1.2.5 1.4 2.2.7 3.8s-2.1 2.5-3.3 2-1.4-2.2-.7-3.8 2.1-2.5 3.3-2z"/>',
    breakfast:'<path d="M5 15h14M7 15v-4a5 5 0 0 1 10 0v4M12 3v2M5.6 5.6l1.4 1.4M18.4 5.6L17 7"/>',
    lunch:'<path d="M5 10h14l-1 7H6zM8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2"/>',
    buying:'<path d="M6 8h12l-1 11H7zM9 8V6a3 3 0 0 1 6 0v2"/>',
    dinner:'<path d="M6 5v5a2 2 0 0 0 2 2v7M10 5v5M15 5v14M15 5c3 1 4 3 4 6h-4"/>',
    hiit:'<path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 8l-3 3-3-1M9 11l2 3-3 5M11 14l4 3M15 6l2 3 3-1"/>',
    chart:'<path d="M4 18V6M4 18h16M7 14l4-4 3 2 5-6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${p[name]||''}</svg>`;
}

(function prepareAppleHome(){
  const home=$('home');if(!home)return;
  home.classList.add('home-v062');
  if(!$('appleHome')){
    const el=document.createElement('div');el.id='appleHome';el.className='card';home.appendChild(el);
  }
})();

function ahDateLabel(){
  const d=new Date();return new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'short'}).format(d);
}
function ahMetric(label,icon,value,unit,sub,target){
  return `<button class="ah-metric" type="button" data-ah-target="${target}"><div class="ah-metric-top"><span class="ah-icon">${ahIcon(icon)}</span><span>${label}</span></div><div><div class="ah-metric-value">${value}<small>${unit}</small></div>${sub?`<div class="ah-metric-sub">${sub}</div>`:''}</div></button>`;
}
function ahCheckState(k,e){
  const v=e?.[k];if(!v)return'';
  if(k==='hiit')return v==='missed'?'bad':'good';
  return v==='g'?'good':v==='y'?'warn':'bad';
}
function ahCheckLabel(k){return {breakfast:'朝',lunch:'昼',buying:'買食',dinner:'夜',protein:'P',hiit:'運動'}[k]||LABELS[k]}
function ahCheckIcon(k){return k==='protein'?'protein':k}
function ahTrendStatus(avg,target){
  const sw=+st.settings.startWeight,gw=+st.settings.goalWeight;if(!avg||!Number.isFinite(target)||!Number.isFinite(sw)||!Number.isFinite(gw))return'グラフを見る';
  const delta=avg.avg-target,dir=Math.sign(gw-sw);if(Math.abs(delta)<=.2)return'予定通り';
  const ahead=dir<0?delta<0:delta>0;return `${Math.abs(delta).toFixed(1)}kg${ahead?'先行':'遅れ'}`;
}
function ahOpen(target){
  if(target==='chart'){goto('chart');return}
  goto('input');
  setTimeout(()=>{
    if(target==='calories'){const el=$('caloriesActual');el?.scrollIntoView({behavior:'smooth',block:'center'});el?.focus();return}
    if(target==='proteinActual'){const el=$('proteinActual');el?.scrollIntoView({behavior:'smooth',block:'center'});el?.focus();return}
    scrollToField(target);
    if(target==='weight')$('weight')?.focus();
    if(target==='steps')$('steps')?.focus();
  },60);
}

function renderAppleHome(){
  const box=$('appleHome');if(!box)return;
  const e=ent(today()),score=scoreForDay(e),done=!!e.completed,count=completionCount(e),missing=Math.max(0,8-count),ct=+st.settings.calorieTarget||1800,pt=+st.settings.proteinTarget||100,stp=+st.settings.stepTarget||10000;
  const cal=typeof effectiveCalories==='function'?effectiveCalories(e):e.caloriesActual,avg=recentWeightAverage(),target=targetWeightForDate(today());
  const state=done?'完了':score>=85?'とても良い':score>=70?'順調':score>0?'記録中':'今日を始める';
  const next=done?'今日の記録は確定済み':missing===0?'すべて入力済み':`あと ${missing} 項目`;
  const circ=289,offset=circ*(1-clamp(score,0,100)/100);
  const checks=['breakfast','lunch','buying','dinner','protein','hiit'];
  const trendMain=avg?`7日平均 ${avg.avg.toFixed(1)} kg`:'体重トレンド';
  const trendSub=avg&&Number.isFinite(target)?`今日の目標ライン ${target.toFixed(1)} kg`:'記録が増えると平均を表示';
  box.innerHTML=`
    <div class="ah-top"><div><div class="ah-date">${ahDateLabel()}</div><div class="ah-title">今日</div></div><button class="ah-add" type="button" id="ahAdd" aria-label="記録を追加">＋</button></div>
    <div class="ah-score-card">
      <div class="ah-ring"><svg viewBox="0 0 104 104"><circle class="ah-ring-track" cx="52" cy="52" r="46"/><circle class="ah-ring-value" cx="52" cy="52" r="46" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/></svg><div class="ah-ring-text"><b>${score}</b><span>/100</span></div></div>
      <div class="ah-score-copy"><div class="label">HEALTH SCORE</div><div class="state ${done?'done':''}">${state}</div><div class="next">${next}</div></div>
    </div>
    <div class="ah-metrics">
      ${ahMetric('体重','weight',e.weight!=null?Number(e.weight).toFixed(1):'--','kg',avg?`7日平均 ${avg.avg.toFixed(1)} kg`:'今朝','weight')}
      ${ahMetric('カロリー','flame',cal!=null&&Number.isFinite(+cal)?Math.round(+cal).toLocaleString():'--','kcal',`目標 ${ct.toLocaleString()}`,'calories')}
      ${ahMetric('たんぱく質','protein',e.proteinActual!=null?Math.round(+e.proteinActual):'--','g',`目標 ${pt} g`,'proteinActual')}
      ${ahMetric('歩数','steps',e.steps!=null?Number(e.steps).toLocaleString():'--','歩',`目標 ${stp.toLocaleString()}`,'steps')}
    </div>
    <div class="ah-section"><div class="ah-section-head"><b>今日のチェック</b><span>入力 ${count}/8</span></div><div class="ah-checks">${checks.map(k=>`<button class="ah-check ${ahCheckState(k,e)}" type="button" data-ah-check="${k}"><span class="ah-check-icon">${ahIcon(ahCheckIcon(k))}<i class="ah-dot"></i></span><span class="ah-check-label">${ahCheckLabel(k)}</span></button>`).join('')}</div></div>
    <button class="ah-trend" id="ahTrend" type="button"><span class="ah-icon">${ahIcon('chart')}</span><span class="ah-trend-main"><b>${trendMain}</b><span>${trendSub}</span></span><span class="ah-trend-side">${ahTrendStatus(avg,target)} <i class="ah-chevron">›</i></span></button>
    <div class="ah-actions"><button class="ah-primary ${done?'completed':''}" type="button" id="ahComplete">${done?'完了済み ✓':'今日を完了'}</button><button class="ah-secondary" type="button" id="ahDetail">詳細</button></div>`;
  $('ahAdd').onclick=()=>goto('input');$('ahDetail').onclick=()=>goto('input');$('ahTrend').onclick=()=>goto('chart');
  box.querySelectorAll('[data-ah-target]').forEach(b=>b.onclick=()=>ahOpen(b.dataset.ahTarget));
  box.querySelectorAll('[data-ah-check]').forEach(b=>b.onclick=()=>ahOpen(b.dataset.ahCheck));
  $('ahComplete').onclick=()=>{if(done){goto('input');return}completeDay(today())};
}

const ahCoreRenderHome=renderHome;
renderHome=function(){ahCoreRenderHome();renderAppleHome()};

const ahCoreGoto=goto;
goto=function(id){document.body.classList.toggle('home-clean',id==='home');ahCoreGoto(id);if(id==='home')renderAppleHome()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

document.addEventListener('DOMContentLoaded',()=>{
  document.body.classList.add('home-clean');
  renderAppleHome();
  if($('version'))$('version').textContent=`Health Score v${HOME_VERSION}`;
});
