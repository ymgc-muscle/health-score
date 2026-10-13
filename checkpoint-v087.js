'use strict';

const CP087_VERSION='0.6.45';
const CP087_PLAN_VERSION=1;

function cp87Round(n){return Math.round(Number(n)*10)/10}
function cp87Key(n){return cp87Round(n).toFixed(1)}
function cp87GoalSignature(){
  const p=st.settings||{},sw=+p.startWeight,gw=+p.goalWeight;
  if(!p.startDate||!p.goalDate||!Number.isFinite(sw)||!Number.isFinite(gw)||sw===gw)return'';
  return [p.startDate,cp87Key(sw),p.goalDate,cp87Key(gw)].join('|');
}
function cp87Mode(days){
  if(days>=21)return{type:'long',averageDays:14,minSamples:7,label:'0.5kgずつ・14日平均で判定'};
  if(days>=8)return{type:'mid',averageDays:7,minSamples:4,label:'中間1回・7日平均で判定'};
  return{type:'short',averageDays:3,minSamples:2,label:'短期目標・3日平均で判定'};
}
function cp87UniqueWeights(values){
  const seen=new Set(),out=[];
  values.forEach(function(v){
    const n=cp87Round(v),k=cp87Key(n);
    if(!seen.has(k)){seen.add(k);out.push(n)}
  });
  return out;
}
function cp87Thresholds(mode,sw,gw){
  const dir=Math.sign(gw-sw),out=[];
  if(mode.type==='long'){
    let x;
    if(dir<0){
      x=Math.floor(sw*2+1e-7)/2;
      if(x>=sw-1e-7)x-=0.5;
      while(x>gw+1e-7){out.push(cp87Round(x));x-=0.5}
    }else{
      x=Math.ceil(sw*2-1e-7)/2;
      if(x<=sw+1e-7)x+=0.5;
      while(x<gw-1e-7){out.push(cp87Round(x));x+=0.5}
    }
  }else if(mode.type==='mid'&&Math.abs(gw-sw)>=0.4){
    const mid=cp87Round((sw+gw)/2);
    if((dir<0&&mid<sw&&mid>gw)||(dir>0&&mid>sw&&mid<gw))out.push(mid);
  }
  out.push(cp87Round(gw));
  return cp87UniqueWeights(out);
}
function cp87Average(days,minSamples){
  const end=today(),fromDate=dateObj(end);
  fromDate.setDate(fromDate.getDate()-(days-1));
  const from=localDateString(fromDate);
  const rows=Object.entries(st.entries||{}).filter(function(pair){
    const ds=pair[0],e=pair[1];
    return ds>=from&&ds<=end&&e&&e.weight!=null&&Number.isFinite(+e.weight);
  }).map(function(pair){return +pair[1].weight});
  const avg=rows.length?rows.reduce(function(a,b){return a+b},0)/rows.length:null;
  return{avg:avg,n:rows.length,ready:rows.length>=minSamples,days:days,minSamples:minSamples};
}
function cp87Reached(value,target,dir){
  if(!Number.isFinite(value))return false;
  return dir<0?value<=target+1e-9:value>=target-1e-9;
}
function cp87CreatePlan(signature){
  const p=st.settings,sw=+p.startWeight,gw=+p.goalWeight;
  const remaining=Math.max(0,Math.ceil(daysBetween(today(),p.goalDate)));
  const mode=cp87Mode(remaining);
  const plan={
    version:CP087_PLAN_VERSION,
    signature:signature,
    createdAt:today(),
    mode:mode.type,
    averageDays:mode.averageDays,
    minSamples:mode.minSamples,
    modeLabel:mode.label,
    thresholds:cp87Thresholds(mode,sw,gw),
    achieved:[]
  };
  const avg=cp87Average(plan.averageDays,plan.minSamples),dir=Math.sign(gw-sw);
  if(avg.ready){
    plan.achieved=plan.thresholds.filter(function(t){return cp87Reached(avg.avg,t,dir)}).map(cp87Key);
  }
  st.settings.weightCheckpointPlan=plan;
  saveState();
  return{plan:plan,created:true};
}
function cp87EnsurePlan(){
  const signature=cp87GoalSignature();
  if(!signature){
    if(st.settings&&st.settings.weightCheckpointPlan){
      delete st.settings.weightCheckpointPlan;
      saveState();
    }
    return{plan:null,created:false};
  }
  const current=st.settings.weightCheckpointPlan;
  if(!current||current.version!==CP087_PLAN_VERSION||current.signature!==signature||!Array.isArray(current.thresholds)||!Array.isArray(current.achieved)){
    return cp87CreatePlan(signature);
  }
  return{plan:current,created:false};
}
function cp87Next(plan){
  if(!plan)return null;
  const done=new Set(plan.achieved||[]);
  return plan.thresholds.find(function(t){return !done.has(cp87Key(t))})??null;
}
function cp87ExpectedDate(target){
  const p=st.settings,sw=+p.startWeight,gw=+p.goalWeight;
  if(!p.startDate||!p.goalDate||!Number.isFinite(sw)||!Number.isFinite(gw)||sw===gw)return null;
  const ratio=clamp((target-sw)/(gw-sw),0,1);
  const total=Math.max(1,daysBetween(p.startDate,p.goalDate));
  const d=dateObj(p.startDate);
  d.setDate(d.getDate()+Math.round(total*ratio));
  return localDateString(d);
}
function cp87Evaluate(){
  const ensured=cp87EnsurePlan(),plan=ensured.plan;
  if(!plan||ensured.created)return null;
  const p=st.settings,dir=Math.sign(+p.goalWeight-+p.startWeight);
  const avg=cp87Average(plan.averageDays,plan.minSamples);
  if(!avg.ready)return null;
  const done=new Set(plan.achieved||[]);
  const crossed=plan.thresholds.filter(function(t){return !done.has(cp87Key(t))&&cp87Reached(avg.avg,t,dir)});
  if(!crossed.length)return null;
  crossed.forEach(function(t){done.add(cp87Key(t))});
  plan.achieved=Array.from(done);
  st.settings.weightCheckpointPlan=plan;
  saveState();
  const next=cp87Next(plan);
  return{
    plan:plan,
    target:crossed[crossed.length-1],
    crossedCount:crossed.length,
    next:next,
    final:next==null,
    average:avg
  };
}
function cp87Remaining(avg,target,dir){
  if(!avg.ready||!Number.isFinite(avg.avg))return null;
  return Math.max(0,dir<0?avg.avg-target:target-avg.avg);
}
function cp87RenderCard(){
  const box=$('appleHome');
  if(!box)return;
  const ensured=cp87EnsurePlan(),plan=ensured.plan;
  let card=$('cp87GoalCard');
  if(!plan){if(card)card.remove();return}
  if(!card){
    card=document.createElement('div');
    card.id='cp87GoalCard';
    card.className='cp87-card';
  }
  const anchor=$('ui82Next')||box.querySelector('.ah-score-card');
  if(anchor&&card.parentElement!==box)anchor.insertAdjacentElement('afterend',card);
  else if(anchor&&card.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',card);
  else if(!anchor&&!card.parentElement)box.appendChild(card);

  const next=cp87Next(plan),avg=cp87Average(plan.averageDays,plan.minSamples);
  const p=st.settings,dir=Math.sign(+p.goalWeight-+p.startWeight);
  const achieved=(plan.achieved||[]).length,total=plan.thresholds.length;

  if(next==null){
    card.classList.add('done');
    card.innerHTML='<div class="cp87-kicker">WEIGHT CHECKPOINT</div>'+
      '<div class="cp87-done-title">🏆 最終目標クリア！</div>'+
      '<div class="cp87-target">'+cp87Key(+p.goalWeight)+'<small>kg</small></div>'+
      '<div class="cp87-sub">ここまでの達成は取り消しません。積み上げた結果として記録されています。</div>'+
      '<div class="cp87-meta">'+achieved+' / '+total+' チェックポイント達成</div>';
    return;
  }

  card.classList.remove('done');
  const remain=cp87Remaining(avg,next,dir),expected=cp87ExpectedDate(next);
  let status;
  if(avg.ready){
    status=plan.averageDays+'日平均 '+avg.avg.toFixed(1)+' kg';
    if(remain!=null)status+=' ・ あと '+remain.toFixed(1)+' kg';
  }else{
    status=plan.averageDays+'日平均の判定データを集めています（'+avg.n+' / '+plan.minSamples+'日）';
  }
  const shortNote=plan.mode==='short'
    ?'<div class="cp87-note">短期判定のため、水分変動の影響を受けやすい参考値です。</div>'
    :'';
  const expectedText=expected
    ?'<div class="cp87-note">目標ライン上の通過目安 '+fmtShort(expected)+'　<span>※期限ではありません</span></div>'
    :'';
  card.innerHTML='<div class="cp87-kicker">NEXT WEIGHT CHECKPOINT</div>'+
    '<div class="cp87-head"><div><div class="cp87-label">次の目標</div><div class="cp87-target">'+cp87Key(next)+'<small>kg</small></div></div>'+
    '<div class="cp87-badge">'+achieved+' / '+total+' 達成</div></div>'+
    '<div class="cp87-status">'+status+'</div>'+
    '<div class="cp87-rule">'+plan.modeLabel+'</div>'+
    expectedText+shortNote;
}
function cp87Confetti(){
  let s='<div class="cp87-confetti" aria-hidden="true">';
  for(let i=0;i<28;i++)s+='<i style="--i:'+i+'"></i>';
  return s+'</div>';
}
function cp87Celebrate(result){
  if(!result||$('cp87Celebration'))return;
  const overlay=document.createElement('div');
  overlay.id='cp87Celebration';
  overlay.className='cp87-celebration';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  const days=result.plan.averageDays,target=cp87Key(result.target);
  const multi=result.crossedCount>1?'<div class="cp87-multi">'+result.crossedCount+'個のチェックポイントを一気に突破！</div>':'';
  const title=result.final?'最終目標、達成！！！！':'チェックポイント突破！！';
  const praise=result.final
    ?'ここまで積み上げたの、本当にデカいです。遠かった目標を、毎日の行動でちゃんと現実にしました。すごい。これは盛大に祝っていいやつです。'
    :days+'日平均で '+target+' kg を突破！ 単日のたまたま軽い数字ではなく、積み上げで取ったチェックポイントです。めちゃくちゃ良い。';
  const next=result.final
    ?'この達成はもう取り消しません。🏆'
    :'この達成はもう取り消しません。次は '+cp87Key(result.next)+' kg。今見るのは、そこだけでOKです。';
  overlay.innerHTML=cp87Confetti()+
    '<div class="cp87-celebration-card">'+
      '<div class="cp87-trophy">'+(result.final?'🏆':'🎉')+'</div>'+
      '<div class="cp87-celebration-kicker">WEIGHT CHECKPOINT CLEAR</div>'+
      '<h2>'+title+'</h2>'+
      '<div class="cp87-clear-weight">'+target+'<small>kg</small></div>'+
      multi+
      '<p>'+praise+'</p>'+
      '<div class="cp87-next-copy">'+next+'</div>'+
      '<button type="button" id="cp87Close">よっしゃ！</button>'+
    '</div>';
  document.body.appendChild(overlay);
  document.body.classList.add('cp87-celebrating');
  const close=function(){
    overlay.classList.add('closing');
    document.body.classList.remove('cp87-celebrating');
    setTimeout(function(){overlay.remove()},220);
  };
  $('cp87Close').onclick=close;
  overlay.addEventListener('click',function(ev){if(ev.target===overlay)close()});
}
function cp87Refresh(){
  const result=cp87Evaluate();
  cp87RenderCard();
  if(result)setTimeout(function(){cp87Celebrate(result)},80);
}
if(typeof renderAppleHome==='function'){
  const cp87CoreRenderAppleHome=renderAppleHome;
  renderAppleHome=function(){
    cp87CoreRenderAppleHome();
    cp87Refresh();
  };
}
function cp87Init(){
  cp87Refresh();
  if($('version'))$('version').textContent='Health Score v'+CP087_VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cp87Init);else cp87Init();
