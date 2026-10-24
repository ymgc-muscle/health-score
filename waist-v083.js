'use strict';

const WAIST_VERSION='0.6.48';

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

function w83History(){
  return Object.entries(w83Store())
    .filter(([d,v])=>d&&v!==''&&v!=null&&Number.isFinite(+v))
    .map(([date,value])=>({date,value:+value}))
    .sort((a,b)=>a.date.localeCompare(b.date));
}
function w83SignedDelta(n){
  if(!Number.isFinite(n))return'--';
  if(Math.abs(n)<.05)return'±0.0 cm';
  return (n<0?'−':'+')+Math.abs(n).toFixed(1)+' cm';
}
function w83MiniChart(rows){
  if(!rows.length)return'';
  const W=640,H=220,L=42,R=18,T=18,B=34;
  const dates=rows.map(x=>dateObj(x.date).getTime()),minD=Math.min(...dates),maxD=Math.max(...dates);
  const vals=rows.map(x=>x.value),rawMin=Math.min(...vals),rawMax=Math.max(...vals);
  let ymin=Math.floor((rawMin-1)*2)/2,ymax=Math.ceil((rawMax+1)*2)/2;
  if(ymax-ymin<4){const mid=(ymax+ymin)/2;ymin=Math.floor((mid-2)*2)/2;ymax=ymin+4}
  const span=Math.max(1,maxD-minD);
  const X=d=>rows.length===1?(L+(W-L-R)/2):L+(dateObj(d).getTime()-minD)/span*(W-L-R);
  const Y=v=>T+(ymax-v)/(ymax-ymin)*(H-T-B);
  let grid='';
  const step=(ymax-ymin)>8?2:1;
  for(let v=Math.ceil(ymin/step)*step;v<=ymax+.001;v+=step){
    grid+='<line x1="'+L+'" y1="'+Y(v)+'" x2="'+(W-R)+'" y2="'+Y(v)+'" class="w83-grid"/>'+
      '<text x="'+(L-7)+'" y="'+(Y(v)+4)+'" class="w83-y" text-anchor="end">'+v.toFixed(0)+'</text>';
  }
  const pts=rows.map(x=>X(x.date)+','+Y(x.value)).join(' ');
  const circles=rows.map((x,i)=>'<circle cx="'+X(x.date)+'" cy="'+Y(x.value)+'" r="'+(i===rows.length-1?6:4)+'" class="'+(i===rows.length-1?'w83-dot latest':'w83-dot')+'"><title>'+fmtShort(x.date)+' '+x.value.toFixed(1)+' cm</title></circle>').join('');
  const labels=rows.length===1
    ?'<text x="'+X(rows[0].date)+'" y="'+(H-8)+'" class="w83-x" text-anchor="middle">'+fmtShort(rows[0].date)+'</text>'
    :'<text x="'+L+'" y="'+(H-8)+'" class="w83-x" text-anchor="start">'+fmtShort(rows[0].date)+'</text>'+
     '<text x="'+(W-R)+'" y="'+(H-8)+'" class="w83-x" text-anchor="end">'+fmtShort(rows.at(-1).date)+'</text>';
  return '<svg class="w83-history-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="腹囲の測定履歴。'+rows.length+'回の記録">'+
    grid+(rows.length>1?'<polyline points="'+pts+'" class="w83-line"/>':'')+circles+labels+'</svg>';
}
function w83RenderHistory(){
  const chartView=$('chart');if(!chartView)return;
  let card=$('w83WaistHistory');
  if(!card){
    card=document.createElement('div');
    card.id='w83WaistHistory';
    card.className='card w83-history';
    chartView.appendChild(card);
  }
  const rows=w83History();
  if(!rows.length){
    card.innerHTML='<div class="title">腹囲の推移</div><div class="w83-empty">週末に腹囲を記録すると、ここに経過が表示されます。</div>';
    return;
  }
  const first=rows[0],latest=rows.at(-1),prev=rows.length>1?rows.at(-2):null;
  const prevDelta=prev?latest.value-prev.value:null,totalDelta=latest.value-first.value;
  const recent=rows.slice(-6).reverse();
  card.innerHTML='<div class="w83-history-head"><div><div class="title">腹囲の推移</div><div class="sub">週末の測定記録</div></div><span class="w83-history-count">'+rows.length+'回</span></div>'+
    '<div class="w83-history-stats">'+
      '<div><span>最新</span><b>'+latest.value.toFixed(1)+' cm</b><small>'+fmtShort(latest.date)+'</small></div>'+
      '<div><span>前回比</span><b class="'+(prevDelta!=null&&prevDelta<0?'good':'')+'">'+(prev?w83SignedDelta(prevDelta):'--')+'</b><small>'+(prev?'前回 '+prev.value.toFixed(1)+' cm':'比較データなし')+'</small></div>'+
      '<div><span>初回から</span><b class="'+(totalDelta<0?'good':'')+'">'+w83SignedDelta(totalDelta)+'</b><small>初回 '+first.value.toFixed(1)+' cm</small></div>'+
    '</div>'+
    '<div class="w83-chart-wrap">'+w83MiniChart(rows)+'</div>'+
    '<div class="w83-history-list"><div class="w83-history-list-title">最近の記録</div>'+
      recent.map(x=>'<div class="w83-history-row"><span>'+fmtShort(x.date)+'</span><b>'+x.value.toFixed(1)+' cm</b></div>').join('')+
    '</div>';
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
  w83RenderHistory();
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
    if(id==='chart')w83RenderHistory();
    if($('version'))$('version').textContent=`Health Score v${WAIST_VERSION}`;
  };
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));
}

document.addEventListener('DOMContentLoaded',()=>{
  w83Store();
  w83RenderHome();
  w83RenderInput($('date')?.value||today());
  w83RenderHistory();
  if($('version'))$('version').textContent=`Health Score v${WAIST_VERSION}`;
});
