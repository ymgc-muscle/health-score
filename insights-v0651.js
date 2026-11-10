'use strict';

// Health Score v0.6.51: additive quality-of-life features.
// Keep the scoring weights, checkpoint algorithm and historical entries unchanged.
const HS51_VERSION='0.6.52';
const HS51_BACKUP_INTERVAL_DAYS=14;
const HS51_REST_REASONS={
  illness:'体調不良',
  recovery:'疲労回復',
  travel:'出張・移動',
  other:'予定変更'
};

function hs51Number(v){
  return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
}
function hs51Average(values){
  return values.length?values.reduce(function(a,b){return a+b},0)/values.length:null;
}
function hs51Signed(n,digits){
  return (n>0?'+':'')+n.toFixed(digits);
}
function hs51DateOffset(base,days){
  const d=dateObj(base);
  d.setDate(d.getDate()+days);
  return localDateString(d);
}
function hs51Week(weeksAgo){
  const end=hs51DateOffset(today(),-7*(weeksAgo||0));
  const dates=lastNDates(7,end).filter(function(d){
    return !st.settings.startDate||d>=st.settings.startDate;
  });
  const pairs=dates.map(function(d){return[d,st.entries[d]]});
  const entries=pairs.filter(function(pair){return pair[1]&&entryHasData(pair[1])});
  const done=pairs.filter(function(pair){return pair[1]&&pair[1].completed});
  const scores=done.map(function(pair){return hs51Number(scoreForDay(pair[1]))}).filter(function(n){return n!==null});
  const cal=entries.map(function(pair){return hs51Number(effectiveCalories(pair[1]))}).filter(function(n){return n!==null});
  // Never cast null to Number(null) = 0: an unrecorded protein value is not 0g.
  const protein=entries.map(function(pair){return hs51Number(pair[1].proteinActual)}).filter(function(n){return n!==null});
  const buy=entries.filter(function(pair){return ['g','y','r'].includes(pair[1].buying)});
  const steps=entries.filter(function(pair){return hs51Number(pair[1].steps)!==null});
  const proteinRecorded=entries.filter(function(pair){return hs51Number(pair[1].proteinActual)!==null});
  const weights=entries.filter(function(pair){return hs51Number(pair[1].weight)!==null}).map(function(pair){return {d:pair[0],w:Number(pair[1].weight)}});
  const stepTarget=Number(st.settings.stepTarget)||10000;
  const proteinTarget=Number(st.settings.proteinTarget)||100;
  const stepDays=steps.filter(function(pair){return Number(pair[1].steps)>=stepTarget}).length;
  const proteinDays=proteinRecorded.filter(function(pair){return Number(pair[1].proteinActual)>=proteinTarget*.9}).length;
  const buyDays=buy.filter(function(pair){return pair[1].buying==='g'}).length;
  const achieved=done.filter(function(pair){return scoreForDay(pair[1])>=70}).length;
  const weakness=ALL_KEYS.map(function(k){
    const seen=entries.filter(function(pair){return doneRating(k,pair[1])});
    return {k:k,rate:seen.length?seen.filter(function(pair){return fullPointAchieved(k,pair[1])}).length/seen.length:null};
  }).filter(function(x){return x.rate!==null}).sort(function(a,b){return a.rate-b.rate})[0]||null;
  return {
    dates:dates,periodDays:dates.length,entries:entries,done:done,
    avgScore:scores.length?Math.round(hs51Average(scores)):null,
    achieved:achieved,
    calAvg:cal.length?Math.round(hs51Average(cal)):null,
    protAvg:protein.length?Math.round(hs51Average(protein)):null,
    proteinCount:protein.length,
    stepDays:stepDays,stepRecorded:steps.length,
    proteinDays:proteinDays,proteinRecorded:proteinRecorded.length,
    buyDays:buyDays,buyRecorded:buy.length,
    weightDelta:weights.length>=2?weights[weights.length-1].w-weights[0].w:null,
    weakness:weakness
  };
}

// Preserve the public weeklyStats interface for other scripts.
weeklyStats=function(){return hs51Week(0)};

