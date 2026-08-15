'use strict';

const VERSION='0.5.0';
const KEY='health-score-v1';
const DEFAULT_WEIGHTS={weight:5,breakfast:10,lunch:20,buying:25,dinner:15,protein:10,steps:10,hiit:5};
const DEFAULT_SETTINGS={
  startDate:null,startWeight:null,goalDate:null,goalWeight:null,
  calorieTarget:1800,stepTarget:10000,proteinTarget:100,
  scoreWeights:{...DEFAULT_WEIGHTS},focusItems:['lunch','buying'],onboardingCompleted:false
};
const RATING_RATIOS={breakfast:.7,lunch:.6,buying:.8,dinner:2/3,protein:.7};
const RATED_KEYS=['breakfast','lunch','buying','dinner','protein'];
const ALL_KEYS=['weight','breakfast','lunch','buying','dinner','protein','steps','hiit'];
const LABELS={weight:'体重',breakfast:'朝食',lunch:'昼食',buying:'買い食い',dinner:'夕食',protein:'たんぱく質',steps:'歩数',hiit:'運動'};

const $=id=>document.getElementById(id);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round10=n=>Math.round(n/10)*10;
const localDateString=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>localDateString(new Date());
const dateObj=s=>new Date(`${s}T00:00:00`);
const daysBetween=(a,b)=>(dateObj(b)-dateObj(a))/86400000;
const fmtShort=s=>{if(!s)return'--';const [,m,d]=s.split('-');return`${+m}/${+d}`};
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

let st=loadState();
let calMonth=new Date(`${today()}T00:00:00`);
let activeView='home';
let autosaveTimer=null;

