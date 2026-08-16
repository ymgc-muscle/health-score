'use strict';

const GRAPH073_VERSION='0.6.13';

/* Remove the always-visible latest-weight badge. The interactive cursor now
   provides actual / rolling-average / target values on demand. */
function g73RemoveLatestBadge(){
  const svg=$('chartbox')?.querySelector('svg');
  if(!svg)return;
  [...svg.querySelectorAll(':scope > g:not(#g71Cursor)')].forEach(g=>{
    if(g.querySelector('rect[fill="#fff3e8"]'))g.remove();
  });
}

/* Tap close to a measured point to show its bubble. Tap empty plot space to
   dismiss it. Horizontal dragging still scrubs through the nearest points. */
g71BindCursor=function(svg,actual,X,Y,geom){
  if(!svg||!actual.length)return;
  const {W,H,L,R,T,B}=geom;
  let pointer=null;
  const cursor=svg.querySelector('#g71Cursor'),line=svg.querySelector('#g71CursorLine'),ring=svg.querySelector('#g71CursorRing');
  const rect=svg.querySelector('#g71BubbleRect'),dateText=svg.querySelector('#g71BubbleDate');
  const actualLabel=svg.querySelector('#g71ActualLabel'),actualValue=svg.querySelector('#g71ActualValue');
  const avgLabel=svg.querySelector('#g71AvgLabel'),avgValue=svg.querySelector('#g71AvgValue');
  const targetLabel=svg.querySelector('#g71TargetLabel'),targetValue=svg.querySelector('#g71TargetValue');

  function svgCoords(clientX,clientY){
    const r=svg.getBoundingClientRect();
    return{
      x:(clientX-r.left)/Math.max(1,r.width)*W,
      y:(clientY-r.top)/Math.max(1,r.height)*H
    };
  }
  function nearestX(clientX){
    const sx=svgCoords(clientX,0).x;
    return actual.reduce((best,p)=>Math.abs(X(p.d)-sx)<Math.abs(X(best.d)-sx)?p:best,actual[0]);
  }
  function nearest2D(clientX,clientY){
    const s=svgCoords(clientX,clientY);
    let best=actual[0],dist=Infinity;
    actual.forEach(p=>{
      const d=Math.hypot(X(p.d)-s.x,Y(p.w)-s.y);
      if(d<dist){best=p;dist=d}
    });
    return{p:best,dist};
  }
  function hide(){if(cursor)cursor.style.display='none'}
  function showPoint(p){
    if(!p||!cursor)return;
    const px=X(p.d),py=Y(p.w),bw=166,bh=92;
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
    pointer={x:ev.clientX,y:ev.clientY,scrubbing:false};
    if(ev.pointerType!=='touch')svg.setPointerCapture?.(ev.pointerId);
  });
  svg.addEventListener('pointermove',ev=>{
    if(!pointer)return;
    const dx=ev.clientX-pointer.x,dy=ev.clientY-pointer.y;
    if(!pointer.scrubbing&&Math.hypot(dx,dy)>=6&&Math.abs(dx)>Math.abs(dy)*1.1)pointer.scrubbing=true;
    if(pointer.scrubbing)showPoint(nearestX(ev.clientX));
  });
  svg.addEventListener('pointerup',ev=>{
    if(!pointer)return;
    const wasScrubbing=pointer.scrubbing;
    pointer=null;
    if(wasScrubbing){
      showPoint(nearestX(ev.clientX));
      return;
    }
    const hit=nearest2D(ev.clientX,ev.clientY);
    /* About a 20px finger target on a typical phone, expressed in viewBox units. */
    if(hit.dist<=38)showPoint(hit.p);else hide();
  });
  svg.addEventListener('pointercancel',()=>{pointer=null});
};

const g73CoreChart=chart;
chart=function(){
  g73CoreChart();
  g73RemoveLatestBadge();
};

const g73CoreGoto=goto;
goto=function(id){
  g73CoreGoto(id);
  if(id==='chart')setTimeout(g73RemoveLatestBadge,0);
  if($('version'))$('version').textContent=`Health Score v${GRAPH073_VERSION}`;
};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

document.addEventListener('DOMContentLoaded',()=>{
  if(activeView==='chart')chart();
  g73RemoveLatestBadge();
  if($('version'))$('version').textContent=`Health Score v${GRAPH073_VERSION}`;
});
