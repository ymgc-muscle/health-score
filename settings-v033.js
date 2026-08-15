(()=>{
  const DEFAULT_WEIGHTS={weight:5,breakfast:10,lunch:20,buying:25,dinner:15,protein:10,steps:10,hiit:5};
  const RATING_RATIOS={breakfast:.7,lunch:.6,buying:.8,dinner:2/3,protein:.7};
  const round10=n=>Math.round(n/10)*10;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  DEFAULT_SETTINGS.calorieTarget=1800;
  DEFAULT_SETTINGS.stepTarget=10000;
  DEFAULT_SETTINGS.proteinTarget=100;
  DEFAULT_SETTINGS.scoreWeights={...DEFAULT_WEIGHTS};
  st.settings={...DEFAULT_SETTINGS,...(st.settings||{})};
  st.settings.scoreWeights={...DEFAULT_WEIGHTS,...(st.settings.scoreWeights||{})};
  if(!Number.isFinite(+st.settings.calorieTarget))st.settings.calorieTarget=1800;
  if(!Number.isFinite(+st.settings.stepTarget))st.settings.stepTarget=10000;
  if(!Number.isFinite(+st.settings.proteinTarget))st.settings.proteinTarget=100;

  const weights=()=>st.settings.scoreWeights;
  const ratingPoints=(k,v)=>{
    const max=+weights()[k]||0;
    if(v==='g')return max;
    if(v==='y')return Math.round(max*(RATING_RATIOS[k]??.7));
    return 0;
  };
  const stepPoints=s=>{
    const max=+weights().steps||0,target=Math.max(1,+st.settings.stepTarget||10000),n=+s;
    if(!Number.isFinite(n))return 0;
    if(n>=target)return max;
    if(n>=target*.8)return Math.round(max*.8);
    if(n>=target*.6)return Math.round(max*.5);
    return 0;
  };
  const bands=(target=+st.settings.calorieTarget)=>{
    const t=Math.max(1000,Number(target)||1800);
    return{breakfast:[round10(t*.18),round10(t*.25)],lunch:[round10(t*.25),round10(t*.39)],dinner:[round10(t*.28),round10(t*.36)],snack:[round10(t*.05),round10(t*.10)]};
  };

  function criteria(k){
    const b=bands(),w=weights(),pt=Math.max(20,+st.settings.proteinTarget||100);
    const p90=Math.round(pt*.9),p70=Math.round(pt*.7);
    const stp=Math.max(1000,+st.settings.stepTarget||10000),s80=round10(stp*.8),s60=round10(stp*.6);
    if(k==='breakfast')return `<span class="cg"><b>◎ ${w.breakfast}点</b>：<b>${b.breakfast[0]}〜${b.breakfast[1]} kcal</b>を基本帯に、たんぱく質を確保し、甘い飲み物・菓子パン中心にしない。</span><br><span class="cy"><b>○ ${ratingPoints('breakfast','y')}点</b>：基本帯から少し外れる、またはたんぱく質不足・脂質/糖質に偏り。</span><br><span class="cr"><b>× 0点</b>：明らかな食べ過ぎ、または極端に少なく後で強い空腹を招く食事。</span>`;
    if(k==='lunch')return `<span class="cg"><b>◎ ${w.lunch}点</b>：<b>${b.lunch[0]}〜${b.lunch[1]} kcal</b>を基本帯に、たんぱく質20g前後以上＋野菜あり＋主食適量。定食だけでなく具のしっかり入った麺類も可。</span><br><span class="cy"><b>○ ${ratingPoints('lunch','y')}点</b>：基本帯から少し外れる、またはカロリー内でもたんぱく質・野菜不足、脂質・塩分が高め。</span><br><span class="cr"><b>× 0点</b>：大幅なオーバー、麺＋炒飯/ライス、大盛りカレー＋揚げ物など明確な食べ過ぎ。</span><br><span style="color:#666">※カロリーだけで決めず、栄養バランスで1段階調整。</span>`;
    if(k==='buying')return `<span class="cg"><b>◎ ${w.buying}点</b>：不要な買い食いをしなかった。</span><br><span class="cy"><b>○ ${ratingPoints('buying','y')}点</b>：夕食まで長く空くため、<b>${b.snack[0]}〜${b.snack[1]} kcal程度</b>の計画的補食（プロテイン、無糖ヨーグルト、ゆで卵等）。</span><br><span class="cr"><b>× 0点</b>：予定外の菓子パン・牛丼・ホットスナック等を追加し、その後も普通に夕食。</span>`;
    if(k==='dinner')return `<span class="cg"><b>◎ ${w.dinner}点</b>：<b>${b.dinner[0]}〜${b.dinner[1]} kcal</b>を基本帯に、主菜＋野菜＋適量の主食。</span><br><span class="cy"><b>○ ${ratingPoints('dinner','y')}点</b>：基本帯から少し外れる、または脂質・塩分が高めだが量は抑えた。</span><br><span class="cr"><b>× 0点</b>：揚げ物＋大盛り炭水化物＋追加食など明確な食べ過ぎ。</span>`;
    if(k==='protein')return `<span class="cg"><b>◎ ${w.protein}点</b>：1日のたんぱく質が<b>${p90}g以上</b>（目標 ${pt}g の90%以上）。</span><br><span class="cy"><b>○ ${ratingPoints('protein','y')}点</b>：<b>${p70}〜${p90-1}g</b>程度。ある程度摂れたが不足気味。</span><br><span class="cr"><b>× 0点</b>：<b>${p70}g未満</b>が目安。明らかに不足。</span>`;
    if(k==='steps')return `<span class="cg"><b>◎ ${w.steps}点</b>：${Number(stp).toLocaleString()}歩以上</span><br><span class="cy"><b>○ ${Math.round(w.steps*.8)}点</b>：${Number(s80).toLocaleString()}〜${Number(stp-1).toLocaleString()}歩</span><br><b>△ ${Math.round(w.steps*.5)}点</b>：${Number(s60).toLocaleString()}〜${Number(s80-1).toLocaleString()}歩<br><span class="cr"><b>0点</b>：${Number(s60).toLocaleString()}歩未満 / 未入力</span>`;
    if(k==='weight')return `<b>${w.weight}点</b>：起床後・トイレ後・飲食前を基本に測定できた。体重の値そのものではなく「測った行動」を加点します。`;
    if(k==='hiit')return `<span class="cg"><b>${w.hiit}点</b>：予定日に実施</span><br><span class="cg"><b>${w.hiit}点</b>：計画した休養日</span><br><span class="cr"><b>0点</b>：実施予定だったが未実施 / 未入力</span>`;
    return '';
  }

  function applyScoring(){
    for(const k of ['breakfast','lunch','buying','dinner','protein']){
      cfg[k].m=+weights()[k]||0;
      cfg[k].s={g:cfg[k].m,y:ratingPoints(k,'y'),r:0};
      cfg[k].c=criteria(k);
    }
    points=function(e){
      if(!e)return 0;
      let got=0;
      if(e.weight!=null&&e.weight!=='')got+=+weights().weight||0;
      for(const k of ['breakfast','lunch','buying','dinner','protein'])if(e[k])got+=ratingPoints(k,e[k]);
      if(e.steps!=null&&e.steps!=='')got+=stepPoints(e.steps);
      if(e.hiit&&e.hiit!=='missed')got+=+weights().hiit||0;
      return clamp(Math.round(got),0,100);
    };
    earnedFor=function(k,e){
      if(k==='weight')return e.weight!=null?(+weights().weight||0):0;
      if(k==='steps')return e.steps!=null?stepPoints(e.steps):0;
      if(k==='hiit')return e.hiit&&e.hiit!=='missed'?(+weights().hiit||0):0;
      return e[k]?ratingPoints(k,e[k]):0;
    };
    maxFor=function(k){
      if(k==='weight'||k==='steps'||k==='hiit')return +weights()[k]||0;
      return cfg[k]?.m||0;
    };
    buildRated();fill();updateStaticCards();
  }

  function findRateCard(title){return [...document.querySelectorAll('.ratecard')].find(c=>c.querySelector('.acc-title')?.textContent.trim()===title)}
  function updateStaticCards(){
    for(const [title,k] of [['今朝の体重','weight'],['歩数','steps'],['HIIT（運動）','hiit']]){
      const card=findRateCard(title);if(!card)continue;
      const pts=card.querySelector('.acc-points');if(pts)pts.textContent=`${weights()[k]}点`;
      const cr=card.querySelector('.criteria');if(cr)cr.innerHTML=criteria(k);
    }
    const sub=$('stepsNow')?.parentElement?.querySelector('.sub');if(sub)sub.textContent=`目標 ${Number(st.settings.stepTarget).toLocaleString()}歩`;
  }
  applyScoring();

  const settings=document.getElementById('settings'),evalCard=document.getElementById('allCriteria')?.closest('.card');
  const targetCard=document.createElement('div');targetCard.className='card';
  targetCard.innerHTML=`<div class="title">健康目標</div><div class="help">摂取カロリー・歩数・たんぱく質の目標値から、評価基準を自動調整します。</div><div class="settings-grid"><div class="field"><label for="setCalorieTarget">1日の目標摂取カロリー (kcal)</label><input type="number" id="setCalorieTarget" step="50" min="1000" max="5000"></div><div class="field"><label for="setStepTarget">1日の歩数目標</label><input type="number" id="setStepTarget" step="500" min="1000" max="50000"></div><div class="field"><label for="setProteinTarget">1日のたんぱく質目標 (g)</label><input type="number" id="setProteinTarget" step="5" min="20" max="300"></div></div><div id="targetGuide" style="margin-top:12px;background:#fff8ed;border:1px solid #ffd9b8;border-radius:12px;padding:12px"></div>`;

  const fields=[['weight','朝の体重測定'],['breakfast','朝食'],['lunch','昼食'],['buying','帰宅時の買い食い'],['dinner','夕食'],['protein','たんぱく質'],['steps','歩数'],['hiit','HIIT']];
  const scoreCard=document.createElement('div');scoreCard.className='card';
  scoreCard.innerHTML=`<div class="title">スコア配点</div><div class="help">各項目の満点を変更できます。合計は100点にしてください。○・△の点数は満点に比例して自動計算します。</div><div class="settings-grid" id="scoreFields">${fields.map(([k,t])=>`<div class="field"><label for="score_${k}">${t}</label><input type="number" id="score_${k}" min="0" max="100" step="1"></div>`).join('')}</div><div id="scoreTotal" style="margin-top:10px;font-weight:850"></div><button class="btn" id="saveAllSettings" type="button" style="margin-top:12px">すべての設定を保存</button>`;
  if(settings&&evalCard){settings.insertBefore(targetCard,evalCard);settings.insertBefore(scoreCard,evalCard)}

  const calorieInput=$('setCalorieTarget'),stepInput=$('setStepTarget'),proteinInput=$('setProteinTarget'),guide=$('targetGuide'),totalEl=$('scoreTotal');
  function drawGuide(){
    const b=bands(+calorieInput.value||st.settings.calorieTarget),steps=Math.max(1000,+stepInput.value||10000),protein=Math.max(20,+proteinInput.value||100);
    guide.innerHTML=`<div class="sub">自動計算される目安</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><div><b>朝食 ◎ ${b.breakfast[0]}〜${b.breakfast[1]} kcal</b></div><div><b>昼食 ◎ ${b.lunch[0]}〜${b.lunch[1]} kcal</b></div><div><b>夕食 ◎ ${b.dinner[0]}〜${b.dinner[1]} kcal</b></div><div><b>補食 ${b.snack[0]}〜${b.snack[1]} kcal</b></div><div><b>歩数 ◎ ${Number(steps).toLocaleString()}歩〜</b></div><div><b>たんぱく質 ◎ ${Math.round(protein*.9)}g〜</b></div></div><div class="sub" style="margin-top:8px">カロリーは栄養バランス・脂質・塩分も見て最終評価を調整します。</div>`;
  }
  function drawTotal(){
    const total=fields.reduce((sum,[k])=>sum+(+$(`score_${k}`).value||0),0);
    totalEl.textContent=`合計 ${total} / 100点`;totalEl.style.color=total===100?'#118348':'#b9362c';
  }
  function fillAdvanced(){
    calorieInput.value=st.settings.calorieTarget;stepInput.value=st.settings.stepTarget;proteinInput.value=st.settings.proteinTarget;
    for(const [k] of fields)$(`score_${k}`).value=weights()[k];
    drawGuide();drawTotal();
  }
  [calorieInput,stepInput,proteinInput].forEach(el=>el.addEventListener('input',drawGuide));
  fields.forEach(([k])=>$(`score_${k}`).addEventListener('input',drawTotal));

  const oldFillPlanSettings=fillPlanSettings;
  fillPlanSettings=function(){oldFillPlanSettings();fillAdvanced()};

  function saveEverything(){
    const startDate=$('setStartDate').value,goalDate=$('setGoalDate').value,startWeight=+$('setStartWeight').value,goalWeight=+$('setGoalWeight').value;
    const calorieTarget=+calorieInput.value,stepTarget=+stepInput.value,proteinTarget=+proteinInput.value;
    const scoreWeights={};for(const [k] of fields)scoreWeights[k]=+$(`score_${k}`).value;
    const scoreTotal=Object.values(scoreWeights).reduce((a,b)=>a+b,0);
    if(!startDate||!goalDate||!Number.isFinite(startWeight)||!Number.isFinite(goalWeight)||startWeight<=0||goalWeight<=0||!Number.isFinite(calorieTarget)||calorieTarget<1000||calorieTarget>5000||!Number.isFinite(stepTarget)||stepTarget<1000||stepTarget>50000||!Number.isFinite(proteinTarget)||proteinTarget<20||proteinTarget>300||Object.values(scoreWeights).some(v=>!Number.isInteger(v)||v<0||v>100)){toast('設定値を確認してください');return}
    if(new Date(goalDate+'T00:00:00')<=new Date(startDate+'T00:00:00')){toast('目標日は開始日より後にしてください');return}
    if(startWeight===goalWeight){toast('開始体重と目標体重を変えてください');return}
    if(scoreTotal!==100){toast(`配点の合計を100点にしてください（現在${scoreTotal}点）`);return}
    st.settings={...st.settings,startDate,startWeight,goalDate,goalWeight,calorieTarget,stepTarget,proteinTarget,scoreWeights};
    saveState();applyScoring();render();fillPlanSettings();updateHomeTargets();toast('設定を保存しました');
  }
  const savePlan=$('savePlan');if(savePlan){savePlan.textContent='体重目標を保存';savePlan.onclick=saveEverything}
  $('saveAllSettings').onclick=saveEverything;

  const homeRows=$('todayRows'),homeCard=document.createElement('div');homeCard.className='card';
  homeCard.innerHTML=`<div class="rowhead"><div><div class="sub">1日の健康目標</div><div id="targetsHome" style="font-size:16px;font-weight:850"></div></div><div class="sub">設定から変更可能</div></div>`;
  homeRows?.parentNode?.insertBefore(homeCard,homeRows);
  function updateHomeTargets(){
    const el=$('targetsHome');if(el)el.innerHTML=`${Number(st.settings.calorieTarget).toLocaleString()} kcal<br>${Number(st.settings.stepTarget).toLocaleString()}歩 ・ P ${Number(st.settings.proteinTarget).toLocaleString()}g`;
    updateStaticCards();
  }

  fillAdvanced();updateHomeTargets();
  const version=document.querySelector('.version');if(version)version.textContent='Health Score v0.3.3';
  saveState();
})();