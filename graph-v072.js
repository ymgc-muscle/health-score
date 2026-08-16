'use strict';

const GRAPH072_VERSION='0.6.12';

/* Rich graph cursor: show the three values represented by the chart at the
   selected measurement date — actual, rolling average, and target line. */
g71TooltipSvg=function(){
  return `<g id="g71Cursor" style="display:none;pointer-events:none">
    <line id="g71CursorLine" x1="0" x2="0" y1="0" y2="0" stroke="#9aa0a6" stroke-width="1.4" stroke-dasharray="4 4"/>
    <circle id="g71CursorRing" cx="0" cy="0" r="8" fill="#fff" stroke="#ff6a00" stroke-width="3"/>
    <g id="g71Bubble">
      <rect id="g71BubbleRect" x="0" y="0" width="166" height="92" rx="12" fill="#fff" stroke="#d7dade"/>
      <text id="g71BubbleDate" x="0" y="0" font-size="12.5" font-weight="800" fill="#4f565d"></text>
      <text id="g71ActualLabel" x="0" y="0" font-size="12" font-weight="750" fill="#d85600">実測</text>
      <text id="g71ActualValue" x="0" y="0" font-size="13" font-weight="900" text-anchor="end" fill="#d85600"></text>
      <text id="g71AvgLabel" x="0" y="0" font-size="12" font-weight="750" fill="#168c4d"></text>
      <text id="g71AvgValue" x="0" y="0" font-size="13" font-weight="900" text-anchor="end" fill="#168c4d"></text>
      <text id="g71TargetLabel" x="0" y="0" font-size="12" font-weight="750" fill="#6f767d">目標ライン</text>
      <text id="g71TargetValue" x="0" y="0" font-size="13" font-weight="900" text-anchor="end" fill="#6f767d"></text>
    </g>
  </g>`;
};

g71BindCursor=function(svg,actual,X,Y,geom){
  if(!svg||!actual.length)return;
  const {W,H,L,R,T,B}=geom;
  let dragging=false;
  const cursor=svg.querySelector('#g71Cursor'),line=svg.querySelector('#g71CursorLine'),ring=svg.querySelector('#g71CursorRing');
  const rect=svg.querySelector('#g71BubbleRect'),dateText=svg.querySelector('#g71BubbleDate');
  const actualLabel=svg.querySelector('#g71ActualLabel'),actualValue=svg.querySelector('#g71ActualValue');
  const avgLabel=svg.querySelector('#g71AvgLabel'),avgValue=svg.querySelector('#g71AvgValue');
  const targetLabel=svg.querySelector('#g71TargetLabel'),targetValue=svg.querySelector('#g71TargetValue');

  function nearest(clientX){
    const r=svg.getBoundingClientRect();
    const sx=(clientX-r.left)/Math.max(1,r.width)*W;
    return actual.reduce((best,p)=>Math.abs(X(p.d)-sx)<Math.abs(X(best.d)-sx)?p:best,actual[0]);
  }

  function show(clientX){
    const p=nearest(clientX),px=X(p.d),py=Y(p.w),bw=166,bh=92;
    const avg=typeof recentWeightAverage==='function'?recentWeightAverage(p.d):null;
    const target=typeof targetWeightForDate==='function'?targetWeightForDate(p.d):null;
    let bx=Math.max(L+4,Math.min(W-R-bw-4,px-bw/2));
    let by=py-bh-15;
    if(by<T+2)by=py+15;
    by=Math.max(T+2,Math.min(H-B-bh-2,by));

    cursor.style.display='block';
    line.setAttribute('x1',px);line.setAttribute('x2',px);line.setAttribute('y1',T);line.setAttribute('y2',H-B);
    ring.setAttribute('cx',px);ring.setAttribute('cy',py);
    rect.setAttribute('x',bx);rect.setAttribute('y',by);

    dateText.setAttribute('x',bx+12);dateText.setAttribute('y',by+18);dateText.textContent=g71DateLabel(p.d);

    actualLabel.setAttribute('x',bx+12);actualLabel.setAttribute('y',by+40);
    actualValue.setAttribute('x',bx+bw-12);actualValue.setAttribute('y',by+40);actualValue.textContent=`${p.w.toFixed(1)} kg`;

    avgLabel.setAttribute('x',bx+12);avgLabel.setAttribute('y',by+61);avgLabel.textContent=avg?`${avg.n}日平均`:'移動平均';
    avgValue.setAttribute('x',bx+bw-12);avgValue.setAttribute('y',by+61);avgValue.textContent=avg?`${avg.avg.toFixed(1)} kg`:'--';

    targetLabel.setAttribute('x',bx+12);targetLabel.setAttribute('y',by+82);
    targetValue.setAttribute('x',bx+bw-12);targetValue.setAttribute('y',by+82);targetValue.textContent=Number.isFinite(target)?`${target.toFixed(1)} kg`:'--';
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
};

const g72CoreGoto=goto;
goto=function(id){
  g72CoreGoto(id);
  if($('version'))$('version').textContent=`Health Score v${GRAPH072_VERSION}`;
};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

document.addEventListener('DOMContentLoaded',()=>{
  if(activeView==='chart')chart();
  if($('version'))$('version').textContent=`Health Score v${GRAPH072_VERSION}`;
});
