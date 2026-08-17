'use strict';

const GRAPH071_VERSION='0.6.11';
const G71_WD=['日','月','火','水','木','金','土'];

function g71DateLabel(ds){
  const d=dateObj(ds);
  return `${d.getMonth()+1}/${d.getDate()}(${G71_WD[d.getDay()]})`;
}
function g71AxisDateLabel(ds){
  const d=dateObj(ds);
  return `${d.getMonth()+1}/${d.getDate()}`;
}
function g71Days(a,b){return Math.round((dateObj(b)-dateObj(a))/86400000)}
function g71FirstMonday(ds){
  const d=dateObj(ds),add=(8-d.getDay())%7;
  d.setDate(d.getDate()+add);
  return localDateString(d);
}
function g71EvenTicks(start,end,maxTicks=5){
  const span=Math.max(0,g71Days(start,end));
  if(span===0)return[start];
  const count=Math.min(maxTicks,span+1);
  const out=[];
  for(let i=0;i<count;i++){
    const offset=Math.round(span*i/(count-1));
    out.push(graphDateAdd(start,offset));
  }
  return [...new Set(out)];
}
function g71TickDates(range){
  const span=Math.max(0,g71Days(range.start,range.dataEnd));

  if(span<=16)return g71EvenTicks(range.start,range.dataEnd,5);

  if(span<=45){
    const out=[];
    let d=g71FirstMonday(range.start);
    while(d<=range.dataEnd){
      out.push(d);
      d=graphDateAdd(d,7);
    }
    if(!out.length||g71Days(range.start,out[0])>=4)out.unshift(range.start);
    const last=out.at(-1);
    if(!last||g71Days(last,range.dataEnd)>=4)out.push(range.dataEnd);
    return [...new Set(out)].sort();
  }

  return g71EvenTicks(range.start,range.dataEnd,5);
}
function g71TooltipSvg(){
  return `<g id="g71Cursor" style="display:none;pointer-events:none">
    <line id="g71CursorLine" x1="0" x2="0" y1="0" y2="0" stroke="#9aa0a6" stroke-width="1.4" stroke-dasharray="4 4"/>
    <circle id="g71CursorRing" cx="0" cy="0" r="8" fill="#fff" stroke="#ff6a00" stroke-width="3"/>
    <g id="g71Bubble">
      <rect id="g71BubbleRect" x="0" y="0" width="126" height="48" rx="11" fill="#fff" stroke="#d7dade"/>
      <text id="g71BubbleDate" x="0" y="0" font-size="12" font-weight="700" fill="#697078"></text>
      <text id="g71BubbleWeight" x="0" y="0" font-size="17" font-weight="900" fill="#222"></text>
    </g>
  </g>`;
}
function g71BindCursor(svg,actual,X,Y,geom){
  if(!svg||!actual.length)return;
  const {W,H,L,R,T,B}=geom;
  let dragging=false;
  const cursor=svg.querySelector('#g71Cursor'),line=svg.querySelector('#g71CursorLine'),ring=svg.querySelector('#g71CursorRing');
  const rect=svg.querySelector('#g71BubbleRect'),dateText=svg.querySelector('#g71BubbleDate'),weightText=svg.querySelector('#g71BubbleWeight');
  function nearest(clientX){
    const r=svg.getBoundingClientRect();
    const sx=(clientX-r.left)/Math.max(1,r.width)*W;
    return actual.reduce((best,p)=>Math.abs(X(p.d)-sx)<Math.abs(X(best.d)-sx)?p:best,actual[0]);
  }
  function show(clientX){
    const p=nearest(clientX),px=X(p.d),py=Y(p.w),bw=126,bh=48;
    let bx=Math.max(L+4,Math.min(W-R-bw-4,px-bw/2));
    let by=py-bh-15;if(by<T+2)by=py+15;
    cursor.style.display='block';
    line.setAttribute('x1',px);line.setAttribute('x2',px);line.setAttribute('y1',T);line.setAttribute('y2',H-B);
    ring.setAttribute('cx',px);ring.setAttribute('cy',py);
    rect.setAttribute('x',bx);rect.setAttribute('y',by);
    dateText.setAttribute('x',bx+11);dateText.setAttribute('y',by+17);dateText.textContent=g71DateLabel(p.d);
    weightText.setAttribute('x',bx+11);weightText.setAttribute('y',by+38);weightText.textContent=`${p.w.toFixed(1)} kg`;
  }
  svg.addEventListener('pointerdown',ev=>{
    dragging=true;show(ev.clientX);
    if(ev.pointerType!=='touch')svg.setPointerCapture?.(ev.pointerId);
  });
  svg.addEventListener('pointermove',ev=>{
    if(ev.pointerType==='mouse'||dragging)show(ev.clientX);
  });
  svg.addEventListener('pointerup',ev=>{if(dragging)show(ev.clientX);dragging=false});
  svg.addEventListener('pointercancel',()=>{dragging=false});
  svg.addEventListener('pointerleave',ev=>{if(ev.pointerType==='mouse'&&!dragging)cursor.style.display='none'});
}

