'use strict';

const WAIST_VERSION='0.6.25';

function w83Store(){
  if(!st.waistMeasurements||typeof st.waistMeasurements!=='object'||Array.isArray(st.waistMeasurements))st.waistMeasurements={};
  return st.waistMeasurements;
}
function w83WeekendRange(ds){
  if(!ds)return null;
  const d=dateObj(ds),dow=d.getDay();
  if(dow!==0&&dow!==6)return null;
  const sat=new Date(d);if(dow===0)sat.setDate(sat.getDate()-1);
  const sun=new Date(sat);sun.setDate(sun.getDate()+1);
  return{sat:localDateString(sat),sun:localDateString(sun)};
}
function w83WeekendMeasurement(ds){
  const range=w83WeekendRange(ds);if(!range)return null;
  const store=w83Store();
  for(const d of [range.sat,range.sun]){
    const v=store[d];
    if(v!==''&&v!=null&&Number.isFinite(+v))return{date:d,value:+v,range};
  }
  return{date:null,value:null,range};
}
function w83PreviousMeasurement(beforeDate){
  const rows=Object.entries(w83Store())
    .filter(([d,v])=>d<beforeDate&&v!==''&&v!=null&&Number.isFinite(+v))
    .map(([date,value])=>({date,value:+value}))
    .sort((a,b)=>b.date.localeCompare(a.date));
  return rows[0]||null;
}
function w83Delta(current,previous){
  if(!Number.isFinite(current)||!previous||!Number.isFinite(previous.value))return'';
  const d=Math.round((current-previous.value)*10)/10;
  if(Math.abs(d)<.05)return'±0.0 cm';
  return`${d<0?'−':'+'}${Math.abs(d).toFixed(1)} cm`;
}
function w83PreviousText(current,range){
  const prev=w83PreviousMeasurement(range.sat);
  if(!prev)return'前回データはまだありません';
  return `前回 ${prev.value.toFixed(1)} cm${Number.isFinite(current)?`　${w83Delta(current,prev)}`:''}`;
}
function w83OpenToday(){
  if($('date'))$('date').value=today();
  if(typeof fillDetail==='function')fillDetail(today());
  goto('input');
  setTimeout(()=>scrollToField('waist'),60);
}
function w83RenderHome(){
  const box=$('appleHome');if(!box)return;
  const measure=w83WeekendMeasurement(today()),old=$('w83WaistHome');
  if(!measure){old?.remove();return}
  let card=old;
  if(!card){
    card=document.createElement('button');card.type='button';card.id='w83WaistHome';card.className='w83-waist-home';
    const anchor=$('ui82Next')||box.querySelector('.ah-score-card');anchor?.insertAdjacentElement('afterend',card);
  }
  const has=Number.isFinite(measure.value),main=has?`${measure.value.toFixed(1)} cm ✓`:'まだ測っていません';
  const sub=has?w83PreviousText(measure.value,measure.range):'土日のどちらか1回・朝の同じ条件で';
  card.innerHTML=`<span class="w83-kicker">WEEKEND</span><span class="w83-title">今週の腹囲</span><span class="w83-value ${has?'done':''}">${main}</span><span class="w83-sub">${sub}</span><span class="w83-go">${has?'編集':'腹囲を記録'} ›</span>`;
  card.onclick=w83OpenToday;
}
function w83Save(ds,raw){
  const range=w83WeekendRange(ds);if(!range)return;
  const store=w83Store(),value=String(raw??'').trim();
  if(value!==''){
    const n=+value;
    if(!Number.isFinite(n)||n<40||n>200){toast('腹囲は40〜200cmの範囲で入力してください');w83RenderInput(ds);return}
    delete store[range.sat];delete store[range.sun];
    store[ds]=Math.round(n*10)/10;
    saveState();toast('腹囲を保存しました');
  }else{
    delete store[range.sat];delete store[range.sun];
    saveState();toast('腹囲の記録を削除しました');
  }
  w83RenderInput(ds);
  if(ds===today())w83RenderHome();
}
function w83RenderInput(ds){
  const inputView=$('input');if(!inputView)return;
  const measure=w83WeekendMeasurement(ds),old=$('w83WaistInput');
  if(!measure){old?.remove();return}
  let card=old;
  if(!card){
    card=document.createElement('div');card.id='w83WaistInput';card.className='card w83-waist-input';card.dataset.field='waist';
    const weightCard=inputView.querySelector('[data-field="weight"]');weightCard?.insertAdjacentElement('afterend',card);
  }
  const has=Number.isFinite(measure.value),prev=w83PreviousMeasurement(measure.range.sat);
  card.innerHTML=`<div class="w83-input-head"><div><div class="title">腹囲（週末のみ）</div><div class="sub">Health Scoreの100点には影響しません</div></div><span class="w83-badge">週1回</span></div><div class="help w83-help">土日のどちらか1回。起床後・トイレ後・飲食前など、毎回なるべく同じ条件で測ります。</div><div class="field w83-field"><label>腹囲 (cm)</label><input id="waist" type="number" min="40" max="200" step="0.1" inputmode="decimal" value="${has?measure.value.toFixed(1):''}" placeholder="例 92.3"></div><div class="w83-prev">${prev?`前回 ${prev.value.toFixed(1)} cm${has?`　${w83Delta(measure.value,prev)}`:''}`:'初回の測定です'}</div>`;
  $('waist').onchange=e=>w83Save(ds,e.target.value);
}

if(typeof renderAppleHome==='function'){
  const w83CoreRenderAppleHome=renderAppleHome;
  renderAppleHome=function(){w83CoreRenderAppleHome();w83RenderHome()};
}
if(typeof fillDetail==='function'){
  const w83CoreFillDetail=fillDetail;
  fillDetail=function(d=$('date').value){w83CoreFillDetail(d);w83RenderInput(d)};
}
if(typeof goto==='function'){
  const w83CoreGoto=goto;
  goto=function(id){
    w83CoreGoto(id);
    if(id==='input')w83RenderInput($('date').value||today());
    if(id==='home')w83RenderHome();
    if($('version'))$('version').textContent=`Health Score v${WAIST_VERSION}`;
  };
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));
}

document.addEventListener('DOMContentLoaded',()=>{
  w83Store();
  w83RenderHome();
  w83RenderInput($('date')?.value||today());
  if($('version'))$('version').textContent=`Health Score v${WAIST_VERSION}`;
});
