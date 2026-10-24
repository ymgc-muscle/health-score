'use strict';

const WAIST_TREND_VERSION='0.6.48';

function wt88Rows(){
  return Object.entries(typeof w83Store==='function'?w83Store():(st.waistMeasurements||{}))
    .filter(([d,v])=>d&&v!==''&&v!=null&&Number.isFinite(+v))
    .map(([date,value])=>({date,value:+value}))
    .sort((a,b)=>a.date.localeCompare(b.date));
}
function wt88DeltaText(v){
  if(!Number.isFinite(v))return'--';
  if(Math.abs(v)<.05)return'±0.0 cm';
  return (v<0?'−':'+')+Math.abs(v).toFixed(1)+' cm';
}
function wt88EnsureCard(){
  const section=$('chart');
  if(!section)return null;
  let card=$('wt88WaistTrend');
  if(card)return card;
  card=document.createElement('div');
  card.id='wt88WaistTrend';
  card.className='card wt88-card';
  const weightCard=section.querySelector('.card');
  if(weightCard)weightCard.insertAdjacentElement('afterend',card);
  else section.appendChild(card);
  return card;
}
function wt88Graph(rows){
  if(!rows.length)return'<div class="wt88-empty">腹囲を記録すると、ここに推移が表示されます。</div>';
  const W=680,H=265,L=52,R=28,T=24,B=48;
  const min=Math.min(...rows.map(x=>x.value)),max=Math.max(...rows.map(x=>x.value));
  let ymin=Math.floor(min-1),ymax=Math.ceil(max+1);
  if(ymax-ymin<4){const mid=(ymin+ymax)/2;ymin=Math.floor(mid-2);ymax=Math.ceil(mid+2)}
  const start=dateObj(rows[0].date),end=dateObj(rows[rows.length-1].date),span=Math.max(1,(end-start)/86400000);
  const X=d=>L+((dateObj(d)-start)/86400000)/span*(W-L-R);
  const Y=v=>T+(ymax-v)/(ymax-ymin)*(H-T-B);
  let grid='',labels='';
  for(let v=ymin;v<=ymax;v+=1){
    grid+='<line x1="'+L+'" y1="'+Y(v)+'" x2="'+(W-R)+'" y2="'+Y(v)+'" stroke="#edf0ee" stroke-width="1"/>'+
      '<text x="'+(L-8)+'" y="'+(Y(v)+4)+'" text-anchor="end" font-size="11.5" font-weight="650" fill="#68716b">'+v.toFixed(0)+'</text>';
  }
  const tickEvery=Math.max(1,Math.ceil(rows.length/5));
  rows.forEach((x,i)=>{
    if(i===0||i===rows.length-1||i%tickEvery===0){
      const anchor=i===0?'start':i===rows.length-1?'end':'middle';
      labels+='<text x="'+X(x.date)+'" y="'+(H-19)+'" text-anchor="'+anchor+'" font-size="11.5" font-weight="700" fill="#69736d">'+fmtShort(x.date)+'</text>';
    }
  });
  const pts=rows.map(x=>X(x.date)+','+Y(x.value)).join(' ');
  const dots=rows.map((x,i)=>{
    const latest=i===rows.length-1;
    return '<circle cx="'+X(x.date)+'" cy="'+Y(x.value)+'" r="'+(latest?5.5:4)+'" fill="'+(latest?'#2f7d4f':'#7db892')+'" stroke="#fff" stroke-width="2">'+
      '<title>'+x.date+' '+x.value.toFixed(1)+' cm</title></circle>';
  }).join('');
  const line=rows.length>1?'<polyline points="'+pts+'" fill="none" stroke="#43865b" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>':'';
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="腹囲の推移グラフ。週末に記録した腹囲を日付順に表示しています。">'+
    grid+line+dots+labels+'<text x="9" y="17" font-size="11.5" font-weight="750" fill="#6d756f">cm</text></svg>';
}
function wt88Render(){
  const card=wt88EnsureCard();
  if(!card)return;
  const rows=wt88Rows();
  if(!rows.length){
    card.innerHTML='<div class="title">腹囲の推移</div><div class="wt88-empty">まだ腹囲の記録がありません。週末に1回記録すると、ここで経過を確認できます。</div>';
    return;
  }
  const first=rows[0],latest=rows[rows.length-1],prev=rows.length>1?rows[rows.length-2]:null;
  const previousDelta=prev?latest.value-prev.value:null;
  const totalDelta=latest.value-first.value;
  card.innerHTML='<div class="wt88-head"><div><div class="title">腹囲の推移</div><div class="sub">週末の測定記録</div></div><span class="wt88-count">'+rows.length+'回</span></div>'+
    '<div class="wt88-summary">'+
      '<div><span>最新</span><b>'+latest.value.toFixed(1)+' cm</b><small>'+fmtShort(latest.date)+'</small></div>'+
      '<div><span>前回比</span><b>'+(prev?wt88DeltaText(previousDelta):'--')+'</b><small>'+(prev?'前回 '+prev.value.toFixed(1)+' cm':'比較データなし')+'</small></div>'+
      '<div><span>初回から</span><b>'+wt88DeltaText(totalDelta)+'</b><small>初回 '+first.value.toFixed(1)+' cm</small></div>'+
    '</div>'+
    '<div class="wt88-chart">'+wt88Graph(rows)+'</div>'+
    '<div class="wt88-note">体重と同じく1回の数値より、数週間の流れを見ます。測定条件はなるべく同じにすると比較しやすくなります。</div>';
}
if(typeof chart==='function'){
  const wt88CoreChart=chart;
  chart=function(){wt88CoreChart();wt88Render()};
}
if(typeof goto==='function'){
  const wt88CoreGoto=goto;
  goto=function(id){wt88CoreGoto(id);if(id==='chart')setTimeout(wt88Render,0)};
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));
}
function wt88Init(){
  wt88EnsureCard();
  wt88Render();
  if($('version'))$('version').textContent='Health Score v'+WAIST_TREND_VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wt88Init);else wt88Init();