function loadState(){
  let raw=null;
  try{raw=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
  const s=raw&&typeof raw==='object'?raw:{entries:{}};
  s.entries=s.entries&&typeof s.entries==='object'?s.entries:{};
  s.settings={...DEFAULT_SETTINGS,...(s.settings||{})};
  s.settings.scoreWeights={...DEFAULT_WEIGHTS,...(s.settings.scoreWeights||{})};
  if(!Array.isArray(s.settings.focusItems))s.settings.focusItems=['lunch','buying'];
  if(!Number.isFinite(+s.settings.calorieTarget))s.settings.calorieTarget=1800;
  if(!Number.isFinite(+s.settings.stepTarget))s.settings.stepTarget=10000;
  if(!Number.isFinite(+s.settings.proteinTarget))s.settings.proteinTarget=100;
  return s;
}
function saveState(){localStorage.setItem(KEY,JSON.stringify(st))}
function ent(d){return st.entries[d]||{}}
function weights(){return st.settings.scoreWeights}
function entryHasData(e){return !!(e&&(e.weight!=null||e.steps!=null||e.caloriesActual!=null||e.proteinActual!=null||(e.memo||'').trim()||RATED_KEYS.some(k=>e[k])||e.hiit))}
function completionCount(e){return ALL_KEYS.reduce((n,k)=>n+(k==='weight'?e.weight!=null:k==='steps'?e.steps!=null:!!e[k]),0)}
function entryComplete(e){return completionCount(e)===ALL_KEYS.length}

function ratingPoints(k,v){const max=+weights()[k]||0;if(v==='g')return max;if(v==='y')return Math.round(max*(RATING_RATIOS[k]??.7));return 0}
function stepPoints(v){
  const max=+weights().steps||0,t=Math.max(1,+st.settings.stepTarget||10000),n=+v;
  if(!Number.isFinite(n))return 0;
  if(n>=t)return max;if(n>=t*.8)return Math.round(max*.8);if(n>=t*.6)return Math.round(max*.5);return 0;
}
function liveScore(e){
  if(!e)return 0;let n=0;
  if(e.weight!=null)n+=+weights().weight||0;
  RATED_KEYS.forEach(k=>{if(e[k])n+=ratingPoints(k,e[k])});
  if(e.steps!=null)n+=stepPoints(e.steps);
  if(e.hiit&&e.hiit!=='missed')n+=+weights().hiit||0;
  return clamp(Math.round(n),0,100);
}
function scoreForDay(e){return e?.completed&&e.finalScore!=null&&Number.isFinite(+e.finalScore)?+e.finalScore:liveScore(e)}
function earnedFor(k,e){
  if(k==='weight')return e.weight!=null?(+weights().weight||0):0;
  if(k==='steps')return e.steps!=null?stepPoints(e.steps):0;
  if(k==='hiit')return e.hiit&&e.hiit!=='missed'?(+weights().hiit||0):0;
  return e[k]?ratingPoints(k,e[k]):0;
}
function maxFor(k){return +weights()[k]||0}
function ratingLabel(v){return v==='g'?'◎':v==='y'?'○':v==='r'?'×':'－'}
function statusClass(sc){return sc>=85?'green':sc>=70?'yellow':sc>=55?'orange':'red'}

function calorieBands(target=+st.settings.calorieTarget){
  const t=Math.max(1000,Number(target)||1800);
  return{breakfast:[round10(t*.18),round10(t*.25)],lunch:[round10(t*.25),round10(t*.39)],dinner:[round10(t*.28),round10(t*.36)],snack:[round10(t*.05),round10(t*.10)]};
}
function criteria(k){
  const b=calorieBands(),w=weights(),pt=Math.max(20,+st.settings.proteinTarget||100),p90=Math.round(pt*.9),p70=Math.round(pt*.7);
  const stp=Math.max(1000,+st.settings.stepTarget||10000),s80=round10(stp*.8),s60=round10(stp*.6);
  if(k==='breakfast')return `<span class="cg"><b>◎ ${w.breakfast}点</b>：${b.breakfast[0]}〜${b.breakfast[1]} kcalを基本帯に、たんぱく質も確保。</span><br><span class="cy"><b>○ ${ratingPoints(k,'y')}点</b>：基本帯から少し外れる、または栄養バランスに不足。</span><br><span class="cr"><b>× 0点</b>：明らかな食べ過ぎ、または極端に少ない。</span>`;
  if(k==='lunch')return `<span class="cg"><b>◎ ${w.lunch}点</b>：${b.lunch[0]}〜${b.lunch[1]} kcalを基本帯に、たんぱく質20g前後以上＋野菜＋主食適量。</span><br><span class="cy"><b>○ ${ratingPoints(k,'y')}点</b>：基本帯から少し外れる、またはたんぱく質・野菜不足、脂質・塩分が高め。</span><br><span class="cr"><b>× 0点</b>：大幅なオーバー、麺＋炒飯、大盛り＋揚げ物など。</span>`;
  if(k==='buying')return `<span class="cg"><b>◎ ${w.buying}点</b>：不要な買い食いなし。</span><br><span class="cy"><b>○ ${ratingPoints(k,'y')}点</b>：${b.snack[0]}〜${b.snack[1]} kcal程度の計画的補食。</span><br><span class="cr"><b>× 0点</b>：予定外の追加食をして、その後も通常の夕食。</span>`;
  if(k==='dinner')return `<span class="cg"><b>◎ ${w.dinner}点</b>：${b.dinner[0]}〜${b.dinner[1]} kcalを基本帯に、主菜＋野菜＋適量の主食。</span><br><span class="cy"><b>○ ${ratingPoints(k,'y')}点</b>：基本帯から少し外れる、または脂質・塩分高めだが量は抑えた。</span><br><span class="cr"><b>× 0点</b>：揚げ物＋大盛り炭水化物＋追加食など。</span>`;
  if(k==='protein')return `<span class="cg"><b>◎ ${w.protein}点</b>：${p90}g以上（目標${pt}gの90%以上）。</span><br><span class="cy"><b>○ ${ratingPoints(k,'y')}点</b>：${p70}〜${p90-1}g。</span><br><span class="cr"><b>× 0点</b>：${p70}g未満が目安。</span>`;
  if(k==='steps')return `<span class="cg"><b>◎ ${w.steps}点</b>：${stp.toLocaleString()}歩以上</span><br><span class="cy"><b>○ ${Math.round(w.steps*.8)}点</b>：${s80.toLocaleString()}〜${(stp-1).toLocaleString()}歩</span><br><b>△ ${Math.round(w.steps*.5)}点</b>：${s60.toLocaleString()}〜${(s80-1).toLocaleString()}歩<br><span class="cr"><b>0点</b>：${s60.toLocaleString()}歩未満</span>`;
  if(k==='weight')return `<b>${w.weight}点</b>：起床後・トイレ後・飲食前を基本に測定。数値ではなく「測った行動」を加点。`;
  if(k==='hiit')return `<span class="cg"><b>${w.hiit}点</b>：実施または計画した休養日</span><br><span class="cr"><b>0点</b>：実施予定だったが未実施</span>`;
  return'';
}

function mealSuggest(k,e){
  if(k==='protein'){
    if(e.proteinActual==null)return null;const g=+e.proteinActual;if(!Number.isFinite(g))return null;
    const t=+st.settings.proteinTarget||100;return g>=t*.9?'g':g>=t*.7?'y':'r';
  }
  if(!['breakfast','lunch','dinner'].includes(k))return null;
  const kcal=+(e.mealKcal?.[k]);if(!Number.isFinite(kcal))return null;
  const [lo,hi]=calorieBands()[k],balanced=!!e.mealBalanced?.[k];
  if(kcal>=lo&&kcal<=hi)return balanced?'g':'y';
  if(kcal>=lo*.8&&kcal<=hi*1.2)return'y';
  return'r';
}
function calorieStatus(v){
  if(v==null||v==='')return{txt:'未入力',cls:''};const n=+v,t=+st.settings.calorieTarget||1800;if(!Number.isFinite(n))return{txt:'未入力',cls:''};
  const r=n/t;if(r>=.95&&r<=1.05)return{txt:'目標付近',cls:'good'};
  if(r>=.85&&r<=1.1)return{txt:r<.95?'やや少なめ':'やや多め',cls:'warn'};
  return{txt:r<.85?'少なめ':'多め',cls:'bad'};
}
function proteinStatus(v){
  if(v==null||v==='')return{txt:'未入力',cls:''};const n=+v,t=+st.settings.proteinTarget||100;if(!Number.isFinite(n))return{txt:'未入力',cls:''};
  const r=n/t;if(r>=.9)return{txt:'目標圏',cls:'good'};if(r>=.7)return{txt:'あと少し',cls:'warn'};return{txt:'不足気味',cls:'bad'};
}

function setEntry(d,e){if(entryHasData(e))st.entries[d]=e;else delete st.entries[d];saveState()}
function snapshotEntry(e){return JSON.parse(JSON.stringify(e||{}))}
function migrateCompletedHistory(){
  let changed=false;
  for(const [d,e] of Object.entries(st.entries)){
    e.mealKcal=e.mealKcal||{};e.mealBalanced=e.mealBalanced||{};
    if(d<today()&&entryComplete(e)&&!e.completed&&e.finalScore==null){e.completed=true;e.finalScore=liveScore(e);e.scoreSnapshot={weights:{...weights()},version:VERSION};changed=true}
  }
  if(Object.keys(st.entries).length&&st.settings.startWeight!=null&&!st.settings.onboardingCompleted){st.settings.onboardingCompleted=true;changed=true}
  if(changed)saveState();
}

function preferredOrder(e){
  const h=new Date().getHours();
  const base=h<10?['weight','breakfast','lunch','buying','dinner','protein','steps','hiit']:
    h<16?['lunch','buying','dinner','protein','steps','hiit','weight','breakfast']:
    h<20?['buying','dinner','protein','steps','hiit','weight','breakfast','lunch']:
    ['dinner','protein','steps','hiit','weight','breakfast','lunch','buying'];
  return base.filter(k=>!(k==='weight'?e.weight!=null:k==='steps'?e.steps!=null:!!e[k]));
}

function renderHome(){
  const e=ent(today()),sc=scoreForDay(e),isFinal=!!e.completed;
  $('score').textContent=sc;$('scoreStatus').textContent=isFinal?'今日の確定スコア':'入力中のスコア';
  const meta=sc===0?['ここからスタート','#777']:sc>=85?['Green','#19a65b']:sc>=70?['Yellow','#d99900']:sc>=55?['Orange','#ef7d00']:['積み上げ中','#df493d'];
  $('judge').textContent=meta[0];$('judge').style.color=meta[1];
  $('weightNow').textContent=e.weight??'--';$('stepsNow').textContent=e.steps!=null?Number(e.steps).toLocaleString():'--';
  renderNext(e);renderWeightProgress(e);renderActuals(e);renderFocus(e);renderQuick(e);renderCompleteCard('home',e);renderHomeSummary(e);
}
function renderNext(e){
  const missing=preferredOrder(e),box=$('nextCard');
  if(e.completed)box.innerHTML='<div class="sub">今日の記録</div><div class="next-main next-done">完了済み ✓</div><div class="help" style="margin-top:5px">修正する場合は「記録を再開」してください。</div>';
  else if(!missing.length)box.innerHTML='<div class="sub">今日の残り</div><div class="next-main next-done">すべて入力済み。完了できます ✓</div>';
  else box.innerHTML=`<div class="sub">今日の残り</div><div class="next-main">${missing.slice(0,3).map(k=>LABELS[k]).join(' ・ ')}${missing.length>3?` <span class="sub">＋${missing.length-3}</span>`:''}</div><div class="help" style="margin-top:5px">タップすると次の未入力項目へ移動します。</div>`;
  box.onclick=()=>{if(e.completed)return;goto('input');setTimeout(()=>scrollToField(missing[0]),40)};
}
function targetWeightForDate(d){
  const p=st.settings;if(!p.startDate||!p.goalDate||p.startWeight==null||p.goalWeight==null||!Number.isFinite(+p.startWeight)||!Number.isFinite(+p.goalWeight))return null;
  const total=Math.max(1,daysBetween(p.startDate,p.goalDate)),pos=clamp(daysBetween(p.startDate,d),0,total);
  return +p.startWeight+(+p.goalWeight-+p.startWeight)*(pos/total);
}
function recentWeightAverage(d=today()){
  const end=dateObj(d),from=new Date(end);from.setDate(from.getDate()-6);const vals=[];
  Object.entries(st.entries).forEach(([ds,e])=>{const dd=dateObj(ds);if(dd>=from&&dd<=end&&e.weight!=null&&Number.isFinite(+e.weight))vals.push(+e.weight)});
  return vals.length?{avg:vals.reduce((a,b)=>a+b,0)/vals.length,n:vals.length}:null;
}
function renderWeightProgress(e){
  const p=st.settings,avg=recentWeightAverage(),target=targetWeightForDate(today()),box=$('weightProgress');
  if(p.goalWeight==null||!Number.isFinite(+p.goalWeight)){box.innerHTML='<div class="title">体重目標</div><div class="help">設定画面で目標体重を設定してください。</div>';return}
  const w=e.weight!=null?+e.weight:NaN,sw=p.startWeight!=null?+p.startWeight:NaN,gw=+p.goalWeight;
  let goalText='--',remain='--';
  if(Number.isFinite(w)&&Number.isFinite(sw)&&sw!==gw){
    const dir=Math.sign(gw-sw),left=dir<0?w-gw:gw-w;
    if(Math.abs(w-gw)<.05)remain='目標達成！';else if(left>0)remain=`あと ${Math.abs(left).toFixed(1)} kg`;else remain=`目標より ${(w-gw)>=0?'+':''}${(w-gw).toFixed(1)} kg`;
  }
  goalText=`${fmtShort(p.goalDate)} → ${Number(gw).toFixed(1)} kg`;
  const delta=avg&&Number.isFinite(target)?avg.avg-target:null;
  box.innerHTML=`<div class="rowhead"><div><div class="sub">体重目標</div><div style="font-size:22px;font-weight:850">${goalText}</div></div><div style="text-align:right"><div class="sub">進捗</div><div style="font-size:18px;font-weight:850;color:var(--o)">${remain}</div></div></div>
  <div class="kpi-grid" style="margin-top:12px"><div class="kpi"><span class="sub">今朝</span><b>${Number.isFinite(w)?w.toFixed(1):'--'}</b></div><div class="kpi"><span class="sub">7日平均${avg&&avg.n<7?` (${avg.n}日)`:''}</span><b>${avg?avg.avg.toFixed(1):'--'}</b></div><div class="kpi ${delta!=null&&((gw<sw&&delta<=0)||(gw>sw&&delta>=0))?'good':''}"><span class="sub">目標ライン比</span><b>${delta==null?'--':`${delta>=0?'+':''}${delta.toFixed(1)}`}</b></div></div>`;
}
function renderActuals(e){
  const cs=calorieStatus(e.caloriesActual),ps=proteinStatus(e.proteinActual),ct=+st.settings.calorieTarget||1800,pt=+st.settings.proteinTarget||100;
  $('actualsCard').innerHTML=`<div class="title">今日の実績</div><div class="grid2" style="margin-top:10px">
    <div><div class="progress-label"><span class="sub">摂取カロリー</span><span class="progress-status ${cs.cls}">${cs.txt}</span></div><div class="progress-big"><span id="homeCaloriesText">${e.caloriesActual??'--'}</span> / ${ct.toLocaleString()} kcal</div><div class="meter"><i style="width:${e.caloriesActual!=null?clamp(+e.caloriesActual/ct*100,0,130):0}%"></i></div></div>
    <div><div class="progress-label"><span class="sub">たんぱく質</span><span class="progress-status ${ps.cls}">${ps.txt}</span></div><div class="progress-big"><span id="homeProteinText">${e.proteinActual??'--'}</span> / ${pt} g</div><div class="meter"><i style="width:${e.proteinActual!=null?clamp(+e.proteinActual/pt*100,0,100):0}%"></i></div></div>
  </div><div class="grid2" style="margin-top:10px"><div class="field"><label>実カロリーを入力</label><input id="homeCalories" type="number" min="0" step="1" value="${e.caloriesActual??''}" placeholder="例 1800"></div><div class="field"><label>実たんぱく質を入力 (g)</label><input id="homeProtein" type="number" min="0" step="1" value="${e.proteinActual??''}" placeholder="例 95"></div></div>`;
  $('homeCalories').oninput=()=>quickNumericSave('caloriesActual',$('homeCalories').value);
  $('homeProtein').oninput=()=>quickNumericSave('proteinActual',$('homeProtein').value);
}
function renderFocus(e){
  const items=(st.settings.focusItems||[]).filter(k=>ALL_KEYS.includes(k));const card=$('focusCard');
  if(!items.length){card.style.display='none';return}card.style.display='block';
  card.innerHTML=`<div class="rowhead"><div class="title">FOCUS</div><div class="sub">重点項目</div></div><div class="focus-list" style="margin-top:10px">${items.map(k=>{const done=k==='weight'?e.weight!=null:k==='steps'?e.steps!=null:!!e[k];const bad=RATED_KEYS.includes(k)&&e[k]==='r';return`<span class="focus-pill ${bad?'bad':done?'done':'pending'}">${LABELS[k]} ${bad?'×':done?'✓':'－'}</span>`}).join('')}</div>`;
}
function quickSeg(k,e){return `<div class="seg ${k==='hiit'?'hiit':''}" data-home-k="${k}">${k==='hiit'?`<button data-v="done" class="g ${e[k]==='done'?'sel':''}">実施</button><button data-v="rest" class="y ${e[k]==='rest'?'sel':''}">休養</button><button data-v="missed" class="r ${e[k]==='missed'?'sel':''}">未実施</button>`:`<button data-v="g" class="g ${e[k]==='g'?'sel':''}">◎</button><button data-v="y" class="y ${e[k]==='y'?'sel':''}">○</button><button data-v="r" class="r ${e[k]==='r'?'sel':''}">×</button>`}</div>`}
function renderQuick(e){
  const q=$('quickCard');q.innerHTML=`<div class="quick-head"><div><div class="title">今日のチェック</div><div class="sub">ホームから直接入力できます</div></div><button class="btn2" id="openDetail" style="width:auto;padding:8px 10px">詳細</button></div><div class="quick-body">
    <div class="quick-row"><div class="quick-row-title"><span>体重</span><span class="mini">${maxFor('weight')}点</span></div><input id="homeWeight" type="number" step="0.1" value="${e.weight??''}" placeholder="kg"></div>
    ${['breakfast','lunch','buying','dinner','protein'].map(k=>`<div class="quick-row"><div class="quick-row-title"><span>${LABELS[k]}</span><span class="mini">${earnedFor(k,e)}/${maxFor(k)}点</span></div>${quickSeg(k,e)}${suggestHtml(k,e)}</div>`).join('')}
    <div class="quick-row"><div class="quick-row-title"><span>歩数</span><span class="mini">${earnedFor('steps',e)}/${maxFor('steps')}点</span></div><input id="homeSteps" type="number" step="100" value="${e.steps??''}" placeholder="歩"></div>
    <div class="quick-row"><div class="quick-row-title"><span>HIIT / 運動</span><span class="mini">${earnedFor('hiit',e)}/${maxFor('hiit')}点</span></div>${quickSeg('hiit',e)}</div>
  </div>`;
  $('openDetail').onclick=()=>goto('input');$('homeWeight').oninput=()=>quickNumericSave('weight',$('homeWeight').value);$('homeSteps').oninput=()=>quickNumericSave('steps',$('homeSteps').value);
  q.querySelectorAll('[data-home-k] button').forEach(btn=>btn.onclick=()=>quickRatingSave(btn.parentElement.dataset.homeK,btn.dataset.v));
  q.querySelectorAll('[data-apply-suggest]').forEach(btn=>btn.onclick=()=>quickRatingSave(btn.dataset.applySuggest,btn.dataset.v));
  if(e.completed)q.querySelectorAll('input,button:not(#openDetail)').forEach(el=>el.disabled=true);
}
function suggestHtml(k,e){const s=mealSuggest(k,e);if(!s)return'';if(e[k]===s)return`<div class="suggest"><span>推奨 ${ratingLabel(s)} を反映済み</span></div>`;return`<div class="suggest"><span>実績からの推奨：<b>${ratingLabel(s)}</b></span><button data-apply-suggest="${k}" data-v="${s}">反映</button></div>`}
function quickNumericSave(k,v){const e=snapshotEntry(ent(today()));e[k]=v===''?null:+v;if(k==='proteinActual'&&!e.protein){}setEntry(today(),e);scheduleHomeRefresh()}
function quickRatingSave(k,v){const e=snapshotEntry(ent(today()));e[k]=v;setEntry(today(),e);renderHome();renderCalendar();renderWeekly()}
let homeRefreshTimer=null;function scheduleHomeRefresh(){clearTimeout(homeRefreshTimer);homeRefreshTimer=setTimeout(()=>{renderHome();renderCalendar();renderWeekly()},220)}
function renderHomeSummary(e){
  const box=$('todaySummary');box.innerHTML=ALL_KEYS.map(k=>{let status='未入力';if(k==='weight'&&e.weight!=null)status='◎';else if(k==='steps'&&e.steps!=null)status=e.steps>=st.settings.stepTarget?'◎':e.steps>=st.settings.stepTarget*.8?'○':e.steps>=st.settings.stepTarget*.6?'△':'×';else if(k==='hiit'&&e.hiit)status=e.hiit==='missed'?'×':e.hiit==='rest'?'休養':'◎';else if(e[k])status=ratingLabel(e[k]);return`<div class="row"><div class="rowhead"><span class="title">${LABELS[k]}</span><span><b>${status}</b>　${earnedFor(k,e)}/${maxFor(k)}点</span></div></div>`}).join('')}

function collectDetail(){
  const d=$('date').value,old=snapshotEntry(ent(d)),e={...old};
  e.weight=$('weight').value===''?null:+$('weight').value;e.steps=$('steps').value===''?null:+$('steps').value;e.caloriesActual=$('caloriesActual').value===''?null:+$('caloriesActual').value;e.proteinActual=$('proteinActual').value===''?null:+$('proteinActual').value;e.memo=$('memo').value;
  e.mealKcal=e.mealKcal||{};e.mealBalanced=e.mealBalanced||{};
  document.querySelectorAll('#rated [data-k]').forEach(seg=>{const sel=seg.querySelector('.sel');if(sel)e[seg.dataset.k]=sel.dataset.v;else delete e[seg.dataset.k]});
  document.querySelectorAll('[data-mealkcal]').forEach(inp=>{const k=inp.dataset.mealkcal;if(inp.value==='')delete e.mealKcal[k];else e.mealKcal[k]=+inp.value});
  document.querySelectorAll('[data-balanced]').forEach(inp=>{e.mealBalanced[inp.dataset.balanced]=inp.checked});
  const hiit=$('hiitSeg').querySelector('.sel');if(hiit)e.hiit=hiit.dataset.v;else delete e.hiit;
  return e;
}
function fillDetail(d=$('date').value){
  const e=ent(d);$('weight').value=e.weight??'';$('steps').value=e.steps??'';$('caloriesActual').value=e.caloriesActual??'';$('proteinActual').value=e.proteinActual??'';$('memo').value=e.memo??'';
  buildRated(e);
  $('weightCriteria').innerHTML=criteria('weight');$('stepsCriteria').innerHTML=criteria('steps');$('hiitCriteria').innerHTML=criteria('hiit');
  const stepPts=document.querySelector('[data-field="steps"] .acc-points'),hiitPts=document.querySelector('[data-field="hiit"] .acc-points');if(stepPts)stepPts.textContent=`${maxFor('steps')}点`;if(hiitPts)hiitPts.textContent=`${maxFor('hiit')}点`;
  $('hiitSeg').querySelectorAll('button').forEach(b=>b.classList.toggle('sel',e.hiit===b.dataset.v));
  updateDetailSuggestions();updateLiveScore();renderCompleteCard('input',e);setDetailLocked(!!e.completed);setAutosave(e.completed?'完了済み：再開すると編集できます':'変更は自動保存されます','ok');
}
function buildRated(e){
  $('rated').innerHTML=RATED_KEYS.map(k=>{
    const meal=['breakfast','lunch','dinner'].includes(k),kcal=meal?(e.mealKcal?.[k]??''):'';
    return`<div class="card ratecard" data-field="${k}"><button class="acc-head" type="button"><span class="acc-title">${LABELS[k]}</span><span class="acc-points">${maxFor(k)}点</span><span class="chev">⌄</span></button><div class="criteria">${criteria(k)}</div><div class="rate-body">${meal?`<div class="grid2" style="margin-bottom:10px"><div class="field"><label>${LABELS[k]} kcal（任意）</label><input data-mealkcal="${k}" type="number" min="0" step="1" value="${kcal}" placeholder="例 500"></div><label class="checkline"><input data-balanced="${k}" type="checkbox" ${e.mealBalanced?.[k]?'checked':''}> たんぱく質・野菜などバランス良好</label></div>`:''}<div class="seg" data-k="${k}"><button data-v="g" class="g ${e[k]==='g'?'sel':''}">◎</button><button data-v="y" class="y ${e[k]==='y'?'sel':''}">○</button><button data-v="r" class="r ${e[k]==='r'?'sel':''}">×</button></div><div class="suggest none" id="suggest_${k}"></div></div></div>`;
  }).join('')
}
function setDetailLocked(locked){document.querySelectorAll('#input input:not(#date),#input textarea,#input .seg button').forEach(el=>el.disabled=locked)}
function updateDetailSuggestions(){
  const e=collectDetail();RATED_KEYS.forEach(k=>{const box=$(`suggest_${k}`);if(!box)return;const s=mealSuggest(k,e);if(!s){box.className='suggest none';box.innerHTML='';return}box.className='suggest';box.innerHTML=e[k]===s?`<span>推奨 ${ratingLabel(s)} を反映済み</span>`:`<span>実績からの推奨：<b>${ratingLabel(s)}</b></span><button type="button" data-detail-suggest="${k}" data-v="${s}">反映</button>`})
}
function updateLiveScore(){const e=collectDetail();$('liveScore').textContent=e.completed&&e.finalScore!=null&&Number.isFinite(+e.finalScore)?e.finalScore:liveScore(e);$('liveScoreLabel').textContent=e.completed?'確定スコア':'入力中スコア'}
function scheduleDetailSave(delay=220){
  const d=$('date').value,e=collectDetail();setAutosave('保存中…','saving');clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>{setEntry(d,e);setAutosave('保存済み ✓','ok');updateDetailSuggestions();updateLiveScore();renderHome();renderCalendar();renderWeekly();renderCompleteCard('input',e)},delay)
}
function setAutosave(txt,cls){const el=$('autosave');el.textContent=txt;el.className=`autosave ${cls}`}
function scrollToField(k){const sel=k==='weight'?'[data-field="weight"]':k==='steps'?'[data-field="steps"]':k==='hiit'?'[data-field="hiit"]':`[data-field="${k}"]`;const el=document.querySelector(`#input ${sel}`);if(el){el.scrollIntoView({behavior:'smooth',block:'start'});el.classList?.add('open')}}

