'use strict';

weeklyStats=function(){
  const allDates=lastNDates(7),dates=allDates.filter(d=>!st.settings.startDate||d>=st.settings.startDate),periodDays=Math.max(1,dates.length),pairs=dates.map(d=>[d,st.entries[d]]),entries=pairs.filter(([,e])=>e&&entryHasData(e)),done=pairs.filter(([,e])=>e?.completed),scores=done.map(([,e])=>scoreForDay(e));
  const avgScore=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null,achieved=done.filter(([,e])=>scoreForDay(e)>=70).length;
  const cal=entries.map(([,e])=>effectiveCalories(e)).filter(Number.isFinite),prot=entries.map(([,e])=>+e.proteinActual).filter(Number.isFinite);
  const stepDays=entries.filter(([,e])=>e.steps!=null&&+e.steps>=(+st.settings.stepTarget||10000)).length,proteinDays=entries.filter(([,e])=>e.proteinActual!=null&&+e.proteinActual>=(+st.settings.proteinTarget||100)*.9).length,buyDays=entries.filter(([,e])=>e.buying==='g').length;
  const weights7=entries.filter(([,e])=>e.weight!=null&&Number.isFinite(+e.weight)).map(([d,e])=>({d,w:+e.weight})),weightDelta=weights7.length>=2?weights7.at(-1).w-weights7[0].w:null;
  const weakness=ALL_KEYS.map(k=>{const seen=entries.filter(([,e])=>doneRating(k,e));if(!seen.length)return{k,rate:null};return{k,rate:seen.filter(([,e])=>fullPointAchieved(k,e)).length/seen.length}}).filter(x=>x.rate!=null).sort((a,b)=>a.rate-b.rate)[0]||null;
  return{dates,periodDays,entries,done,avgScore,achieved,calAvg:cal.length?Math.round(cal.reduce((a,b)=>a+b,0)/cal.length):null,protAvg:prot.length?Math.round(prot.reduce((a,b)=>a+b,0)/prot.length):null,stepDays,proteinDays,buyDays,weightDelta,weakness};
};
weeklyReviewHtml=function(){
  const w=weeklyStats(),rate=w.done.length?Math.round(w.achieved/w.done.length*100):0,weak=w.weakness?LABELS[w.weakness.k]:'--';
  return `<div class="weekly-head"><div><div class="sub">直近7日（開始日以降）</div><div class="weekly-rate">達成率 ${rate}%</div><div class="sub">完了日のうち70点以上</div></div><div class="weekly-score"><span>平均</span><b>${w.avgScore??'--'}</b></div></div><div class="kpi-grid weekly-kpis"><div class="kpi"><span class="sub">完了</span><b>${w.done.length}/${w.periodDays}</b></div><div class="kpi"><span class="sub">70点以上</span><b>${w.achieved}/${w.done.length||0}</b></div><div class="kpi"><span class="sub">体重変化</span><b>${w.weightDelta==null?'--':`${w.weightDelta>=0?'+':''}${w.weightDelta.toFixed(1)}`}</b></div></div><div class="week-detail"><div><span>平均摂取</span><b>${w.calAvg==null?'--':`${w.calAvg.toLocaleString()} kcal`}</b></div><div><span>平均P</span><b>${w.protAvg==null?'--':`${w.protAvg} g`}</b></div><div><span>歩数目標</span><b>${w.stepDays}/${w.periodDays}日</b></div><div><span>P目標圏</span><b>${w.proteinDays}/${w.periodDays}日</b></div><div><span>買い食い回避</span><b>${w.buyDays}/${w.periodDays}日</b></div><div><span>改善余地</span><b>${weak}</b></div></div>`;
};

document.addEventListener('DOMContentLoaded',()=>{const v=document.getElementById('version');if(v)v.textContent='Health Score v0.6.1'});
