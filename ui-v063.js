'use strict';

const UI_VERSION='0.6.3';

document.body.classList.add('ui-clean');

function uiIcon(name){
  const p={
    home:'<path d="M4 11.5 12 5l8 6.5V20h-6v-5h-4v5H4z"/>',
    edit:'<path d="M5 19h4l10-10-4-4L5 15zM13.5 6.5l4 4"/>',
    calendar:'<path d="M5 6h14v14H5zM8 3v6M16 3v6M5 10h14"/>',
    chart:'<path d="M4 18V6M4 18h16M7 14l4-4 3 2 5-6"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 14.8 6L14.5 3h-5l-.3 3A7 7 0 0 0 7.5 7.1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A7 7 0 0 0 9.2 18l.3 3h5l.3-3a7 7 0 0 0 1.7-1.1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z"/>',
    weight:'<path d="M5 8.5a7 7 0 0 1 14 0v8.5H5zM12 8.5l2.7-2.3M8 17h8"/>',
    flame:'<path d="M13.2 3.5c.5 3-1.4 4.2-2.5 5.8-1.1 1.5-1 3.3.4 4.2-3.7-.6-4.7-3.7-3.5-6.3C5 9.1 4.7 12 5.8 14.5A6.7 6.7 0 0 0 12 18.5a6.5 6.5 0 0 0 6.4-6.6c0-3.7-2.5-6.5-5.2-8.4z"/>',
    protein:'<path d="M5 9v6M8 7v10M16 7v10M19 9v6M8 12h8"/>',
    steps:'<path d="M9.4 4.2c1.2.5 1.4 2.2.7 3.8S8 10.5 6.8 10s-1.4-2.2-.7-3.8 2.1-2.5 3.3-2zM15.2 13.2c1.2.5 1.4 2.2.7 3.8s-2.1 2.5-3.3 2-1.4-2.2-.7-3.8 2.1-2.5 3.3-2z"/>',
    breakfast:'<path d="M5 15h14M7 15v-4a5 5 0 0 1 10 0v4M12 3v2M5.6 5.6l1.4 1.4M18.4 5.6 17 7"/>',
    lunch:'<path d="M5 10h14l-1 7H6zM8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2"/>',
    buying:'<path d="M6 8h12l-1 11H7zM9 8V6a3 3 0 0 1 6 0v2"/>',
    dinner:'<path d="M6 5v5a2 2 0 0 0 2 2v7M10 5v5M15 5v14M15 5c3 1 4 3 4 6h-4"/>',
    hiit:'<path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 8l-3 3-3-1M9 11l2 3-3 5M11 14l4 3M15 6l2 3 3-1"/>',
    note:'<path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4"/>',
    target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
    backup:'<path d="M12 4v11M8 8l4-4 4 4M5 14v5h14v-5"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${p[name]||''}</svg>`;
}

function addPageHead(section,kicker,title,sub){
  if(!section||section.querySelector(':scope>.ui-page-head'))return;
  const h=document.createElement('div');h.className='ui-page-head';
  h.innerHTML=`<div class="ui-kicker">${kicker}</div><h1>${title}</h1>${sub?`<div class="ui-page-sub">${sub}</div>`:''}`;
  section.prepend(h);
}
function addTitleIcon(el,name){
  if(!el||el.querySelector('.ui-title-icon'))return;
  const icon=document.createElement('span');icon.className='ui-title-icon';icon.innerHTML=uiIcon(name);el.prepend(icon);el.classList.add('ui-title-row');
}
function decorateNav(){
  const map={home:'home',input:'edit',calendar:'calendar',chart:'chart',settings:'settings'};
  document.querySelectorAll('nav button').forEach(b=>{const holder=b.querySelector('b');if(holder)holder.innerHTML=uiIcon(map[b.dataset.v]||'home')});
}

function inputDateKicker(){
  const d=$('date')?.value||today();return d===today()?'今日':fmtShort(d);
}
function updateInputHead(){
  const head=$('input')?.querySelector(':scope>.ui-page-head');if(head){const k=head.querySelector('.ui-kicker');if(k)k.textContent=inputDateKicker()}
}
function decorateInput(){
  const section=$('input');if(!section)return;
  addPageHead(section,inputDateKicker(),'記録','必要な項目だけ入力。評価基準は各項目を開くと確認できます。');updateInputHead();
  const dateCard=$('date')?.closest('.card'),scoreCard=$('liveScore')?.closest('.card');
  if(dateCard)dateCard.classList.add('ui-date-card');if(scoreCard)scoreCard.classList.add('ui-score-card');
  if(dateCard&&scoreCard&&!section.querySelector('.ui-input-overview')){
    const wrap=document.createElement('div');wrap.className='ui-input-overview';dateCard.before(wrap);wrap.append(dateCard,scoreCard);
  }
  const weightCard=$('weight')?.closest('.card'),actualCard=$('caloriesActual')?.closest('.card'),memoCard=$('memo')?.closest('.card');
  weightCard?.classList.add('ui-weight-card');actualCard?.classList.add('ui-actual-card');memoCard?.classList.add('ui-memo-card');
  addTitleIcon(weightCard?.querySelector('.title'),'weight');addTitleIcon(actualCard?.querySelector('.title'),'flame');addTitleIcon(memoCard?.querySelector('.title'),'note');
  const iconMap={breakfast:'breakfast',lunch:'lunch',buying:'buying',dinner:'dinner',protein:'protein',steps:'steps',hiit:'hiit'};
  section.querySelectorAll('.ratecard').forEach(card=>{
    const k=card.dataset.field||card.querySelector('[data-k]')?.dataset.k;
    const title=card.querySelector('.acc-title');if(title&&k&&!title.querySelector('.ui-title-icon')){const i=document.createElement('span');i.className='ui-title-icon';i.innerHTML=uiIcon(iconMap[k]||'edit');title.prepend(i)}
  });
}

function decorateCalendar(){
  const section=$('calendar');if(!section)return;
  addPageHead(section,'履歴','カレンダー','点数よりも、続けて記録できているかを確認します。');
  const card=[...section.querySelectorAll(':scope>.card')].find(c=>c.querySelector('#cal'));
  if(!card)return;
  const stats=card.querySelector('.cal-stats'),cal=card.querySelector('.calendar'),head=card.querySelector('.cal-head');
  if(stats&&cal&&stats.nextElementSibling!==cal)card.insertBefore(stats,cal);
  if(head&&!head.querySelector('.ui-title-icon')){
    const title=head.querySelector('.cal-title');if(title)title.classList.add('ui-calendar-title');
  }
}

function decorateGraph(){
  const section=$('chart');if(!section)return;
  section.classList.add('ui-graph');
}

function decorateSettings(){
  const section=$('settings');if(!section)return;
  addPageHead(section,'Health Score','設定','普段は基本設定だけ。細かな配点やバックアップは詳細設定にまとめています。');
  const cards=[...section.querySelectorAll(':scope>.card')];
  cards.forEach(card=>{
    const t=card.querySelector('.title')?.textContent||'';
    if(t.startsWith('FOCUS'))card.classList.add('ui-settings-focus');
    else if(t.includes('体重目標'))addTitleIcon(card.querySelector('.title'),'target');
    else if(t.includes('健康目標'))addTitleIcon(card.querySelector('.title'),'flame');
  });
  const guide=$('targetGuide');
  if(guide&&!guide.closest('.ui-guide-details')){
    const d=document.createElement('details');d.className='ui-guide-details';d.innerHTML='<summary>自動計算される目安</summary>';guide.before(d);d.appendChild(guide);
  }
  const adv=section.querySelector('details.settings-advanced');
  if(adv){
    [...adv.querySelectorAll('.card')].forEach(card=>{
      const t=card.querySelector('.title')?.textContent||'';
      if(t.includes('スコア配点'))addTitleIcon(card.querySelector('.title'),'target');
      else if(t.includes('評価基準'))addTitleIcon(card.querySelector('.title'),'edit');
      else if(t.includes('週間'))addTitleIcon(card.querySelector('.title'),'chart');
      else if(card.querySelector('#export'))card.classList.add('ui-backup-card');
    });
  }
}

const uiCoreFillDetail=fillDetail;
fillDetail=function(d=$('date').value){uiCoreFillDetail(d);decorateInput()};
const uiCoreRenderCalendar=renderCalendar;
renderCalendar=function(){uiCoreRenderCalendar();decorateCalendar()};
const uiCoreFillSettings=fillSettings;
fillSettings=function(){uiCoreFillSettings();decorateSettings()};

const uiCoreGoto=goto;
goto=function(id){uiCoreGoto(id);if(id==='input'){decorateInput();updateInputHead()}else if(id==='calendar')decorateCalendar();else if(id==='chart')decorateGraph();else if(id==='settings')decorateSettings()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

document.addEventListener('DOMContentLoaded',()=>{
  decorateNav();decorateInput();decorateCalendar();decorateGraph();decorateSettings();
  $('date')?.addEventListener('change',updateInputHead);
  if($('version'))$('version').textContent=`Health Score v${UI_VERSION}`;
});