function hs51CompareWeeks(current,previous){
  if(current.done.length>=3&&previous.done.length>=3&&current.avgScore!==null&&previous.avgScore!==null){
    const delta=current.avgScore-previous.avgScore;
    if(delta>=2)return '確定スコアの週間平均が前7日より'+delta+'点改善しました。';
  }
  const behaviors=[
    {label:'買い食いのコントロール',good:current.buyDays,count:current.buyRecorded,oldGood:previous.buyDays,oldCount:previous.buyRecorded},
    {label:'たんぱく質の確保',good:current.proteinDays,count:current.proteinRecorded,oldGood:previous.proteinDays,oldCount:previous.proteinRecorded},
    {label:'歩数目標の達成',good:current.stepDays,count:current.stepRecorded,oldGood:previous.stepDays,oldCount:previous.stepRecorded}
  ].filter(function(x){return x.count>=4&&x.oldCount>=4}).map(function(x){
    return {...x,improvement:x.good/x.count-x.oldGood/x.oldCount};
  }).sort(function(a,b){return b.improvement-a.improvement});
  if(behaviors.length&&behaviors[0].improvement>=.15){
    return behaviors[0].label+'が前7日より改善しました。体重以外の積み重ねも成果です。';
  }
  if(current.done.length<3||previous.done.length<3){
    return 'スコア比較は、各期間3日以上の確定スコアが集まると表示します。';
  }
  return '大きな変化がなくても、記録を続けることに意味があります。';
}
function hs51NextWeeklyGoal(w){
  if(w.proteinRecorded>=3&&w.proteinDays/w.proteinRecorded<.75)return 'たんぱく質目標圏の日を、直近7日より1日増やす。';
  if(w.buyRecorded>=3&&w.buyDays/w.buyRecorded<.75)return '買い食い◎の日を、直近7日より1日増やす。';
  if(w.stepRecorded>=3&&w.stepDays/w.stepRecorded<.75)return '歩数目標達成の日を、直近7日より1日増やす。';
  return '3食と無理のない記録を、これからも継続する。';
}
function hs51PeriodLabel(w){
  return w.dates.length?fmtShort(w.dates[0])+'〜'+fmtShort(w.dates[w.dates.length-1]):'対象期間なし';
}
function hs51WeekDelta(w,previous){
  if(w.done.length<3||previous.done.length<3)return '比較データ不足';
  return '前7日比 '+hs51Signed(w.avgScore-previous.avgScore,0)+'点';
}
weeklyReviewHtml=function(){
  const w=hs51Week(0),prior=hs51Week(1);
  const rate=w.done.length?Math.round(w.achieved/w.done.length*100):null;
  const weak=w.weakness?LABELS[w.weakness.k]:'--';
  return '<div class="weekly-head"><div><div class="sub">直近7日 '+hs51PeriodLabel(w)+'（開始日以降）</div><div class="weekly-rate">70点以上 '+(rate===null?'--':rate+'%')+'</div><div class="sub">確定済みの日を分母に使用</div></div>'+
    '<div class="weekly-score"><span>平均</span><b>'+(w.avgScore===null?'--':w.avgScore)+'</b></div></div>'+
    '<div class="hs51-delta">'+hs51WeekDelta(w,prior)+'</div>'+
    '<div class="kpi-grid weekly-kpis"><div class="kpi"><span class="sub">完了</span><b>'+w.done.length+'/'+w.periodDays+'</b></div>'+
    '<div class="kpi"><span class="sub">70点以上</span><b>'+w.achieved+'/'+w.done.length+'</b></div>'+
    '<div class="kpi"><span class="sub">体重変化</span><b>'+(w.weightDelta===null?'--':hs51Signed(w.weightDelta,1)+' kg')+'</b></div></div>'+
    '<div class="week-detail"><div><span>平均摂取</span><b>'+(w.calAvg===null?'--':w.calAvg.toLocaleString()+' kcal')+'</b></div>'+
    '<div><span>平均P（記録'+w.proteinCount+'日）</span><b>'+(w.protAvg===null?'--':w.protAvg+' g')+'</b></div>'+
    '<div><span>歩数目標</span><b>'+w.stepDays+'/'+w.periodDays+'日</b></div>'+
    '<div><span>P目標圏</span><b>'+w.proteinDays+'/'+w.periodDays+'日</b></div>'+
    '<div><span>買い食い◎</span><b>'+w.buyDays+'/'+w.periodDays+'日</b></div>'+
    '<div><span>改善余地</span><b>'+weak+'</b></div></div>'+
    '<div class="hs51-review"><div><b>直近7日のよかったこと</b><p>'+hs51CompareWeeks(w,prior)+'</p></div>'+
    '<div><b>次の小さな目標</b><p>'+hs51NextWeeklyGoal(w)+'</p></div></div>';
};

