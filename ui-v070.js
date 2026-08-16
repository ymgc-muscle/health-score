'use strict';

const HOME_TIDY_VERSION='0.6.10';

/* Rolling weight average: latest 7 calendar days. Before seven measurements
   exist, show the actual number of measured days. Compare pace against the
   average target for the exact same measurement dates. */
recentWeightAverage=function(d=today()){
  const end=dateObj(d),from=new Date(end);from.setDate(from.getDate()-6);
  const rows=Object.entries(st.entries)
    .filter(([ds,e])=>{
      const dd=dateObj(ds);
      return dd>=from&&dd<=end&&e?.weight!=null&&Number.isFinite(+e.weight);
    })
    .map(([ds,e])=>({date:ds,weight:+e.weight,target:targetWeightForDate(ds)}))
    .sort((a,b)=>a.date.localeCompare(b.date));
  if(!rows.length)return null;
  const avg=rows.reduce((s,r)=>s+r.weight,0)/rows.length;
  const targets=rows.map(r=>r.target).filter(Number.isFinite);
  const goalAvg=targets.length===rows.length?targets.reduce((a,b)=>a+b,0)/targets.length:null;
  return{avg,n:rows.length,dates:rows.map(r=>r.date),goalAvg,windowStart:localDateString(from),windowEnd:d};
};

function rollingPace(avg,fallbackTarget){
  const sw=+st.settings.startWeight,gw=+st.settings.goalWeight;
  if(!avg||!Number.isFinite(sw)||!Number.isFinite(gw))return null;
  const benchmark=Number.isFinite(avg.goalAvg)?avg.goalAvg:fallbackTarget;
  if(!Number.isFinite(benchmark))return null;
  const delta=avg.avg-benchmark,dir=Math.sign(gw-sw);
  if(avg.n<3)return{state:'reference',delta,benchmark,title:'参考値'};
  if(Math.abs(delta)<=0.200001)return{state:'ontrack',delta,benchmark,title:'予定通り'};
  const ahead=dir<0?delta<0:delta>0;
  return{state:ahead?'ahead':'behind',delta,benchmark,title:`${Math.abs(delta).toFixed(1)}kg${ahead?'先行':'遅れ'}`};
}

ahTrendStatus=function(avg,target){
  const p=rollingPace(avg,target);
  if(!p)return'グラフを見る';
  return p.title;
};

function ui70TidyHome(){
  $('ahAdd')?.remove();
  if($('version'))$('version').textContent=`Health Score v${HOME_TIDY_VERSION}`;
}

function ui70MovingAverageLabels(){
  if(activeView!=='home')return;
  const avg=recentWeightAverage();if(!avg)return;
  const label=`${avg.n}日平均`;
  const weightMetric=[...document.querySelectorAll('#appleHome .ah-metric')]
    .find(b=>b.querySelector('.ah-metric-top')?.textContent.includes('体重'));
  const metricSub=weightMetric?.querySelector('.ah-metric-sub');
  if(metricSub)metricSub.textContent=`${label} ${avg.avg.toFixed(1)} kg`;
  const trend=$('ahTrend'),main=trend?.querySelector('.ah-trend-main b'),sub=trend?.querySelector('.ah-trend-main span');
  if(main)main.textContent=`${label} ${avg.avg.toFixed(1)} kg`;
  if(sub)sub.textContent=Number.isFinite(avg.goalAvg)?`同期間の目標平均 ${avg.goalAvg.toFixed(1)} kg`:'目標ラインを設定すると比較できます';
}

if(typeof renderAppleHome==='function'){
  const ui70CoreRenderAppleHome=renderAppleHome;
  renderAppleHome=function(){
    ui70CoreRenderAppleHome();
    $('ahAdd')?.remove();
    ui70MovingAverageLabels();
  };
}

/* Home pace card: compare moving average against the target average for the
   exact same measured dates, not against today's single target value. */
