'use strict';

const GRAPH_VERSION='0.6.1';
let graph061Range=localStorage.getItem('health-score-graph-range')||'30';

(function prepareGraphPage(){
  const section=$('chart');
  if(!section)return;
  section.innerHTML=`
    <div class="graph-toolbar">
      <div><div class="title">体重トレンド</div><div class="sub">単日の増減より、平均と目標ラインで判断</div></div>
      <div class="graph-range" id="graphRange">
        <button type="button" data-range="14">2週間</button>
        <button type="button" data-range="30">1か月</button>
        <button type="button" data-range="all">全期間</button>
      </div>
    </div>
    <div class="graph-summary" id="graphSummary"></div>
    <div class="card graph-main-card">
      <div class="graph-legend"><span><i></i>実測</span><span class="avg"><i></i>7日平均</span><span class="target"><i></i>目標ライン</span></div>
      <div class="chart" id="chartbox"></div>
      <div class="graph-foot" id="chartHelp"></div>
    </div>
    <div class="card"><div class="title">トレンドの読み取り</div><div class="graph-insights" id="graphInsights" style="margin-top:10px"></div><div class="graph-progress" id="graphProgress"></div></div>`;
  section.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>{
    graph061Range=b.dataset.range;
    localStorage.setItem('health-score-graph-range',graph061Range);
    chart();
  });
  const v=$('version');if(v)v.textContent=`Health Score v${GRAPH_VERSION}`;
})();

