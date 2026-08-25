'use strict';

const GRAPH084_VERSION='0.6.31';

function g84EmphasizeTrend(){
  const box=$('chartbox'),svg=box?.querySelector('svg');
  if(svg){
    svg.querySelectorAll('polyline[stroke="#19a65b"]').forEach(el=>{
      el.setAttribute('stroke-width','5.2');
      el.setAttribute('opacity','1');
    });
    svg.querySelectorAll('polyline[stroke="#ff6a00"]').forEach(el=>{
      el.setAttribute('stroke-width','1.5');
      el.setAttribute('opacity','.30');
    });
    svg.querySelectorAll('circle[fill="#ff6a00"]').forEach(el=>{
      el.setAttribute('r','3.2');
      el.setAttribute('opacity','.42');
    });
  }

  const summary=$('graphSummary');
  if(summary){
    const cards=[...summary.children];
    const avg=cards.find(el=>el.querySelector('.label')?.textContent?.startsWith('7日平均'));
    const latest=cards.find(el=>el.querySelector('.label')?.textContent==='最新');
    if(avg){
      avg.classList.add('g84-average-primary');
      if(avg!==summary.firstElementChild)summary.insertBefore(avg,summary.firstElementChild);
    }
    latest?.classList.add('g84-latest-secondary');
  }

  const legend=$('chart')?.querySelector('.graph-legend');
  if(legend){
    [...legend.querySelectorAll('span')].forEach(el=>{
      const t=el.textContent?.trim()||'';
      if(t==='実測')el.classList.add('g84-actual-legend');
      if(t==='7日平均')el.classList.add('g84-average-legend');
    });
  }

  const help=$('chartHelp');
  if(help&&help.innerHTML&&!help.innerHTML.includes('緑の太線＝7日移動平均')){
    help.innerHTML=`<b>緑の太線＝7日移動平均（トレンド）</b>。橙の細線・点＝日々の実測値、灰色の破線＝目標ライン。<br>${help.innerHTML}`;
  }
}

const g84CoreChart=chart;
chart=function(){
  g84CoreChart();
  g84EmphasizeTrend();
};

const g84CoreGoto=goto;
goto=function(id){
  g84CoreGoto(id);
  if(id==='chart')setTimeout(g84EmphasizeTrend,0);
  if($('version'))$('version').textContent=`Health Score v${GRAPH084_VERSION}`;
};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

document.addEventListener('DOMContentLoaded',()=>{
  if(activeView==='chart')chart();
  g84EmphasizeTrend();
  if($('version'))$('version').textContent=`Health Score v${GRAPH084_VERSION}`;
});

(()=>{
  if(document.querySelector('script[data-ui-v086]'))return;
  const s=document.createElement('script');
  s.src='ui-v086.js?v=089';
  s.async=false;
  s.dataset.uiV086='1';
  document.head.appendChild(s);
})();