function renderCompleteCard(where,e){
  const id=where==='home'?'homeComplete':'inputComplete',box=$(id);if(!box)return;
  const d=where==='home'?today():$('date').value,sc=scoreForDay(e),done=!!e.completed,count=completionCount(e);
  box.className=`card complete-card ${done?'done':''}`;
  if(done)box.innerHTML=`<div class="rowhead"><div><div class="title">記録完了 ✓</div><div class="complete-note">${sc}点で固定されています。配点を変更してもこの日の確定スコアは変わりません。</div></div><button class="btn2" style="width:auto" data-reopen="${d}">記録を再開</button></div>`;
  else box.innerHTML=`<div class="rowhead"><div><div class="title">${d===today()?'今日を完了':'この日を完了'}</div><div class="complete-note">入力済み ${count}/8項目。完了すると現在のスコアを固定します。未入力があっても完了できます。</div></div><button class="btn3" style="width:auto" data-complete="${d}">完了する</button></div>`;
  box.querySelector('[data-complete]')?.addEventListener('click',()=>completeDay(d));box.querySelector('[data-reopen]')?.addEventListener('click',()=>reopenDay(d));
}
function completeDay(d){
  const e=snapshotEntry(ent(d));if(!entryHasData(e)){toast('先に何か記録してください');return}e.completed=true;e.finalScore=liveScore(e);e.completedAt=new Date().toISOString();e.scoreSnapshot={weights:{...weights()},version:VERSION};setEntry(d,e);toast(`${e.finalScore}点で記録を完了しました`);if(d===$('date').value)fillDetail(d);renderAll()}
