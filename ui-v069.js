'use strict';

const MOVING_AVG_VERSION='0.6.9';

/* Rolling weight average: use measurements in the latest 7 calendar days.
   Before seven measurements exist, expose the actual sample count (n-day avg).
   Goal pace is compared against the average target for those same dates. */
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

ahTrendStatus=function(avg,target){
  const sw=+st.settings.startWeight,gw=+st.settings.goalWeight;
  if(!avg||!Number.isFinite(sw)||!Number.isFinite(gw))return'グラフを見る';
  if(avg.n<3)return'参考値';
  const benchmark=Number.isFinite(avg.goalAvg)?avg.goalAvg:target;
  if(!Number.isFinite(benchmark))return'グラフを見る';
  const delta=avg.avg-benchmark,dir=Math.sign(gw-sw);
  if(Math.abs(delta)<=0.200001)return'予定通り';
  const ahead=dir<0?delta<0:delta>0;
  return `${Math.abs(delta).toFixed(1)}kg${ahead?'先行':'遅れ'}`;
};

function ui69FixMovingAverageLabels(){
  if(activeView!=='home')return;
  const avg=recentWeightAverage();
  if(!avg)return;
  const label=`${avg.n}日平均`;

  const weightMetric=[...document.querySelectorAll('#appleHome .ah-metric')]
    .find(b=>b.querySelector('.ah-metric-top')?.textContent.includes('体重'));
  const metricSub=weightMetric?.querySelector('.ah-metric-sub');
  if(metricSub)metricSub.textContent=`${label} ${avg.avg.toFixed(1)} kg`;

  const trend=$('ahTrend');
  const main=trend?.querySelector('.ah-trend-main b');
  const sub=trend?.querySelector('.ah-trend-main span');
  if(main)main.textContent=`${label} ${avg.avg.toFixed(1)} kg`;
  if(sub){
    sub.textContent=Number.isFinite(avg.goalAvg)
      ?`同期間の目標平均 ${avg.goalAvg.toFixed(1)} kg`
      :'目標ラインを設定すると比較できます';
  }
}

if(typeof renderAppleHome==='function'){
  const ui69CoreRenderAppleHome=renderAppleHome;
  renderAppleHome=function(){
    ui69CoreRenderAppleHome();
    ui69FixMovingAverageLabels();
  };
}

/* The older weight-progress helper also compared the rolling mean with today's
   target. Override only its added pace line so the same-period benchmark is used. */
if(typeof appendWeightPace==='function'){
  appendWeightPace=function(){
    const box=$('weightProgress'),p=st.settings,avg=recentWeightAverage();
    if(!box||!avg||!Number.isFinite(avg.goalAvg)||!Number.isFinite(+p.startWeight)||!Number.isFinite(+p.goalWeight))return;
    const old=box.querySelector('.pace');if(old)old.remove();
    const dir=Math.sign(+p.goalWeight-+p.startWeight),delta=avg.avg-avg.goalAvg;
    let text='参考値',cls='neutral';
    if(avg.n>=3){
      const ahead=dir<0?delta<-.200001:delta>.200001;
      const behind=dir<0?delta>.200001:delta<-.200001;
      text=ahead?`同期間の目標平均より ${Math.abs(delta).toFixed(1)} kg先行`:behind?`同期間の目標平均より ${Math.abs(delta).toFixed(1)} kg遅れ`:'ほぼ予定通り';
      cls=ahead?'good':behind?'warn':'neutral';
    }
    const fc=typeof weightForecast==='function'?weightForecast():null;
    box.insertAdjacentHTML('beforeend',`<div class="pace ${cls}"><b>${avg.n}日平均：${text}</b>${fc?`<span>現在の傾向からの参考到達日：${fmtShort(fc)}ごろ</span>`:'<span>到達日予測は14日以上のデータがたまると表示します。</span>'}</div>`);
  };
}

document.addEventListener('DOMContentLoaded',()=>{
  if(typeof renderAppleHome==='function'&&activeView==='home')renderAppleHome();
  if($('version'))$('version').textContent=`Health Score v${MOVING_AVG_VERSION}`;
});
