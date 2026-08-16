'use strict';

const NAV_VERSION='0.6.7';
const UI67_ORDER=['home','input','calendar','chart','settings'];

/* ---------- Keep v0.6.6 information architecture ---------- */
function ui67HiddenStash(){
  let stash=$('ui66HiddenLogic');
  if(!stash){
    stash=document.createElement('div');
    stash.id='ui66HiddenLogic';
    stash.hidden=true;
    $('settings')?.appendChild(stash);
  }
  return stash;
}

function ui67ArrangeInfo(){
  const input=$('input'),calendar=$('calendar'),chart=$('chart'),settings=$('settings');
  if(!input||!calendar||!chart||!settings)return;

  const criteriaCard=$('allCriteria')?.closest('.card');
  const stash=ui67HiddenStash();
  if(criteriaCard&&stash&&criteriaCard.parentElement!==stash)stash.appendChild(criteriaCard);
  $('ui65Rules')?.remove();

  const weeklyCard=$('weekly')?.closest('.card');
  let weekly=$('ui66WeeklyAnalysis');
  if(!weekly){
    weekly=document.createElement('div');
    weekly.id='ui66WeeklyAnalysis';
    weekly.className='card ui66-weekly-analysis';
    weekly.innerHTML=`<div class="ui66-weekly-head"><span class="ui66-weekly-icon">${uiIcon('chart')}</span><div><div class="title">週間サマリー</div><div class="sub">直近7日の記録</div></div></div><div class="ui66-weekly-body"></div>`;
    const calendarCard=[...calendar.querySelectorAll(':scope>.card')].find(c=>c.querySelector('#cal'));
    if(calendarCard)calendarCard.after(weekly);else calendar.appendChild(weekly);
  }
  if(weeklyCard&&weeklyCard.parentElement!==weekly.querySelector('.ui66-weekly-body')){
    weekly.querySelector('.ui66-weekly-body').appendChild(weeklyCard);
    weeklyCard.classList.add('ui66-weekly-card');
  }
  $('ui65WeeklyAnalysis')?.remove();

  const head=settings.querySelector(':scope>.ui-page-head .ui-page-sub');
  if(head)head.textContent='変更できる項目だけをまとめています。';
  const menu=settings.querySelector('.ui64-advanced-menu');
  menu?.querySelectorAll('.ui64-settings-item').forEach(item=>{
    const card=item.querySelector('.card');
    if(!card||card.querySelector('#allCriteria')||card.querySelector('#weekly'))item.remove();
  });

  if($('version'))$('version').textContent=`Health Score v${NAV_VERSION}`;
}

if(typeof ui65MoveReadOnlyInfo==='function')ui65MoveReadOnlyInfo=ui67ArrangeInfo;

const ui67CoreFillDetail=fillDetail;
fillDetail=function(d=$('date').value){ui67CoreFillDetail(d);ui67ArrangeInfo()};

const ui67CoreFillSettings=fillSettings;
fillSettings=function(){ui67CoreFillSettings();ui67ArrangeInfo()};

const ui67CoreRenderWeekly=renderWeekly;
renderWeekly=function(){ui67CoreRenderWeekly();ui67ArrangeInfo()};

const ui67CoreRenderCalendar=renderCalendar;
renderCalendar=function(){ui67CoreRenderCalendar();ui67ArrangeInfo()};