function reopenDay(d){const e=snapshotEntry(ent(d));e.completed=false;delete e.finalScore;delete e.completedAt;delete e.scoreSnapshot;setEntry(d,e);toast('記録を再開しました');if(d===$('date').value)fillDetail(d);renderAll()}

function renderCalendar(){
  const y=calMonth.getFullYear(),m=calMonth.getMonth();$('calTitle').textContent=`${y}年 ${m+1}月`;
  const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();let h=['日','月','火','水','木','金','土'].map(x=>`<div class="dow">${x}</div>`).join('');for(let i=0;i<first;i++)h+='<div class="day empty"></div>';
  const finals=[];for(let d=1;d<=days;d++){
    const ds=localDateString(new Date(y,m,d)),e=st.entries[ds],has=!!e&&entryHasData(e),done=!!e?.completed,sc=has?scoreForDay(e):0,cnt=has?completionCount(e):0;if(done)finals.push(sc);
    h+=`<button class="day ${has?(done?statusClass(sc):'partial'):''} ${ds===today()?'today':''}" type="button" data-date="${ds}"><span class="num">${d}</span>${has?`<span class="badge">${done?sc:`${cnt}/8`}</span>`:''}</button>`;
  }
  $('cal').innerHTML=h;$('monthDays').textContent=`${finals.length}日`;$('monthAvg').textContent=finals.length?`${Math.round(finals.reduce((a,b)=>a+b,0)/finals.length)}点`:'--';
  $('cal').querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{$('date').value=b.dataset.date;fillDetail(b.dataset.date);goto('input')});
}