if(typeof appendWeightPace==='function'){
  appendWeightPace=function(){
    const box=$('weightProgress'),p=st.settings,avg=recentWeightAverage();
    if(!box||!avg||!Number.isFinite(avg.goalAvg)||!Number.isFinite(+p.startWeight)||!Number.isFinite(+p.goalWeight))return;
    box.querySelector('.pace')?.remove();
    const pace=rollingPace(avg,avg.goalAvg);
    let text='参考値',cls='neutral';
    if(pace?.state==='ahead'){text=`同期間の目標平均より ${Math.abs(pace.delta).toFixed(1)} kg先行`;cls='good'}
    else if(pace?.state==='behind'){text=`同期間の目標平均より ${Math.abs(pace.delta).toFixed(1)} kg遅れ`;cls='warn'}
    else if(pace?.state==='ontrack'){text='ほぼ予定通り'}
    const fc=typeof weightForecast==='function'?weightForecast():null;
    box.insertAdjacentHTML('beforeend',`<div class="pace ${cls}"><b>${avg.n}日平均：${text}</b>${fc?`<span>現在の傾向からの参考到達日：${fmtShort(fc)}ごろ</span>`:'<span>到達日予測は14日以上のデータがたまると表示します。</span>'}</div>`);
  };
}

/* Graph trend reading: use the same moving-average benchmark as Home. */
if(typeof graphPaceText==='function'){
  graphPaceText=function(stats){
    const avg=recentWeightAverage(),todayTarget=targetWeightForDate(today());
    if(!avg)return{title:'判定待ち',note:'体重データが増えると目標ラインとの差を表示します。',cls:''};
    const pace=rollingPace(avg,todayTarget);
    if(!pace)return{title:'判定待ち',note:'目標体重と期間を設定すると目標ペースを判定できます。',cls:''};
    const label=`${avg.n}日平均`;
    const goalLabel=Number.isFinite(avg.goalAvg)?`同期間の目標平均 ${avg.goalAvg.toFixed(1)} kg`:'目標ライン';
    if(pace.state==='reference')return{title:'参考値',note:`${label}は ${avg.avg.toFixed(1)} kg。3回以上の測定からペース判定を表示します。`,cls:''};
    if(pace.state==='ahead')return{title:`${Math.abs(pace.delta).toFixed(1)} kg先行`,note:`${label}が${goalLabel}より良い位置です。`,cls:'good'};
    if(pace.state==='behind')return{title:`${Math.abs(pace.delta).toFixed(1)} kg遅れ`,note:`${label}を${goalLabel}と比較しています。単日値ではなく移動平均で確認します。`,cls:'warn'};
    return{title:'ほぼ予定通り',note:`${label}と${goalLabel}の差は ${Math.abs(pace.delta).toFixed(1)} kg です。`,cls:'good'};
  };
}

/* Graph summary: before seven measurements exist, call it n-day average rather
   than '7-day average (n days)'. */
if(typeof graphRenderSummary==='function'){
  const ui70CoreGraphRenderSummary=graphRenderSummary;
  graphRenderSummary=function(stats){
    ui70CoreGraphRenderSummary(stats);
    const cards=[...document.querySelectorAll('#graphSummary .graph-stat')];
    const avg=recentWeightAverage();
    if(cards[1]&&avg){
      const label=cards[1].querySelector('.label');
      const value=cards[1].querySelector('.value');
      if(label)label.textContent=`${avg.n}日平均`;
      if(value)value.innerHTML=`${avg.avg.toFixed(1)}<span class="unit">kg</span>`;
    }
  };
}

function ui70FixGraph(){
  const legend=[...document.querySelectorAll('#chart .graph-legend span')].find(x=>x.classList.contains('avg'));
  const avg=recentWeightAverage();
  if(legend&&avg){
    const icon=legend.querySelector('i');
    legend.textContent=avg.n<7?`${avg.n}日平均`:'7日平均';
    if(icon)legend.prepend(icon);
  }
  /* The top summary already shows both change-from-start and kg-to-goal.
     A percentage progress bar is redundant and too sensitive to one weigh-in. */
  const progress=$('graphProgress');
  if(progress){progress.innerHTML='';progress.style.display='none'}
}

if(typeof chart==='function'){
  const ui70CoreChart=chart;
  chart=function(){ui70CoreChart();ui70FixGraph()};
}

const ui70CoreGoto=goto;
goto=function(id){ui70CoreGoto(id);if(id==='chart')setTimeout(ui70FixGraph,0)};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

document.addEventListener('DOMContentLoaded',()=>{
  if(typeof renderAppleHome==='function'&&activeView==='home')renderAppleHome();
  ui70TidyHome();
  ui70FixGraph();
});
