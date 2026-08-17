'use strict';

const GRAPH075_VERSION='0.6.15';

/*
 * X-axis tick fix for long / all-period ranges.
 * The graph's visible domain may extend beyond the last measured day (for
 * example to the goal date). Tick labels must therefore be distributed over
 * range.end, not compressed into range.dataEnd.
 */
g71TickDates=function(range){
  const start=range.start;
  const end=range.end || range.dataEnd;
  const span=Math.max(0,g71Days(start,end));

  /* Short ranges: no more than five labels across the visible width. */
  if(span<=16)return g71EvenTicks(start,end,5);

  /* Roughly one month: use calendar Mondays, with edge labels only when there
     is enough visual separation from the nearest weekly tick. */
  if(span<=45){
    const out=[];
    let d=g71FirstMonday(start);
    while(d<=end){
      out.push(d);
      d=graphDateAdd(d,7);
    }
    if(!out.length||g71Days(start,out[0])>=4)out.unshift(start);
    const last=out.at(-1);
    if(!last||g71Days(last,end)>=4)out.push(end);
    return [...new Set(out)].sort();
  }

  /* Long/all-period ranges: always spread a maximum of five labels across
     the entire visible domain. Exact dates remain available in the tooltip. */
  return g71EvenTicks(start,end,5);
};

const g75CoreGoto=goto;
goto=function(id){
  g75CoreGoto(id);
  if($('version'))$('version').textContent=`Health Score v${GRAPH075_VERSION}`;
};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

document.addEventListener('DOMContentLoaded',()=>{
  if(activeView==='chart')chart();
  if($('version'))$('version').textContent=`Health Score v${GRAPH075_VERSION}`;
});
