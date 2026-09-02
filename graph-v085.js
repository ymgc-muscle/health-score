'use strict';

const GRAPH085_VERSION='0.6.33';
const G85_Y_STEP=0.5;

function g85TickDates(start,dataEnd,plotEnd,forecastEnd){
  const span=Math.max(0,g71Days(start,plotEnd));
  const step=span<=32?4:span<=70?7:Math.max(7,Math.round(span/6));
  const out=[start,dataEnd,plotEnd];
  let d=graphDateAdd(start,step);
  while(d<plotEnd){out.push(d);d=graphDateAdd(d,step)}
  if(forecastEnd&&forecastEnd>=start&&forecastEnd<=plotEnd)out.push(forecastEnd);
  return [...new Set(out)].sort();
}

function g85YAxis(yvals){
  const rawMin=Math.min(...yvals),rawMax=Math.max(...yvals);
  let ymin=Math.floor(rawMin/G85_Y_STEP)*G85_Y_STEP;
  let ymax=Math.ceil(rawMax/G85_Y_STEP)*G85_Y_STEP;
  // 下側は最低プロット値へ寄せ、上側だけ少し呼吸できる余白を残す。
  ymax+=G85_Y_STEP;
  if(ymax-ymin<1.5)ymax=ymin+1.5;
  return{ymin,ymax,step:G85_Y_STEP};
}