function chart(){
  const actual=Object.entries(st.entries).filter(([,e])=>e.weight!=null&&Number.isFinite(+e.weight)).map(([d,e])=>({d,w:+e.weight})).sort((a,b)=>a.d.localeCompare(b.d)),box=$('chartbox'),p=st.settings;
  if(!actual.length){box.innerHTML='<div class="sub" style="padding:80px 10px;text-align:center">体重データを入力するとグラフが表示されます</div>';$('chartHelp').textContent='オレンジ＝実測、緑＝7日平均、破線＝目標ライン';return}
  const firstDate=p.startDate||actual[0].d,lastActual=actual.at(-1).d,endDate=[p.goalDate,lastActual,today()].filter(Boolean).sort().at(-1),startDate=[firstDate,actual[0].d].sort()[0];
  const startD=dateObj(startDate),endD=dateObj(endDate),total=Math.max(1,(endD-startD)/86400000),goalW=p.goalWeight!=null&&Number.isFinite(+p.goalWeight)?+p.goalWeight:null,startW=p.startWeight!=null&&Number.isFinite(+p.startWeight)?+p.startWeight:actual[0].w;
  const allW=[...actual.map(x=>x.w),startW,...(goalW!=null?[goalW]:[])];let ymin=Math.floor((Math.min(...allW)-.7)*2)/2,ymax=Math.ceil((Math.max(...allW)+.7)*2)/2;if(ymax-ymin<4)ymax=ymin+4;
  const W=640,H=280,L=46,R=14,T=18,B=34,day=d=>(dateObj(d)-startD)/86400000,X=d=>L+clamp(day(d),0,total)/total*(W-L-R),Y=w=>T+(ymax-w)/(ymax-ymin)*(H-T-B);
  let grid='';for(let v=Math.ceil(ymin*2)/2;v<=ymax+.001;v+=.5)grid+=`<line x1="${L}" y1="${Y(v)}" x2="${W-R}" y2="${Y(v)}" stroke="#e8eaed"/><text x="${L-6}" y="${Y(v)+4}" font-size="10" text-anchor="end" fill="#777">${v.toFixed(1)}</text>`;
  const pts=actual.map(x=>`${X(x.d)},${Y(x.w)}`).join(' '),avgs=actual.map(x=>{const t=dateObj(x.d),from=new Date(t);from.setDate(from.getDate()-6);const arr=actual.filter(z=>{const dz=dateObj(z.d);return dz>=from&&dz<=t}).map(z=>z.w);return{d:x.d,w:arr.reduce((a,b)=>a+b,0)/arr.length}}),avgpts=avgs.map(x=>`${X(x.d)},${Y(x.w)}`).join(' ');
  let target='';if(p.startDate&&p.goalDate&&goalW!=null){target=`<polyline points="${X(p.startDate)},${Y(startW)} ${X(p.goalDate)},${Y(goalW)}" fill="none" stroke="#999" stroke-width="2" stroke-dasharray="6 5"/>`;if(endDate>p.goalDate)target+=`<line x1="${X(p.goalDate)}" y1="${Y(goalW)}" x2="${X(endDate)}" y2="${Y(goalW)}" stroke="#bbb" stroke-width="1.5" stroke-dasharray="4 5"/>`}
  const ticks=Array.from({length:6},(_,i)=>{const d=new Date(startD);d.setDate(d.getDate()+Math.round(total*i/5));const ds=localDateString(d);return`<text x="${X(ds)}" y="${H-8}" font-size="9" text-anchor="middle" fill="#777">${fmtShort(ds)}</text>`}).join('');
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}">${grid}${target}${actual.length>1?`<polyline points="${pts}" fill="none" stroke="#ff6a00" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${avgpts}" fill="none" stroke="#19a65b" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`:''}${actual.map(x=>`<circle cx="${X(x.d)}" cy="${Y(x.w)}" r="3.5" fill="#ff6a00"/>`).join('')}${ticks}</svg>`;
  $('chartHelp').textContent='オレンジ＝実測、緑＝直近7日平均、破線＝設定した目標ライン。目標日を過ぎた記録も表示します。';
}