// The user's existing score: hiit="rest" already receives the standard exercise
// points. Store a reason alongside it, not an invented ninth score component.
const hs51CoreCollectDetail=collectDetail;
collectDetail=function(){
  const e=hs51CoreCollectDetail();
  if(e.hiit!=='rest')delete e.specialRestReason;
  return e;
};
function hs51RestControl(){
  const ds=$('date')&&$('date').value||today();
  const plan=typeof u86ExercisePlan==='function'?u86ExercisePlan(ds):null;
  const exercise=document.querySelector('#input .ratecard[data-field="hiit"]');
  let card=$('hs51RestCard');
  if(!exercise||!plan||!plan.scheduled){
    if(card)card.remove();
    return;
  }
  if(!card){
    card=document.createElement('div');
    card.id='hs51RestCard';
    card.className='card hs51-rest';
  }
  // Keep the card next to today's HIIT/strength entry, not the overall settings.
  if(card.previousElementSibling!==exercise)exercise.insertAdjacentElement('afterend',card);
  const e=ent(ds),reason=HS51_REST_REASONS[e.specialRestReason]?e.specialRestReason:'';
  const locked=!!e.completed;
  const opts=Object.keys(HS51_REST_REASONS).map(function(k){
    return '<option value="'+k+'"'+(reason===k?' selected':'')+'>'+HS51_REST_REASONS[k]+'</option>';
  }).join('');
  card.innerHTML='<div class="title">今日の運動を計画休養にする</div>'+
    '<div class="help">体調不良・出張・疲労回復などで運動を見送る日は、理由を選べます。通常の休養と同じ運動'+maxFor('hiit')+'点で、他の配点は変わりません。</div>'+
    '<div class="field"><label for="hs51RestReason">理由（任意の変更）</label><select id="hs51RestReason" '+(locked?'disabled':'')+'>'+
    '<option value="">計画休養を設定しない</option>'+opts+'</select></div>'+
    (reason&&e.hiit==='rest'?'<div class="hs51-rest-state">計画休養：'+HS51_REST_REASONS[reason]+'（運動'+maxFor('hiit')+'点）</div>':'')+
    (locked?'<div class="help">変更するには「記録を再開」してください。</div>':'');
  $('hs51RestReason').onchange=function(){
    const value=this.value,day=$('date').value;
    flushDetailSave();
    const current=collectDetail();
    if(current.completed)return;
    if(value&&HS51_REST_REASONS[value]){
      current.specialRestReason=value;
      current.hiit='rest';
    }else{
      delete current.specialRestReason;
      if(current.hiit==='rest')delete current.hiit;
    }
    setEntry(day,current);
    fillDetail(day);
    renderAll();
    toast(value?'計画休養として記録しました':'計画休養を解除しました');
  };
}
const hs51CoreFillDetail=fillDetail;
fillDetail=function(d){
  hs51CoreFillDetail(d);
  hs51RestControl();
};
document.addEventListener('click',function(ev){
  const btn=ev.target&&ev.target.closest?ev.target.closest('#hiitSeg button'):null;
  if(!btn)return;
  // After the normal autosave completes, refresh the auxiliary card.
  setTimeout(hs51RestControl,350);
},false);

function hs51RecentWeight(days,offset){
  const end=hs51DateOffset(today(),-(offset||0));
  const from=hs51DateOffset(end,-days+1);
  return Object.entries(st.entries).filter(function(pair){
    return pair[0]>=from&&pair[0]<=end&&pair[1]&&hs51Number(pair[1].weight)!==null;
  }).map(function(pair){return Number(pair[1].weight)});
}
function hs51WeightTrendHtml(){
  const now=hs51RecentWeight(7,0),before=hs51RecentWeight(7,7);
  if(now.length<4||before.length<4){
    return '<b>直近の傾向：計算準備中</b><p>直近7日と、その前の7日に各4日以上の測定が集まると比較します。</p>';
  }
  const current=hs51Average(now),previous=hs51Average(before),delta=current-previous;
  const word=delta<=-.2?'減少傾向':delta>=.2?'増加傾向':'ほぼ横ばい';
  const explanation=delta>=.2
    ?'短期の増加は水分・塩分・便通などの影響も受けます。すぐに食事を極端に減らす必要はありません。'
    :delta<=-.2?'平均は減少しています。今の生活リズムを無理なく続けましょう。'
    :'体重が横ばいの週もあります。食事・運動の積み重ねと合わせて観察しましょう。';
  return '<b>直近の傾向：'+word+'</b><div class="hs51-weight-numbers">直近7日 '+current.toFixed(1)+' kg（'+now.length+'日） / 前7日 '+previous.toFixed(1)+' kg（'+before.length+'日）　'+hs51Signed(delta,1)+' kg</div><p>'+explanation+'</p>';
}
function hs51RenderWeightTrend(){
  const section=$('chart');
  if(!section)return;
  let box=$('hs51WeightTrend');
  if(!box){
    box=document.createElement('div');
    box.id='hs51WeightTrend';
    box.className='card hs51-weight-trend';
    const first=section.querySelector('.card');
    if(first)first.insertAdjacentElement('afterend',box);
    else section.appendChild(box);
  }
  box.innerHTML='<div class="title">体重変化の読み取り</div><div class="sub">今日を基準とした7日平均比較（過去グラフ表示とは独立）</div>'+hs51WeightTrendHtml();
}
const hs51CoreChart=chart;
chart=function(){
  hs51CoreChart();
  hs51RenderWeightTrend();
};