chart=function(){
  const buttons=document.querySelectorAll('#graphRange [data-range]');
  buttons.forEach(b=>b.classList.toggle('on',b.dataset.range===graph061Range));
  const points=graphWeightPoints(),range=graphRangeDates(points),stats=graphSelectedStats(points,range);
  graphRenderSummary(stats);graphRenderInsights(points,stats,range);g71EnsureForecastLegend();
  const box=$('chartbox'),help=$('chartHelp');if(!box)return;
  if(!stats.actual.length){
    box.innerHTML='<div class="graph-empty">この期間には体重記録がありません。<br>期間を切り替えるか、体重を入力してください。</div>';
    help.textContent='';
    if(typeof ui70FixGraph==='function')ui70FixGraph();
    return;
  }

  const avgAll=graphAvgSeries(points),avg=avgAll.filter(p=>p.d>=range.start&&p.d<=range.dataEnd);
  const forecast=g71ForecastModel(points),plotEnd=g71ForecastPlotEnd(range,forecast),plotRange={...range,end:plotEnd};
  const targets=graphTargetSegments(plotRange);
  const forecastEndDate=forecast?(forecast.goalDate<=plotEnd?forecast.goalDate:plotEnd):null;
  const forecastEndWeight=forecast&&forecastEndDate?forecast.startWeight+forecast.slope*g71Days(forecast.startDate,forecastEndDate):null;

  const yvals=[...stats.actual.map(x=>x.w),...avg.map(x=>x.w),...targets.flatMap(x=>[x.aw,x.bw]).filter(Number.isFinite)];
  if(forecast&&Number.isFinite(forecastEndWeight))yvals.push(forecast.startWeight,forecastEndWeight);
  const {ymin,ymax,step}=g85YAxis(yvals);

  const W=680,H=370,L=55,R=50,T=25,B=58,startD=dateObj(range.start),endD=dateObj(plotEnd),total=Math.max(1,(endD-startD)/86400000);
  const X=d=>L+clamp((dateObj(d)-startD)/86400000,0,total)/total*(W-L-R);
  const Y=w=>T+(ymax-w)/(ymax-ymin)*(H-T-B);

  let hgrid='';
  for(let v=ymin;v<=ymax+.0001;v+=step){
    const isBase=Math.abs(v-ymin)<.001;
    hgrid+=`<line x1="${L}" y1="${Y(v)}" x2="${W-R}" y2="${Y(v)}" stroke="${isBase?'#d4d8dc':'#e7e9ec'}" stroke-width="${isBase?'1.3':'1'}"/><text x="${L-8}" y="${Y(v)+5}" font-size="13" font-weight="650" text-anchor="end" fill="#616870">${v.toFixed(1)}</text>`;
  }

  const tickDates=g85TickDates(range.start,range.dataEnd,plotEnd,forecast?.goalDate||null);
  let vgrid='',ticks='';
  tickDates.forEach(ds=>{
    const x=X(ds),isToday=ds===range.dataEnd,isEnd=ds===plotEnd;
    const edgeLeft=Math.abs(x-L)<1,edgeRight=Math.abs(x-(W-R))<1;
    const anchor=edgeLeft?'start':edgeRight?'end':'middle';
    vgrid+=`<line x1="${x}" y1="${T}" x2="${x}" y2="${H-B}" stroke="${isToday?'#c7ccd2':isEnd?'#d9dde1':'#eef0f2'}" stroke-width="${isToday?'1.3':'1'}" ${isToday||isEnd?'':'stroke-dasharray="3 5"'}/>`;
    ticks+=`<text x="${x}" y="${H-24}" font-size="11.8" font-weight="${isToday?'850':'700'}" text-anchor="${anchor}" fill="${isToday?'#555':isEnd?'#333':'#667078'}">${g71AxisDateLabel(ds)}</text>`;
  });

  const actualPts=stats.actual.map(x=>`${X(x.d)},${Y(x.w)}`).join(' '),avgPts=avg.map(x=>`${X(x.d)},${Y(x.w)}`).join(' ');
  const targetSvg=targets.map(s=>`<line x1="${X(s.a)}" y1="${Y(s.aw)}" x2="${X(s.b)}" y2="${Y(s.bw)}" stroke="#8b9197" stroke-width="2" stroke-dasharray="7 6"/>`).join('');
  const forecastSvg=forecast&&forecastEndDate&&Number.isFinite(forecastEndWeight)?`<line x1="${X(forecast.startDate)}" y1="${Y(forecast.startWeight)}" x2="${X(forecastEndDate)}" y2="${Y(forecastEndWeight)}" stroke="${G71_FORECAST_COLOR}" stroke-width="3.2" stroke-dasharray="10 7" stroke-linecap="round"/>${forecast.goalDate<=plotEnd?`<circle cx="${X(forecast.goalDate)}" cy="${Y(forecast.goalWeight)}" r="4.4" fill="#fff" stroke="${G71_FORECAST_COLOR}" stroke-width="2.5"/>`:''}`:'';
  const todayMarker=plotEnd>range.dataEnd?`<text x="${Math.min(W-R-4,X(range.dataEnd)+6)}" y="${T+14}" font-size="11.5" font-weight="800" fill="#727981">今日</text>`:'';
  const circles=stats.actual.map(x=>`<circle cx="${X(x.d)}" cy="${Y(x.w)}" r="5.2" fill="#ff6a00" stroke="#fff" stroke-width="2"/>`).join('');

  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="体重推移グラフ。緑は7日移動平均、青の破線は現在のペースからの達成見込みです。未来側にも日付目盛りを表示し、縦軸は0.5kg刻みです。">${hgrid}${vgrid}${targetSvg}${todayMarker}${forecastSvg}${avg.length>1?`<polyline points="${avgPts}" fill="none" stroke="#19a65b" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>`:''}${stats.actual.length>1?`<polyline points="${actualPts}" fill="none" stroke="#ff6a00" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>`:''}${circles}${ticks}<text x="10" y="18" font-size="12" font-weight="700" fill="#737980">kg</text>${g71TooltipSvg()}<rect class="g71-hit" x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent"/></svg>`;

  const svg=box.querySelector('svg');
  const hit=svg?.querySelector('.g71-hit'),cursor=svg?.querySelector('#g71Cursor');
  if(hit&&cursor)cursor.before(hit);
  g71BindCursor(svg,stats.actual,X,Y,{W,H,L,R,T,B});

  const targetNow=targetWeightForDate(today());
  const forecastText=forecast?`　現在ペース ${forecast.weeklyRate>=0?'+':''}${forecast.weeklyRate.toFixed(2)} kg/週　参考到達日 ${g71AxisDateLabel(forecast.goalDate)}`:'';
  help.innerHTML=`<b>未来側にも日付目盛りを表示し、縦軸は0.5 kg刻みです</b>。縦軸の下限は実測・平均・目標・見込みの最低値へ寄せています。<br>実績期間：${g71DateLabel(range.start)}〜${g71DateLabel(range.dataEnd)}　記録 ${stats.actual.length}日${Number.isFinite(targetNow)?`　今日の目標ライン ${targetNow.toFixed(1)} kg`:''}${forecastText}`;
  if(typeof g84EmphasizeTrend==='function')g84EmphasizeTrend();
  if(typeof ui70FixGraph==='function')ui70FixGraph();
  if($('version'))$('version').textContent=`Health Score v${GRAPH085_VERSION}`;
};

function g85Init(){
  if(typeof activeView!=='undefined'&&activeView==='chart')chart();
  if($('version'))$('version').textContent=`Health Score v${GRAPH085_VERSION}`;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',g85Init);else g85Init();