function renderWeekly(){
  const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i-6);return localDateString(d)}),entries=days.map(d=>st.entries[d]).filter(Boolean),done=entries.filter(e=>e.completed),scores=done.map(scoreForDay),avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;
  const lunch=entries.filter(e=>e.lunch),buy=entries.filter(e=>e.buying),protein=entries.filter(e=>e.protein);
  const pct=(arr,k)=>arr.length?Math.round(arr.filter(e=>e[k]==='g').length/arr.length*100):null;
  $('weekly').innerHTML=[['完了日',`${done.length} / 7日`],['確定スコア平均',avg==null?'--':`${avg}点`],['昼食 ◎率',pct(lunch,'lunch')==null?'--':`${pct(lunch,'lunch')}%`],['買い食いなし ◎率',pct(buy,'buying')==null?'--':`${pct(buy,'buying')}%`],['たんぱく質 ◎率',pct(protein,'protein')==null?'--':`${pct(protein,'protein')}%`]].map(([a,b])=>`<div class="weekrow"><span>${a}</span><b>${b}</b></div>`).join('')
}

function fillSettings(){
  const p=st.settings;$('setStartDate').value=p.startDate||today();$('setStartWeight').value=p.startWeight??'';$('setGoalDate').value=p.goalDate||'';$('setGoalWeight').value=p.goalWeight??'';$('setCalorieTarget').value=p.calorieTarget;$('setStepTarget').value=p.stepTarget;$('setProteinTarget').value=p.proteinTarget;
  Object.keys(DEFAULT_WEIGHTS).forEach(k=>{$(`score_${k}`).value=weights()[k]});document.querySelectorAll('[data-focus]').forEach(c=>c.checked=(p.focusItems||[]).includes(c.dataset.focus));drawSettingsGuide();drawScoreTotal();renderCriteriaSettings();
}
function drawSettingsGuide(){const b=calorieBands(+$('setCalorieTarget').value||st.settings.calorieTarget),steps=+$('setStepTarget').value||10000,protein=+$('setProteinTarget').value||100;$('targetGuide').innerHTML=`<div class="sub">自動計算される目安</div><div class="grid2" style="margin-top:8px"><b>朝食 ◎ ${b.breakfast[0]}〜${b.breakfast[1]} kcal</b><b>昼食 ◎ ${b.lunch[0]}〜${b.lunch[1]} kcal</b><b>夕食 ◎ ${b.dinner[0]}〜${b.dinner[1]} kcal</b><b>補食 ${b.snack[0]}〜${b.snack[1]} kcal</b><b>歩数 ◎ ${steps.toLocaleString()}歩〜</b><b>たんぱく質 ◎ ${Math.round(protein*.9)}g〜</b></div>`}
function drawScoreTotal(){const total=Object.keys(DEFAULT_WEIGHTS).reduce((s,k)=>s+(+$(`score_${k}`).value||0),0);$('scoreTotal').textContent=`合計 ${total} / 100点`;$('scoreTotal').style.color=total===100?'#118348':'#b9362c'}
function renderCriteriaSettings(){$('allCriteria').innerHTML=ALL_KEYS.map(k=>`<details><summary>${LABELS[k]}（${maxFor(k)}点）</summary><div class="help" style="margin-top:8px">${criteria(k)}</div></details>`).join('')}
function saveSettings(){
  const startDate=$('setStartDate').value,goalDate=$('setGoalDate').value,startWeight=+$('setStartWeight').value,goalWeight=+$('setGoalWeight').value,calorieTarget=+$('setCalorieTarget').value,stepTarget=+$('setStepTarget').value,proteinTarget=+$('setProteinTarget').value,scoreWeights={};Object.keys(DEFAULT_WEIGHTS).forEach(k=>scoreWeights[k]=+$(`score_${k}`).value);const sum=Object.values(scoreWeights).reduce((a,b)=>a+b,0),focusItems=[...document.querySelectorAll('[data-focus]:checked')].map(x=>x.dataset.focus);
  if(!startDate||!goalDate||!Number.isFinite(startWeight)||!Number.isFinite(goalWeight)||startWeight<=0||goalWeight<=0||dateObj(goalDate)<=dateObj(startDate)){toast('体重目標・期間を確認してください');return}
  if(!Number.isFinite(calorieTarget)||calorieTarget<1000||calorieTarget>5000||!Number.isFinite(stepTarget)||stepTarget<1000||stepTarget>50000||!Number.isFinite(proteinTarget)||proteinTarget<20||proteinTarget>300){toast('健康目標の値を確認してください');return}
  if(Object.values(scoreWeights).some(v=>!Number.isInteger(v)||v<0||v>100)||sum!==100){toast(`配点の合計を100点にしてください（現在${sum}点）`);return}
  st.settings={...st.settings,startDate,startWeight,goalDate,goalWeight,calorieTarget,stepTarget,proteinTarget,scoreWeights,focusItems,onboardingCompleted:true};saveState();toast('設定を保存しました');fillSettings();renderAll();fillDetail($('date').value)
}