function hs51BackupAge(){
  const iso=st.settings.lastBackupExportedAt;
  if(!iso)return null;
  const dt=new Date(iso);
  if(!Number.isFinite(dt.getTime()))return null;
  return Math.max(0,Math.floor((Date.now()-dt.getTime())/86400000));
}
function hs51NeedsBackup(){
  const age=hs51BackupAge();
  return age===null?Object.keys(st.entries).length>=7:age>=HS51_BACKUP_INTERVAL_DAYS;
}
function hs51BackupStatusHtml(){
  const age=hs51BackupAge();
  const state=age===null?'JSONバックアップの書き出し履歴がありません。':'最後の書き出し操作から'+age+'日経過しています。';
  const caution=hs51NeedsBackup()?'バックアップを推奨します。端末のデータ消去に備えましょう。':'定期的にバックアップを保管しましょう。';
  return '<div class="title">データのバックアップ</div><div class="help">'+state+' '+caution+'</div>'+
    '<button class="btn2" type="button" id="hs51BackupButton">JSONバックアップを書き出す</button>'+
    '<div class="help">実際にファイルが保存されたかは端末のダウンロード一覧で確認してください。健康記録は引き続き端末内のlocalStorageに保存されます。</div>';
}
function hs51RenderBackup(){
  const section=$('settings');if(!section)return;
  let card=$('hs51BackupCard');
  if(!card){
    card=document.createElement('div');
    card.id='hs51BackupCard';
    card.className='card hs51-backup';
    const anchor=section.querySelector('details.settings-advanced');
    if(anchor)anchor.insertAdjacentElement('beforebegin',card);
    else section.appendChild(card);
  }
  card.innerHTML=hs51BackupStatusHtml();
  const b=$('hs51BackupButton');
  if(b)b.onclick=function(){$('export')&&$('export').click()};
}
function hs51WrapBackupExport(){
  const b=$('export');
  if(!b||b.dataset.hs51Wrapped)return;
  b.dataset.hs51Wrapped='1';
  const original=b.onclick;
  b.onclick=function(ev){
    // The timestamp is included in the regular JSON backup.
    flushDetailSave();
    st.settings.lastBackupExportedAt=new Date().toISOString();
    saveState();
    if(typeof original==='function')original.call(b,ev);
    hs51RenderBackup();
    toast('JSON書き出しを開始しました。保存先を確認してください');
  };
}

