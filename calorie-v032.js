(()=>{
  const round10=n=>Math.round(n/10)*10;
  DEFAULT_SETTINGS.calorieTarget=1800;
  st.settings={...DEFAULT_SETTINGS,...(st.settings||{})};
  if(!Number.isFinite(+st.settings.calorieTarget))st.settings.calorieTarget=1800;

  const bands=(target=+st.settings.calorieTarget)=>{const t=Math.max(1000,Number(target)||1800);return{breakfast:[round10(t*.18),round10(t*.25)],lunch:[round10(t*.25),round10(t*.39)],dinner:[round10(t*.28),round10(t*.36)],snack:[round10(t*.05),round10(t*.10)]}};
  const criteria=(k)=>{const b=bands();
    if(k==='breakfast')return `<span class="cg"><b>◎ 10点</b>：<b>${b.breakfast[0]}〜${b.breakfast[1]} kcal</b>を基本帯に、たんぱく質を確保し、甘い飲み物・菓子パン中心にしない。</span><br><span class="cy"><b>○ 7点</b>：基本帯から少し外れる、またはたんぱく質不足・脂質/糖質に偏り。</span><br><span class="cr"><b>× 0点</b>：明らかな食べ過ぎ、または極端に少なく後で強い空腹を招く食事。</span>`;
    if(k==='lunch')return `<span class="cg"><b>◎ 20点</b>：<b>${b.lunch[0]}〜${b.lunch[1]} kcal</b>を基本帯に、たんぱく質20g前後以上＋野菜あり＋主食適量。定食だけでなく具のしっかり入った麺類も可。</span><br><span class="cy"><b>○ 12点</b>：基本帯から少し外れる、またはカロリー内でもたんぱく質・野菜不足、脂質・塩分が高め。</span><br><span class="cr"><b>× 0点</b>：大幅なオーバー、麺＋炒飯/ライス、大盛りカレー＋揚げ物など明確な食べ過ぎ。</span><br><span style="color:#666">※カロリーだけで決めず、栄養バランスで1段階調整。</span>`;
    if(k==='dinner')return `<span class="cg"><b>◎ 15点</b>：<b>${b.dinner[0]}〜${b.dinner[1]} kcal</b>を基本帯に、主菜＋野菜＋適量の主食。</span><br><span class="cy"><b>○ 10点</b>：基本帯から少し外れる、または脂質・塩分が高めだが量は抑えた。</span><br><span class="cr"><b>× 0点</b>：揚げ物＋大盛り炭水化物＋追加食など明確な食べ過ぎ。</span>`;
    if(k==='buying')return `<span class="cg"><b>◎ 25点</b>：不要な買い食いをしなかった。</span><br><span class="cy"><b>○ 20点</b>：夕食まで長く空くため、<b>${b.snack[0]}〜${b.snack[1]} kcal程度</b>の計画的補食（プロテイン、無糖ヨーグルト、ゆで卵等）。</span><br><span class="cr"><b>× 0点</b>：予定外の菓子パン・牛丼・ホットスナック等を追加し、その後も普通に夕食。</span>`;
    return cfg[k].c;
  };
  const applyCriteria=()=>{['breakfast','lunch','dinner','buying'].forEach(k=>cfg[k].c=criteria(k));buildRated();fill();};
  applyCriteria();

  const settings=document.getElementById('settings');
  const evalCard=document.getElementById('allCriteria')?.closest('.card');
  const calorieCard=document.createElement('div');
  calorieCard.className='card';
  calorieCard.innerHTML=`<div class="title">摂取カロリー目標</div><div class="help">1日の目標値から、朝・昼・夜の「◎カロリー帯」を自動計算します。低すぎる食事も◎にしない設計です。</div><div style="margin-top:12px"><label class="sub" for="setCalorieTarget">1日の目標摂取カロリー (kcal)</label><input type="number" id="setCalorieTarget" step="50" min="1000" max="5000"></div><div id="calorieGuide" style="margin-top:12px;background:#fff8ed;border:1px solid #ffd9b8;border-radius:12px;padding:12px"></div>`;
  if(settings&&evalCard)settings.insertBefore(calorieCard,evalCard);
  const input=document.getElementById('setCalorieTarget');
  const guide=document.getElementById('calorieGuide');
  const drawGuide=(value)=>{const b=bands(value);guide.innerHTML=`<div class="sub">自動計算される◎の目安</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><div><b>朝食 ${b.breakfast[0]}〜${b.breakfast[1]} kcal</b></div><div><b>昼食 ${b.lunch[0]}〜${b.lunch[1]} kcal</b></div><div><b>夕食 ${b.dinner[0]}〜${b.dinner[1]} kcal</b></div><div><b>補食 ${b.snack[0]}〜${b.snack[1]} kcal</b></div></div><div class="sub" style="margin-top:8px">朝18〜25%、昼25〜39%、夜28〜36%。栄養バランス・脂質・塩分で最終評価を調整します。</div>`;};
  input.value=st.settings.calorieTarget;drawGuide(input.value);input.addEventListener('input',()=>drawGuide(input.value));

  const oldFillPlanSettings=fillPlanSettings;
  fillPlanSettings=function(){oldFillPlanSettings();input.value=st.settings.calorieTarget;drawGuide(input.value)};
  const saveBtn=document.getElementById('savePlan');
  saveBtn.onclick=()=>{const startDate=$('setStartDate').value,goalDate=$('setGoalDate').value;const startWeight=+$('setStartWeight').value,goalWeight=+$('setGoalWeight').value,calorieTarget=+input.value;if(!startDate||!goalDate||!Number.isFinite(startWeight)||!Number.isFinite(goalWeight)||startWeight<=0||goalWeight<=0||!Number.isFinite(calorieTarget)||calorieTarget<1000||calorieTarget>5000){toast('設定値を確認してください');return}if(new Date(goalDate+'T00:00:00')<=new Date(startDate+'T00:00:00')){toast('目標日は開始日より後にしてください');return}if(startWeight===goalWeight){toast('開始体重と目標体重を変えてください');return}st.settings={...st.settings,startDate,startWeight,goalDate,goalWeight,calorieTarget};saveState();applyCriteria();render();fillPlanSettings();updateHomeCalorie();toast('設定を保存しました')};

  const homeRows=document.getElementById('todayRows');
  const homeCard=document.createElement('div');homeCard.className='card';homeCard.innerHTML='<div class="rowhead"><div><div class="sub">1日の摂取カロリー目標</div><div id="calorieTargetHome" style="font-size:23px;font-weight:850"></div></div><div class="sub">設定から変更可能</div></div>';
  homeRows?.parentNode?.insertBefore(homeCard,homeRows);
  function updateHomeCalorie(){const el=document.getElementById('calorieTargetHome');if(el)el.textContent=Number(st.settings.calorieTarget).toLocaleString()+' kcal'}
  updateHomeCalorie();

  const version=document.querySelector('.version');if(version)version.textContent='Health Score v0.3.2';
  saveState();
})();