function graphWeightPoints(){
  return Object.entries(st.entries)
    .filter(([,e])=>e?.weight!=null&&Number.isFinite(+e.weight))
    .map(([d,e])=>({d,w:+e.weight}))
    .sort((a,b)=>a.d.localeCompare(b.d));
}
function graphDateAdd(ds,n){const d=dateObj(ds);d.setDate(d.getDate()+n);return localDateString(d)}
function graphRangeDates(points){
  const end=today();
  if(graph061Range==='all'){
    const first=points[0]?.d||st.settings.startDate||end;
    const start=[first,st.settings.startDate].filter(Boolean).sort()[0]||end;
    const finish=[end,st.settings.goalDate].filter(Boolean).sort().at(-1)||end;
    return{start,end:finish,dataEnd:end};
  }
  const n=graph061Range==='14'?14:30;
  return{start:graphDateAdd(end,-(n-1)),end,dataEnd:end};
}
function graphAvgSeries(points){
  return points.map(p=>{
    const from=graphDateAdd(p.d,-6),vals=points.filter(x=>x.d>=from&&x.d<=p.d).map(x=>x.w);
    return{d:p.d,w:vals.reduce((a,b)=>a+b,0)/vals.length,n:vals.length};
  });
}
function graphAverageBetween(points,start,end){
  const vals=points.filter(p=>p.d>=start&&p.d<=end).map(p=>p.w);
  return vals.length?{avg:vals.reduce((a,b)=>a+b,0)/vals.length,n:vals.length}:null;
}
function graphSelectedStats(points,range){
  const actual=points.filter(p=>p.d>=range.start&&p.d<=range.dataEnd),latest=points.filter(p=>p.d<=today()).at(-1)||points.at(-1)||null;
  const avg7=graphAverageBetween(points,graphDateAdd(today(),-6),today());
  const prev7=graphAverageBetween(points,graphDateAdd(today(),-13),graphDateAdd(today(),-7));
  return{actual,latest,avg7,prev7};
}
function graphGoalRemaining(latest){
  const sw=+st.settings.startWeight,gw=+st.settings.goalWeight;if(!latest||!Number.isFinite(sw)||!Number.isFinite(gw))return{value:'--',unit:'',done:false};
  const dir=Math.sign(gw-sw),left=dir<0?latest.w-gw:gw-latest.w;
  if(Math.abs(latest.w-gw)<.05||left<=0)return{value:'達成',unit:'',done:true};
  return{value:Math.abs(left).toFixed(1),unit:'kg',done:false};
}
function graphRenderSummary(stats){
  const box=$('graphSummary'),latest=stats.latest,avg=stats.avg7,sw=+st.settings.startWeight,goal=graphGoalRemaining(latest),change=latest&&Number.isFinite(sw)?latest.w-sw:null;
  const goalGood=goal.done?' good':'';
  box.innerHTML=`
    <div class="graph-stat"><div class="label">最新</div><div class="value">${latest?latest.w.toFixed(1):'--'}<span class="unit">${latest?'kg':''}</span></div></div>
    <div class="graph-stat"><div class="label">7日平均${avg&&avg.n<7?` (${avg.n}日)`:''}</div><div class="value">${avg?avg.avg.toFixed(1):'--'}<span class="unit">${avg?'kg':''}</span></div></div>
    <div class="graph-stat ${change!=null&&((+st.settings.goalWeight<sw&&change<0)||(+st.settings.goalWeight>sw&&change>0))?'good':''}"><div class="label">開始から</div><div class="value">${change==null?'--':`${change>=0?'+':''}${change.toFixed(1)}`}<span class="unit">${change==null?'':'kg'}</span></div></div>
    <div class="graph-stat${goalGood}"><div class="label">目標まで</div><div class="value">${goal.value}<span class="unit">${goal.unit}</span></div></div>`;
}
function graphProgressPercent(latest){
  const sw=+st.settings.startWeight,gw=+st.settings.goalWeight;if(!latest||!Number.isFinite(sw)||!Number.isFinite(gw)||sw===gw)return null;
  return clamp((latest.w-sw)/(gw-sw)*100,0,100);
}
function graphPaceText(stats){
  const avg=stats.avg7,target=targetWeightForDate(today()),sw=+st.settings.startWeight,gw=+st.settings.goalWeight;
  if(!avg||!Number.isFinite(target)||!Number.isFinite(sw)||!Number.isFinite(gw))return{title:'判定待ち',note:'体重データが増えると目標ラインとの差を表示します。',cls:''};
  const delta=avg.avg-target,dir=Math.sign(gw-sw),ahead=dir<0?delta<-.2:delta>.2,behind=dir<0?delta>.2:delta<-.2;
  if(ahead)return{title:`${Math.abs(delta).toFixed(1)} kg先行`,note:`7日平均が今日の目標ラインより良い位置です。`,cls:'good'};
  if(behind)return{title:`${Math.abs(delta).toFixed(1)} kg遅れ`,note:`7日平均が今日の目標ラインから離れています。単日値ではなく数日で確認します。`,cls:'warn'};
  return{title:'ほぼ予定通り',note:`7日平均と今日の目標ラインの差は ${Math.abs(delta).toFixed(1)} kg です。`,cls:'good'};
}
function graphRenderInsights(points,stats,range){
  const box=$('graphInsights'),pace=graphPaceText(stats);
  let weekTitle='比較待ち',weekNote='前週分の記録が増えると比較できます。',weekCls='';
  if(stats.avg7&&stats.prev7){
    const d=stats.avg7.avg-stats.prev7.avg,sw=+st.settings.startWeight,gw=+st.settings.goalWeight,good=(gw<sw&&d<0)||(gw>sw&&d>0);
    weekTitle=`${d>=0?'+':''}${d.toFixed(1)} kg`;weekNote='直近7日平均 − その前7日平均';weekCls=good?'good':Math.abs(d)<.1?'':'warn';
  }
  const periodEnd=range.dataEnd,periodDays=Math.max(1,Math.round(daysBetween(range.start,periodEnd))+1),recordDays=stats.actual.length,density=Math.round(recordDays/periodDays*100);
  let forecastTitle='まだ算出しません',forecastNote='14日以上のデータがあると参考到達日を表示します。';
  if(typeof weightForecast==='function'){
    const f=weightForecast();if(f){forecastTitle=`${fmtShort(f)} ごろ`;forecastNote='最近の傾向を直線近似した参考値です。';}
  }
  box.innerHTML=`
    <div class="graph-insight ${weekCls}"><div class="label">前週との変化</div><b>${weekTitle}</b><span>${weekNote}</span></div>
    <div class="graph-insight ${pace.cls}"><div class="label">目標ペース</div><b>${pace.title}</b><span>${pace.note}</span></div>
    <div class="graph-insight"><div class="label">選択期間の記録</div><b>${recordDays}日 / ${periodDays}日</b><span>記録密度 ${density}%</span></div>
    <div class="graph-insight"><div class="label">参考到達日</div><b>${forecastTitle}</b><span>${forecastNote}</span></div>`;
  const prog=graphProgressPercent(stats.latest),pg=$('graphProgress');
  if(prog==null){pg.innerHTML='';return}
  pg.innerHTML=`<div class="graph-progress-head"><span>目標への進捗</span><b>${Math.round(prog)}%</b></div><div class="graph-progress-track"><i style="width:${prog}%"></i></div>`;
}
function graphNiceStep(span){if(span<=2.2)return .5;if(span<=5)return 1;if(span<=10)return 2;return 5}
function graphTargetSegments(range){
  const p=st.settings,sw=+p.startWeight,gw=+p.goalWeight;if(!p.startDate||!p.goalDate||!Number.isFinite(sw)||!Number.isFinite(gw))return[];
  const seg=[];
  const s=range.start<p.startDate?p.startDate:range.start,e=range.end>p.goalDate?p.goalDate:range.end;
  if(s<=e)seg.push({a:s,aw:targetWeightForDate(s),b:e,bw:targetWeightForDate(e),kind:'slope'});
  if(range.end>p.goalDate){const hs=range.start>p.goalDate?range.start:p.goalDate;if(hs<=range.end)seg.push({a:hs,aw:gw,b:range.end,bw:gw,kind:'flat'})}
  return seg;
}