chart=function(){
  const buttons=document.querySelectorAll('#graphRange [data-range]');
  buttons.forEach(b=>b.classList.toggle('on',b.dataset.range===graph061Range));
  const points=graphWeightPoints(),range=graphRangeDates(points),stats=graphSelectedStats(points,range);
  graphRenderSummary(stats);graphRenderInsights(points,stats,range);
  const box=$('chartbox'),help=$('chartHelp');if(!box)return;
  if(!stats.actual.length){
    box.innerHTML='<div class="graph-empty">この期間には体重記録がありません。<br>期間を切り替えるか、体重を入力してください。</div>';
    help.textContent='';
    if(typeof ui70FixGraph==='function')ui70FixGraph();
    return;
  }

  const avgAll=graphAvgSeries(points),avg=avgAll.filter(p=>p.d>=range.start&&p.d<=range.dataEnd),targets=graphTargetSegments(range);
  const yvals=[...stats.actual.map(x=>x.w),...avg.map(x=>x.w),...targets.flatMap(x=>[x.aw,x.bw]).filter(Number.isFinite)];
  const span=Math.max(...yvals)-Math.min(...yvals),step=graphNiceStep(Math.max(span,1));
  const ymin=Math.floor((Math.min(...yvals)-.45)/step)*step,ymax=Math.ceil((Math.max(...yvals)+.45)/step)*step;
  /* Keep a real right-side gutter so the newest point is comfortably tappable on phones. */
  const W=680,H=370,L=55,R=50,T=25,B=58,startD=dateObj(range.start),endD=dateObj(range.end),total=Math.max(1,(endD-startD)/86400000);
  const X=d=>L+clamp((dateObj(d)-startD)/86400000,0,total)/total*(W-L-R);
  const Y=w=>T+(ymax-w)/(ymax-ymin)*(H-T-B);

  let hgrid='';
  for(let v=ymin;v<=ymax+.0001;v+=step){
    hgrid+=`<line x1="${L}" y1="${Y(v)}" x2="${W-R}" y2="${Y(v)}" stroke="#e7e9ec" stroke-width="1"/><text x="${L-8}" y="${Y(v)+5}" font-size="13" font-weight="650" text-anchor="end" fill="#616870">${v.toFixed(1)}</text>`;
  }

  const tickDates=g71TickDates(range);
  let vgrid='',ticks='';
  tickDates.forEach(ds=>{
    const x=X(ds),isEnd=ds===range.dataEnd;
    const edgeLeft=Math.abs(x-L)<1,edgeRight=Math.abs(x-(W-R))<1;
    const anchor=edgeLeft?'start':edgeRight?'end':'middle';
    vgrid+=`<line x1="${x}" y1="${T}" x2="${x}" y2="${H-B}" stroke="${isEnd?'#d9dde1':'#eef0f2'}" stroke-width="1" ${isEnd?'':'stroke-dasharray="3 5"'}/>`;
    ticks+=`<text x="${x}" y="${H-24}" font-size="12.5" font-weight="700" text-anchor="${anchor}" fill="${isEnd?'#333':'#667078'}">${g71AxisDateLabel(ds)}</text>`;
  });

  const actualPts=stats.actual.map(x=>`${X(x.d)},${Y(x.w)}`).join(' '),avgPts=avg.map(x=>`${X(x.d)},${Y(x.w)}`).join(' ');
  const targetSvg=targets.map(s=>`<line x1="${X(s.a)}" y1="${Y(s.aw)}" x2="${X(s.b)}" y2="${Y(s.bw)}" stroke="#8b9197" stroke-width="2" stroke-dasharray="7 6"/>`).join('');
  const circles=stats.actual.map(x=>`<circle cx="${X(x.d)}" cy="${Y(x.w)}" r="5.2" fill="#ff6a00" stroke="#fff" stroke-width="2"/>`).join('');
  const latest=stats.actual.at(-1);
  const latestLabel=latest?`<g pointer-events="none"><rect x="${Math.min(W-84,Math.max(L+2,X(latest.d)-35))}" y="${Math.max(2,Y(latest.w)-35)}" width="70" height="25" rx="8" fill="#fff3e8" stroke="#ffb57d"/><text x="${Math.min(W-49,Math.max(L+37,X(latest.d)))}" y="${Math.max(19,Y(latest.w)-18)}" font-size="13" font-weight="900" text-anchor="middle" fill="#d85600">${latest.w.toFixed(1)} kg</text></g>`:'';

  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="体重推移グラフ。点をタップまたは横になぞると日付と体重を確認できます。">${hgrid}${vgrid}${targetSvg}${avg.length>1?`<polyline points="${avgPts}" fill="none" stroke="#19a65b" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>`:''}${stats.actual.length>1?`<polyline points="${actualPts}" fill="none" stroke="#ff6a00" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>`:''}${circles}${latestLabel}${ticks}<text x="10" y="18" font-size="12" font-weight="700" fill="#737980">kg</text>${g71TooltipSvg()}<rect class="g71-hit" x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent"/></svg>`;

  const svg=box.querySelector('svg');
  const hit=svg?.querySelector('.g71-hit'),cursor=svg?.querySelector('#g71Cursor');
  if(hit&&cursor)cursor.before(hit);
  g71BindCursor(svg,stats.actual,X,Y,{W,H,L,R,T,B});

  const targetNow=targetWeightForDate(today());
  help.innerHTML=`<b>横軸の日付は表示期間に応じて間引いています</b>。正確な日付は点をタップ、またはグラフ上を横になぞって確認できます。<br>表示期間：${g71DateLabel(range.start)}〜${g71DateLabel(range.dataEnd)}　記録 ${stats.actual.length}日${Number.isFinite(targetNow)?`　今日の目標ライン ${targetNow.toFixed(1)} kg`:''}`;
  if(typeof ui70FixGraph==='function')ui70FixGraph();
};

const g71CoreGoto=goto;
goto=function(id){g71CoreGoto(id);if($('version'))$('version').textContent=`Health Score v${GRAPH071_VERSION}`};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

document.addEventListener('DOMContentLoaded',()=>{
  if(activeView==='chart')chart();
  if($('version'))$('version').textContent=`Health Score v${GRAPH071_VERSION}`;
});