function hs51Milestones(){
  const all=Object.values(st.entries),completed=all.filter(function(e){return e&&e.completed});
  const n=completed.length,w=hs51Week(0);
  return [
    {id:'logged10',label:'記録完了 10日',earned:n>=10},
    {id:'logged30',label:'記録完了 30日',earned:n>=30},
    {id:'logged100',label:'記録完了 100日',earned:n>=100},
    {id:'high85',label:'週間平均85点',earned:w.done.length>=4&&w.avgScore!==null&&w.avgScore>=85},
    {id:'snack5',label:'買い食い◎ 週5日',earned:w.buyDays>=5}
  ];
}
function hs51CelebrateMilestone(awards){
  const existing=$('hs51Celebration');
  if(existing){
    const labels=existing.querySelector('h2');
    labels.textContent+=' / '+awards.map(function(x){return x.label}).join(' / ');
    return;
  }
  const overlay=document.createElement('div');
  overlay.id='hs51Celebration';
  overlay.className='hs51-celebration';
  overlay.innerHTML='<div class="hs51-celebration-inner"><div class="hs51-spark">✦ ✧ ✦</div>'+
    '<div class="hs51-celebration-label">SMALL WIN UNLOCKED</div><h2>'+awards.map(function(x){return x.label}).join(' / ')+'</h2>'+
    '<p>これは立派な積み重ねです！ 次の小さな一歩も、自分のペースで。</p>'+
    '<button type="button" id="hs51CelebrationClose">やった！</button></div>';
  document.body.appendChild(overlay);
  $('hs51CelebrationClose').onclick=function(){overlay.remove()};
  overlay.onclick=function(ev){if(ev.target===overlay)overlay.remove()};
}
function hs51UpdateAwards(){
  const milestones=hs51Milestones();
  const existing=st.settings.hs51AwardedIds;
  const seen=Array.isArray(existing)?existing.filter(function(x){return typeof x==='string'}):null;
  const achieved=milestones.filter(function(x){return x.earned}).map(function(x){return x.id});
  if(seen===null){
    st.settings.hs51AwardedIds=achieved;
    saveState();
    return;
  }
  const newly=milestones.filter(function(x){return x.earned&&!seen.includes(x.id)});
  if(newly.length){
    st.settings.hs51AwardedIds=[...new Set(seen.concat(newly.map(function(x){return x.id})))];
    saveState();
    hs51CelebrateMilestone(newly);
  }
}
function hs51RenderHomeExtras(){
  const host=$('appleHome');
  if(!host)return;
  hs51UpdateAwards();
  const current=hs51Week(0),prior=hs51Week(1);
  const awards=Array.isArray(st.settings.hs51AwardedIds)?st.settings.hs51AwardedIds:[];
  const achieved=hs51Milestones().filter(function(x){return awards.includes(x.id)});
  const count=Object.values(st.entries).filter(function(e){return e&&e.completed}).length;
  const next=count<10?10:count<30?30:count<100?100:null;
  let box=$('hs51HomeExtras');
  if(!box){
    box=document.createElement('div');
    box.id='hs51HomeExtras';
    box.className='hs51-home-extras';
    host.appendChild(box);
  }
  box.innerHTML='<section class="hs51-card"><div class="title">週間の振り返り</div>'+
    '<div class="sub">直近7日 '+hs51PeriodLabel(current)+' / 前7日 '+hs51PeriodLabel(prior)+'</div>'+
    '<div class="hs51-home-score">平均 '+(current.avgScore===null?'--':current.avgScore+'点')+
    ' <span>'+hs51WeekDelta(current,prior)+'</span></div><p>'+hs51CompareWeeks(current,prior)+'</p>'+
    '<div class="hs51-small-goal"><b>次の小さな目標</b> '+hs51NextWeeklyGoal(current)+'</div></section>'+
    '<section class="hs51-card"><div class="title">小さな達成</div>'+
    (achieved.length?'<div class="hs51-badges">'+achieved.map(function(x){return '<span>'+x.label+'</span>'}).join('')+'</div>':'<p>小さな達成を少しずつ集めていきましょう。</p>')+
    (next===null?'<p>記録の積み重ね、十分に立派です。</p>':'<p>次は累計'+next+'日。あと'+(next-count)+'回の記録完了で達成です。</p>')+'</section>'+
    (hs51NeedsBackup()?'<section class="hs51-card hs51-backup-alert"><b>バックアップをおすすめします</b><p>スマホ内の記録をJSONで保管しましょう。</p><button type="button" id="hs51HomeBackup">JSONを書き出す</button></section>':'');
  const backup=$('hs51HomeBackup');
  if(backup)backup.onclick=function(){$('export')&&$('export').click();hs51RenderHomeExtras()};
  const todayEntry=ent(today());
  if(todayEntry.specialRestReason&&todayEntry.hiit==='rest'&&HS51_REST_REASONS[todayEntry.specialRestReason]){
    const note=document.createElement('div');
    note.className='hs51-rest-home';
    note.textContent='今日の運動：計画休養（'+HS51_REST_REASONS[todayEntry.specialRestReason]+'）';
    box.prepend(note);
  }
}

if(typeof renderAppleHome==='function'){
  const hs51CoreRenderAppleHome=renderAppleHome;
  renderAppleHome=function(){
    hs51CoreRenderAppleHome();
    hs51RenderHomeExtras();
  };
}
const hs51CoreRenderAll=renderAll;
renderAll=function(){
  hs51CoreRenderAll();
  hs51RenderBackup();
};

function hs51Init(){
  hs51WrapBackupExport();
  hs51RenderBackup();
  hs51RestControl();
  hs51RenderWeightTrend();
  if(typeof renderAppleHome==='function')renderAppleHome();
  if($('version'))$('version').textContent='Health Score v'+HS51_VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hs51Init);
else hs51Init();