chart=function(){
  const buttons=document.querySelectorAll('#graphRange [data-range]');buttons.forEach(b=>b.classList.toggle('on',b.dataset.range===graph061Range));
  const points=graphWeightPoints(),range=graphRangeDates(points),stats=graphSelectedStats(points,range);graphRenderSummary(stats);graphRenderInsights(points,stats,range);
  const box=$('chartbox'),help=$('chartHelp');if(!box)return;
  if(!stats.actual.length){box.innerHTML='<div class="graph-empty">この期間には体重記録がありません。<br>期間を切り替えるか、体重を入力してください。</div>';help.textContent='';return}
  const avgAll=graphAvgSeries(points),avg=avgAll.filter(p=>p.d>=range.start&&p.d<=range.dataEnd),targets=graphTargetSegments(range);
  const yvals=[...stats.actual.map(x=>x.w),...avg.map(x=>x.w),...targets.flatMap(x=>[x.aw,x.bw]).filter(Number.isFinite)];
  const span=Math.max(...yvals)-Math.min(...yvals),step=graphNiceStep(Math.max(span,1)),ymin=Math.floor((Math.min(...yvals)-.45)/step)*step,ymax=Math.ceil((Math.max(...yvals)+.45)/step)*step;
  const W=680,H=360,L=58,R=18,T=24,B=44,startD=dateObj(range.start),endD=dateObj(range.end),total=Math.max(1,(endD-startD)/86400000);
  const X=d=>L+clamp((dateObj(d)-startD)/86400000,0,total)/total*(W-L-R),Y=w=>T+(ymax-w)/(ymax-ymin)*(H-T-B);
  let grid='';for(let v=ymin;v<=ymax+.0001;v+=step){grid+=`<line x1="${L}" y1="${Y(v)}" x2="${W-R}" y2="${Y(v)}" stroke="#e6e8eb" stroke-width="1"/><text x="${L-9}" y="${Y(v)+5}" font-size="13" font-weight="650" text-anchor="end" fill="#616870">${v.toFixed(1)}</text>`}
  const tickCount=graph061Range==='14'?4:5;let ticks='';for(let i=0;i<tickCount;i++){const d=new Date(startD);d.setDate(d.getDate()+Math.round(total*i/(tickCount-1)));const ds=localDateString(d);ticks+=`<text x="${X(ds)}" y="${H-14}" font-size="12" font-weight="650" text-anchor="middle" fill="#616870">${fmtShort(ds)}</text>`}
  const actualPts=stats.actual.map(x=>`${X(x.d)},${Y(x.w)}`).join(' '),avgPts=avg.map(x=>`${X(x.d)},${Y(x.w)}`).join(' ');
  const targetSvg=targets.map(s=>`<line x1="${X(s.a)}" y1="${Y(s.aw)}" x2="${X(s.b)}" y2="${Y(s.bw)}" stroke="#858b91" stroke-width="2.2" stroke-dasharray="7 6"/>`).join('');
  const circles=stats.actual.map(x=>`<circle cx="${X(x.d)}" cy="${Y(x.w)}" r="4.2" fill="#ff6a00"><title>${x.d}  ${x.w.toFixed(1)} kg</title></circle>`).join('');
  const latest=stats.actual.at(-1),latestLabel=latest?`<g><rect x="${Math.min(W-83,Math.max(L+2,X(latest.d)-34))}" y="${Math.max(2,Y(latest.w)-34)}" width="68" height="24" rx="8" fill="#fff3e8" stroke="#ffb57d"/><text x="${Math.min(W-49,Math.max(L+36,X(latest.d)))}" y="${Math.max(18,Y(latest.w)-18)}" font-size="13" font-weight="900" text-anchor="middle" fill="#d85600">${latest.w.toFixed(1)} kg</text></g>`:'';
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="体重推移グラフ">${grid}${targetSvg}${avg.length>1?`<polyline points="${avgPts}" fill="none" stroke="#19a65b" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>`:''}${stats.actual.length>1?`<polyline points="${actualPts}" fill="none" stroke="#ff6a00" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`:''}${circles}${latestLabel}${ticks}<text x="11" y="18" font-size="12" font-weight="700" fill="#737980">kg</text></svg>`;
  const targetNow=targetWeightForDate(today());help.innerHTML=`表示期間：<b>${fmtShort(range.start)}〜${fmtShort(range.dataEnd)}</b>　記録 ${stats.actual.length}日${Number.isFinite(targetNow)?`　今日の目標ライン <b>${targetNow.toFixed(1)} kg</b>`:''}。点を長押しすると日付と体重を確認できます。`;
};

const graphCoreRenderAll=renderAll;
renderAll=function(){graphCoreRenderAll();if(activeView==='chart')chart()};

const graphCoreGoto=goto;
goto=function(id){graphCoreGoto(id);if(id==='chart')chart()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));