const ui67CoreGoto=goto;
goto=function(id){ui67CoreGoto(id);ui67ArrangeInfo()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

/* ---------- Interactive, finger-tracking page swipe ---------- */
let ui67Touch=null;
let ui67Stage=null;
let ui67SuppressClickUntil=0;

function ui67InteractiveTarget(target){
  return !!target.closest('input,textarea,select,[contenteditable="true"],.chartbox,.graph-main-card svg');
}

function ui67PrepareView(id){
  if(id==='home')renderHome();
  else if(id==='input')fillDetail($('date').value||today());
  else if(id==='calendar')renderCalendar();
  else if(id==='chart')chart();
  else if(id==='settings')fillSettings();
  ui67ArrangeInfo();
}

function ui67SyncControls(source,clone){
  const a=source.querySelectorAll('input,textarea,select'),b=clone.querySelectorAll('input,textarea,select');
  a.forEach((el,i)=>{
    const c=b[i];if(!c)return;
    if('value'in el)c.value=el.value;
    if('checked'in el)c.checked=el.checked;
  });
}

function ui67PageClone(id,scrollY,role){
  const source=$(id),page=document.createElement('div'),inner=document.createElement('div');
  const clone=source.cloneNode(true);
  ui67SyncControls(source,clone);
  clone.classList.add('on');
  clone.setAttribute('aria-hidden','true');
  page.className=`ui67-page ui67-${role}`;
  inner.className='ui67-page-inner';
  inner.style.transform=`translate3d(0,${-Math.max(0,scrollY)}px,0)`;
  inner.appendChild(clone);page.appendChild(inner);
  return page;
}

function ui67CreateStage(targetId,direction){
  if(ui67Stage)return ui67Stage;
  ui67PrepareView(targetId);
  const stage=document.createElement('div');stage.className='ui67-stage';
  const current=ui67PageClone(activeView,window.scrollY,'current');
  const target=ui67PageClone(targetId,0,'target');
  stage.append(current,target);document.body.appendChild(stage);
  const width=window.innerWidth;
  const side=direction==='left'?1:-1;
  target.style.transform=`translate3d(${side*width}px,0,0)`;
  ui67Stage={el:stage,current,target,targetId,direction,width,dx:0};
  document.body.classList.add('ui67-swiping');
  return ui67Stage;
}

function ui67DestroyStage(){
  if(!ui67Stage)return;
  ui67Stage.el.remove();ui67Stage=null;
  document.body.classList.remove('ui67-swiping');
}

function ui67Paint(dx){
  const s=ui67Stage;if(!s)return;
  const w=s.width,side=s.direction==='left'?1:-1;
  const progress=Math.min(1,Math.abs(dx)/w);
  s.dx=dx;
  s.current.style.transform=`translate3d(${dx}px,0,0)`;
  s.target.style.transform=`translate3d(${side*w+dx}px,0,0)`;
  s.current.style.opacity=String(1-progress*.10);
  s.target.style.opacity=String(.88+progress*.12);
}

function ui67Finish(commit){
  const s=ui67Stage;if(!s)return;
  const side=s.direction==='left'?1:-1;
  s.el.classList.add('ui67-settling');
  if(commit){
    s.current.style.transform=`translate3d(${-side*s.width}px,0,0)`;
    s.target.style.transform='translate3d(0,0,0)';
    s.current.style.opacity='.82';s.target.style.opacity='1';
    ui67SuppressClickUntil=Date.now()+420;
    setTimeout(()=>{const id=s.targetId;ui67DestroyStage();goto(id)},245);
  }else{
    s.current.style.transform='translate3d(0,0,0)';
    s.target.style.transform=`translate3d(${side*s.width}px,0,0)`;
    s.current.style.opacity='1';s.target.style.opacity='.88';
    setTimeout(ui67DestroyStage,205);
  }
}

function ui67BoundaryResistance(dx){return Math.sign(dx)*Math.min(42,Math.abs(dx)*.18)}

document.addEventListener('touchstart',ev=>{
  if(ev.touches.length!==1||ui67InteractiveTarget(ev.target)){ui67Touch=null;return}
  const t=ev.touches[0],edge=24;
  if(t.clientX<edge||t.clientX>window.innerWidth-edge){ui67Touch=null;return}
  ui67Touch={x:t.clientX,y:t.clientY,lastX:t.clientX,lastTime:performance.now(),time:performance.now(),lock:null,targetId:null,direction:null,boundary:false};
},{passive:true});

document.addEventListener('touchmove',ev=>{
  if(!ui67Touch||ev.touches.length!==1)return;
  const t=ev.touches[0],dx=t.clientX-ui67Touch.x,dy=t.clientY-ui67Touch.y;

  if(!ui67Touch.lock){
    if(Math.abs(dx)<9&&Math.abs(dy)<9)return;
    if(Math.abs(dy)>Math.abs(dx)*1.08){ui67Touch.lock='vertical';return}
    if(Math.abs(dx)<=Math.abs(dy)*1.12)return;
    ui67Touch.lock='horizontal';
    const i=UI67_ORDER.indexOf(activeView),ni=dx<0?i+1:i-1;
    ui67Touch.boundary=ni<0||ni>=UI67_ORDER.length;
    if(!ui67Touch.boundary){
      ui67Touch.targetId=UI67_ORDER[ni];ui67Touch.direction=dx<0?'left':'right';
      ui67CreateStage(ui67Touch.targetId,ui67Touch.direction);
    }
  }
  if(ui67Touch.lock!=='horizontal')return;
  ev.preventDefault();
  ui67SuppressClickUntil=Date.now()+180;
  if(ui67Touch.boundary)return;

  const sign=ui67Touch.direction==='left'?-1:1;
  const sameDirection=dx*sign>0;
  const painted=sameDirection?Math.max(-ui67Stage.width,Math.min(ui67Stage.width,dx)):ui67BoundaryResistance(dx);
  ui67Paint(painted);
  ui67Touch.lastX=t.clientX;ui67Touch.lastTime=performance.now();
},{passive:false});

document.addEventListener('touchend',ev=>{
  if(!ui67Touch||ev.changedTouches.length!==1){ui67Touch=null;return}
  const state=ui67Touch,t=ev.changedTouches[0];ui67Touch=null;
  if(state.lock!=='horizontal'||state.boundary||!ui67Stage){ui67DestroyStage();return}
  const dx=t.clientX-state.x,dt=Math.max(1,performance.now()-state.time),velocity=dx/dt,w=ui67Stage.width;
  const sameDirection=(state.direction==='left'&&dx<0)||(state.direction==='right'&&dx>0);
  const commit=sameDirection&&(Math.abs(dx)>=Math.max(86,w*.30)||(Math.abs(dx)>=45&&Math.abs(velocity)>=.55));
  ui67Finish(commit);
},{passive:true});

document.addEventListener('touchcancel',()=>{ui67Touch=null;if(ui67Stage)ui67Finish(false)},{passive:true});

document.addEventListener('click',ev=>{
  if(Date.now()<ui67SuppressClickUntil){ev.preventDefault();ev.stopPropagation()}
},true);

document.addEventListener('DOMContentLoaded',()=>{
  ui67ArrangeInfo();
  if($('version'))$('version').textContent=`Health Score v${NAV_VERSION}`;
});