function renderAll(){renderHome();renderCalendar();chart();renderWeekly()}
function goto(id){activeView=id;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id===id));document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===id));$('hdr').textContent=id==='home'?'Health Score':id==='input'?'詳細入力':id==='calendar'?'スコアカレンダー':id==='chart'?'体重グラフ':'設定';if(id==='calendar')renderCalendar();if(id==='chart')chart();if(id==='settings')fillSettings();window.scrollTo(0,0)}
function toast(s){const t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(toast.tm);toast.tm=setTimeout(()=>t.classList.remove('show'),1800)}

function showOnboarding(){
  if(st.settings.onboardingCompleted||Object.keys(st.entries).length>0)return;
  const d=new Date();d.setDate(d.getDate()+30);const goalDate=localDateString(d),el=document.createElement('div');el.className='onboard';el.innerHTML=`<div class="onboard-inner"><div class="onboard-logo">✓</div><h1>Health Scoreを設定</h1><div class="onboard-lead">最初に目標を決めます。あとからいつでも変更できます。</div><div class="card"><div class="title">体重目標</div><div class="settings-grid" style="margin-top:12px"><div class="field"><label>開始体重 (kg)</label><input id="obStartWeight" type="number" step="0.1" placeholder="例 75.0"></div><div class="field"><label>目標体重 (kg)</label><input id="obGoalWeight" type="number" step="0.1" placeholder="例 70.0"></div><div class="field"><label>目標日</label><input id="obGoalDate" type="date" value="${goalDate}"></div></div></div><div class="card"><div class="title">1日の健康目標</div><div class="settings-grid" style="margin-top:12px"><div class="field"><label>摂取カロリー</label><input id="obCalories" type="number" value="1800" step="50"></div><div class="field"><label>歩数</label><input id="obSteps" type="number" value="10000" step="500"></div><div class="field"><label>たんぱく質 (g)</label><input id="obProtein" type="number" value="100" step="5"></div></div></div><button class="btn" id="obStart">この設定ではじめる</button></div>`;document.body.appendChild(el);
  $('obStart').onclick=()=>{const sw=+$('obStartWeight').value,gw=+$('obGoalWeight').value,gd=$('obGoalDate').value,ct=+$('obCalories').value,sp=+$('obSteps').value,pt=+$('obProtein').value;if(!Number.isFinite(sw)||sw<=0||!Number.isFinite(gw)||gw<=0||!gd||dateObj(gd)<=dateObj(today())){toast('体重と目標日を確認してください');return}if(ct<1000||sp<1000||pt<20){toast('健康目標を確認してください');return}st.settings={...st.settings,startDate:today(),startWeight:sw,goalDate:gd,goalWeight:gw,calorieTarget:ct,stepTarget:sp,proteinTarget:pt,scoreWeights:{...DEFAULT_WEIGHTS},focusItems:['lunch','buying'],onboardingCompleted:true};saveState();location.reload()}
}

