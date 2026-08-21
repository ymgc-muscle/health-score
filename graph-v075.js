'use strict';

const GRAPH075_VERSION='0.6.23';

function g75MonthIndex(ds){
  const d=dateObj(ds);
  return d.getFullYear()*12+d.getMonth();
}
function g75MonthStart(year,month){
  return localDateString(new Date(year,month,1));
}
function g75AddMonths(ds,n){
  const d=dateObj(ds);
  return g75MonthStart(d.getFullYear(),d.getMonth()+n);
}
function g75MonthTicks(range){
  const start=range.start;
  const end=range.end||range.dataEnd;
  const months=Math.max(0,g75MonthIndex(end)-g75MonthIndex(start));
  const candidates=[1,2,3,4,6,12,24];
  const maxTicks=7;
  const step=candidates.find(n=>Math.floor(months/n)+2<=maxTicks)||24;
  const out=[start];

  const s=dateObj(start);
  let d=g75MonthStart(s.getFullYear(),s.getMonth()+1);
  let monthOffset=1;
  while(d<=end){
    if(monthOffset%step===0)out.push(d);
    monthOffset++;
    d=g75AddMonths(d,1);
  }

  return [...new Set(out)].filter(ds=>ds>=start&&ds<=end).sort();
}

const g75CoreAxisDateLabel=g71AxisDateLabel;
g71AxisDateLabel=function(ds){
  if(graph061Range!=='all')return g75CoreAxisDateLabel(ds);
  const d=dateObj(ds);
  if(d.getMonth()===0)return `${d.getFullYear()}/1`;
  return `${d.getMonth()+1}月`;
};

g71TickDates=function(range){
  const start=range.start;
  const end=range.end||range.dataEnd;
  const span=Math.max(0,g71Days(start,end));

  if(graph061Range==='all')return g75MonthTicks(range);
  if(span<=16)return g71EvenTicks(start,end,5);
  if(span<=45){
    const out=[];
    let d=g71FirstMonday(start);
    while(d<=end){out.push(d);d=graphDateAdd(d,7)}
    if(!out.length||g71Days(start,out[0])>=4)out.unshift(start);
    const last=out.at(-1);
    if(!last||g71Days(last,end)>=4)out.push(end);
    return [...new Set(out)].sort();
  }
  return g71EvenTicks(start,end,5);
};

function g75LoadScript(src,marker){
  return new Promise((resolve,reject)=>{
    let script=document.querySelector(`script[data-${marker}]`);
    if(script){
      if(script.dataset.loaded==='1'){resolve();return}
      script.addEventListener('load',()=>resolve(),{once:true});
      script.addEventListener('error',()=>reject(new Error(`${marker} load failed`)),{once:true});
      return;
    }
    script=document.createElement('script');
    script.src=src;script.async=false;script.setAttribute(`data-${marker}`,'1');
    script.addEventListener('load',()=>{script.dataset.loaded='1';resolve()},{once:true});
    script.addEventListener('error',()=>reject(new Error(`${marker} load failed`)),{once:true});
    document.head.appendChild(script);
  });
}

let g75NotifyLoadPromise=null;
function g75LoadNotifications(){
  if(g75NotifyLoadPromise)return g75NotifyLoadPromise;
  g75NotifyLoadPromise=(async()=>{
    if(!document.querySelector('link[data-notify-v079]')){
      const link=document.createElement('link');
      link.rel='stylesheet';link.href='notifications-v078.css?v=081';link.dataset.notifyV079='1';document.head.appendChild(link);
    }
    await g75LoadScript('notifications-v079.js?v=083','notify-v079');
    await g75LoadScript('notification-route-v081.js?v=083','notification-route-v081');
  })().catch(err=>console.error('Notification module load failed',err));
  return g75NotifyLoadPromise;
}

const g75CoreGoto=goto;
goto=function(id){
  g75CoreGoto(id);
  if($('version'))$('version').textContent=`Health Score v${GRAPH075_VERSION}`;
};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

document.addEventListener('DOMContentLoaded',()=>{
  if(activeView==='chart')chart();
  g75LoadNotifications();
  if($('version'))$('version').textContent=`Health Score v${GRAPH075_VERSION}`;
});

g75LoadNotifications();