function bindEvents(){
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));
  $('date').value=today();$('date').onchange=()=>fillDetail($('date').value);
  $('prevMonth').onclick=()=>{calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()-1,1);renderCalendar()};$('nextMonth').onclick=()=>{calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()+1,1);renderCalendar()};
  document.addEventListener('click',ev=>{const acc=ev.target.closest('.acc-head');if(acc){acc.closest('.ratecard').classList.toggle('open');return}const btn=ev.target.closest('#input .seg button');if(btn){const seg=btn.parentElement;seg.querySelectorAll('button').forEach(x=>x.classList.remove('sel'));btn.classList.add('sel');updateLiveScore();scheduleDetailSave(80);return}const sug=ev.target.closest('[data-detail-suggest]');if(sug){const seg=document.querySelector(`#rated [data-k="${sug.dataset.detailSuggest}"]`);seg?.querySelector(`[data-v="${sug.dataset.v}"]`)?.click()}});
  ['weight','steps','caloriesActual','proteinActual','memo'].forEach(id=>$(id).addEventListener('input',()=>{updateLiveScore();scheduleDetailSave(id==='memo'?450:220)}));
  $('rated').addEventListener('input',ev=>{if(ev.target.matches('[data-mealkcal]')){updateDetailSuggestions();scheduleDetailSave(220)}});$('rated').addEventListener('change',ev=>{if(ev.target.matches('[data-balanced]')){updateDetailSuggestions();scheduleDetailSave(100)}});
  $('hiitSeg').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{$('hiitSeg').querySelectorAll('button').forEach(x=>x.classList.remove('sel'));btn.classList.add('sel');updateLiveScore();scheduleDetailSave(80)});
  ['setCalorieTarget','setStepTarget','setProteinTarget'].forEach(id=>$(id).oninput=drawSettingsGuide);Object.keys(DEFAULT_WEIGHTS).forEach(k=>$(`score_${k}`).oninput=drawScoreTotal);$('saveSettings').onclick=saveSettings;
  $('resetWeights').onclick=()=>{Object.entries(DEFAULT_WEIGHTS).forEach(([k,v])=>$(`score_${k}`).value=v);drawScoreTotal();toast('初期配点をセットしました。保存で確定します')};
  $('export').onclick=()=>{const blob=new Blob([JSON.stringify(st,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`health-score-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)};
  $('import').onchange=async ev=>{const f=ev.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!x||typeof x!=='object'||!x.entries)throw Error();st=x;st.entries=st.entries||{};st.settings={...DEFAULT_SETTINGS,...(st.settings||{})};st.settings.scoreWeights={...DEFAULT_WEIGHTS,...(st.settings.scoreWeights||{})};saveState();migrateCompletedHistory();fillSettings();fillDetail(today());renderAll();toast('バックアップを復元しました')}catch{toast('読み込みに失敗しました')}ev.target.value=''};
}

function init(){migrateCompletedHistory();bindEvents();fillDetail(today());fillSettings();renderAll();$('version').textContent=`Health Score v${VERSION}`;showOnboarding();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js')}

document.addEventListener('DOMContentLoaded',init);
