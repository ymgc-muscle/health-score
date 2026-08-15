(()=>{
  const VERSION='0.4.0';
  const DEFAULT_SCORE_WEIGHTS={weight:5,breakfast:10,lunch:20,buying:25,dinner:15,protein:10,steps:10,hiit:5};

  /* ---------- visual polish ---------- */
  const style=document.createElement('style');
  style.textContent=`
    .sub,.metric .label{font-size:12px}
    .help{font-size:13px;line-height:1.7}
    .criteria{font-size:13px;line-height:1.7}
    nav button{font-size:11px}
    input,textarea{font-size:16px}
    .critical,.ux-hide-home-targets{display:none!important}
    .ux-next{background:linear-gradient(135deg,#fff8ed,#fff);border-color:#ffd7b2}
    .ux-next-main{font-size:17px;font-weight:850;margin-top:5px;line-height:1.45}
    .ux-next-done{color:#118348}
    .ux-autosave{display:flex;align-items:center;justify-content:center;min-height:44px;font-size:13px;font-weight:800;color:#667078;margin-top:4px}
    .ux-autosave.ok{color:#118348}.ux-autosave.saving{color:#9d6a00}
    .day.partial .cscore{background:#edf0f2!important;color:#69727b!important}
    .day.partial{border-color:#dfe3e6}
    .ux-settings-heading{font-size:12px;font-weight:850;color:#747980;letter-spacing:.08em;margin:6px 4px 9px;text-transform:uppercase}
    .ux-advanced{background:transparent;border:0;padding:0;margin:0 0 12px}
    .ux-advanced>summary{list-style:none;background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 15px;font-size:15px;box-shadow:0 2px 8px #0000000c}
    .ux-advanced>summary::-webkit-details-marker{display:none}
    .ux-advanced>summary:after{content:'⌄';float:right;color:#777}
    .ux-advanced[open]>summary{margin-bottom:10px}.ux-advanced[open]>summary:after{content:'⌃'}
    .ux-check-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}
    #todayRows{cursor:pointer}
    .ux-onboard{position:fixed;inset:0;z-index:100;background:#f5f6f7;overflow:auto;padding:24px 14px 40px}
    .ux-onboard-inner{max-width:540px;margin:0 auto}
    .ux-onboard-logo{width:58px;height:58px;border-radius:17px;background:linear-gradient(135deg,var(--o),var(--o2));color:#fff;display:grid;place-items:center;font-size:28px;font-weight:900;margin:12px auto 16px}
    .ux-onboard h1{text-align:center;font-size:24px;margin:0 0 7px}
    .ux-onboard-lead{text-align:center;color:#687079;font-size:14px;line-height:1.6;margin-bottom:22px}
    .ux-onboard .card{padding:18px}
    .ux-onboard-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}
    .ux-onboard .field label{font-size:12px}
    .ux-onboard-note{font-size:12px;color:#747980;line-height:1.6;margin-top:12px}
    @media(max-width:430px){.ux-onboard-grid{grid-template-columns:1fr}.score strong{font-size:48px}}
  `;
  document.head.appendChild(style);

  /* ---------- helpers ---------- */
  const entryComplete=e=>!!(e&&e.weight!=null&&e.breakfast&&e.lunch&&e.buying&&e.dinner&&e.protein&&e.steps!=null&&e.hiit);
  const hasMeaningful=e=>!!(e&&(e.weight!=null||e.steps!=null||(e.memo||'').trim()||e.breakfast||e.lunch||e.buying||e.dinner||e.protein||e.hiit));
  const labelMap={weight:'体重',breakfast:'朝食',lunch:'昼食',buying:'買い食い',dinner:'夕食',protein:'たんぱく質',steps:'歩数',hiit:'運動'};

  /* ---------- existing users skip onboarding ---------- */
  if(Object.keys(st.entries||{}).length>0&&!st.settings.onboardingCompleted){
    st.settings.onboardingCompleted=true;
    saveState();
  }

  /* ---------- first-run setup ---------- */
  function showOnboarding(){
    if(st.settings.onboardingCompleted||Object.keys(st.entries||{}).length>0)return;
    const d=new Date();d.setDate(d.getDate()+30);
    const goalDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const el=document.createElement('div');el.className='ux-onboard';
    el.innerHTML=`<div class="ux-onboard-inner">
      <div class="ux-onboard-logo">✓</div><h1>Health Scoreを設定</h1>
      <div class="ux-onboard-lead">最初に目標を決めます。あとから設定画面でいつでも変更できます。</div>
      <div class="card"><div class="title">体重目標</div><div class="ux-onboard-grid" style="margin-top:13px">
        <div class="field"><label>開始体重 (kg)</label><input id="obStartWeight" type="number" step="0.1" placeholder="例 75.0"></div>
        <div class="field"><label>目標体重 (kg)</label><input id="obGoalWeight" type="number" step="0.1" placeholder="例 70.0"></div>
        <div class="field"><label>目標日</label><input id="obGoalDate" type="date" value="${goalDate}"></div>
      </div></div>
      <div class="card"><div class="title">1日の健康目標</div><div class="ux-onboard-grid" style="margin-top:13px">
        <div class="field"><label>摂取カロリー (kcal)</label><input id="obCalories" type="number" step="50" value="1800"></div>
        <div class="field"><label>歩数</label><input id="obSteps" type="number" step="500" value="10000"></div>
        <div class="field"><label>たんぱく質 (g)</label><input id="obProtein" type="number" step="5" value="100"></div>
      </div><div class="ux-onboard-note">スコア配点は標準の100点設定で開始します。必要なら詳細設定で変更できます。</div></div>
      <button class="btn" id="obStart" type="button">この設定ではじめる</button>
    </div>`;
    document.body.appendChild(el);
    el.querySelector('#obStart').onclick=()=>{
      const startWeight=+el.querySelector('#obStartWeight').value,goalWeight=+el.querySelector('#obGoalWeight').value;
      const gd=el.querySelector('#obGoalDate').value,calorieTarget=+el.querySelector('#obCalories').value,stepTarget=+el.querySelector('#obSteps').value,proteinTarget=+el.querySelector('#obProtein').value;
      if(!Number.isFinite(startWeight)||startWeight<=0||!Number.isFinite(goalWeight)||goalWeight<=0||!gd){toast('体重と目標日を入力してください');return}
      if(new Date(gd+'T00:00:00')<=new Date(today()+'T00:00:00')){toast('目標日は今日より後にしてください');return}
      if(!Number.isFinite(calorieTarget)||calorieTarget<1000||!Number.isFinite(stepTarget)||stepTarget<1000||!Number.isFinite(proteinTarget)||proteinTarget<20){toast('健康目標の値を確認してください');return}
      st.settings={...st.settings,startDate:today(),startWeight,goalDate:gd,goalWeight,calorieTarget,stepTarget,proteinTarget,scoreWeights:{...DEFAULT_SCORE_WEIGHTS},onboardingCompleted:true};
      saveState();location.reload();
    };
  }

  /* ---------- compact home + goal wording ---------- */
  const oldRenderHome=renderHome;
  renderHome=function(){oldRenderHome();updateHomeUX()};
  function updateGoalWording(){
    const e=ent(today()),p=plan(),w=+e.weight,sw=+p.startWeight,gw=+p.goalWeight,remainEl=$('remain');
    if(!remainEl||!Number.isFinite(w)||!Number.isFinite(sw)||!Number.isFinite(gw))return;
    const label=remainEl.parentElement?.querySelector('.sub');
    const direction=Math.sign(gw-sw);
    const left=direction<0?w-gw:gw-w;
    if(Math.abs(w-gw)<0.05){if(label)label.textContent='';remainEl.textContent='目標達成！';remainEl.style.fontSize='21px';return}
    remainEl.style.fontSize='28px';
    if(left>0){if(label)label.textContent='あと';remainEl.textContent=Math.abs(left).toFixed(1)+' kg'}
    else{if(label)label.textContent='目標より';const delta=w-gw;remainEl.textContent=(delta>0?'+':'')+delta.toFixed(1)+' kg'}
  }
  function updateHomeUX(){
    document.querySelector('.critical')?.classList.add('ux-hidden');
    const targetHome=$('targetsHome');if(targetHome)targetHome.closest('.card')?.classList.add('ux-hide-home-targets');
    updateGoalWording();
    let next=$('uxNext');
    if(!next){next=document.createElement('div');next.id='uxNext';next.className='card ux-next';const hero=document.querySelector('#home .hero');hero?.after(next)}
    const e=ent(today()),missing=[];
    for(const k of ['weight','breakfast','lunch','buying','dinner','protein','steps','hiit']){
      const done=k==='weight'?e.weight!=null:k==='steps'?e.steps!=null:!!e[k];
      if(!done)missing.push(labelMap[k]);
    }
    if(!missing.length)next.innerHTML='<div class="sub">今日の記録</div><div class="ux-next-main ux-next-done">すべて入力済み ✓</div>';
    else{const shown=missing.slice(0,3),more=missing.length-3;next.innerHTML=`<div class="sub">今日の残り</div><div class="ux-next-main">${shown.join(' ・ ')}${more>0?` <span class="sub">＋${more}</span>`:''}</div>`}
    const rows=$('todayRows');
    if(rows&&!rows.querySelector('.ux-check-title'))rows.insertAdjacentHTML('afterbegin','<div class="ux-check-title"><span class="title">今日のチェック</span><span class="sub">タップして入力</span></div>');
  }
  $('todayRows')?.addEventListener('click',()=>goto('input'));

  /* ---------- auto save ---------- */
  const saveBtn=$('save');
  if(saveBtn){saveBtn.style.display='none';const s=document.createElement('div');s.id='uxAutosave';s.className='ux-autosave ok';s.textContent='変更は自動保存されます';saveBtn.after(s)}
  let autoTimer=null;
  function setSaveStatus(text,cls){const s=$('uxAutosave');if(!s)return;s.textContent=text;s.className='ux-autosave '+cls}
  function saveCaptured(d,e){
    if(hasMeaningful(e))st.entries[d]=e;else delete st.entries[d];
    saveState();setSaveStatus('保存済み ✓','ok');
    renderHome();renderCalendar();weekly();
  }
  function scheduleAutosave(delay=260){
    const d=$('date')?.value;if(!d)return;
    const e=collectForm();setSaveStatus('保存中…','saving');clearTimeout(autoTimer);autoTimer=setTimeout(()=>saveCaptured(d,e),delay);
  }
  ['weight','steps','memo'].forEach(id=>$(id)?.addEventListener('input',()=>scheduleAutosave(id==='memo'?450:280)));
  document.addEventListener('click',ev=>{if(ev.target.closest('.seg button'))setTimeout(()=>scheduleAutosave(80),0)});

  /* ---------- partial days are neutral gray ---------- */
  const oldRenderCalendar=renderCalendar;
  renderCalendar=function(){
    oldRenderCalendar();
    document.querySelectorAll('.day[data-date]').forEach(day=>{
      const d=day.dataset.date,e=st.entries[d];if(!e||entryComplete(e))return;
      day.classList.remove('green','yellow','orange','red');day.classList.add('partial');
      const sc=day.querySelector('.cscore');if(sc)sc.title='入力途中';
    });
  };

  /* ---------- settings information architecture ---------- */
  function cardByTitle(text){return [...document.querySelectorAll('#settings .card')].find(c=>c.querySelector('.title')?.textContent.trim()===text)}
  function organizeSettings(){
    const settings=$('settings'),weightCard=cardByTitle('体重目標・期間'),healthCard=cardByTitle('健康目標'),scoreCard=cardByTitle('スコア配点'),evalCard=cardByTitle('評価基準'),backupCard=$('export')?.closest('.card');
    if(!settings||!weightCard)return;
    if(!settings.querySelector('.ux-settings-heading')){const h=document.createElement('div');h.className='ux-settings-heading';h.textContent='基本設定';settings.insertBefore(h,weightCard)}
    const savePlan=$('savePlan');if(savePlan)savePlan.textContent='基本設定を保存';
    if(scoreCard&&!$('resetScoreWeights')){
      const reset=document.createElement('button');reset.id='resetScoreWeights';reset.className='btn2';reset.type='button';reset.style.marginTop='8px';reset.textContent='配点を初期値に戻す';
      scoreCard.appendChild(reset);
      reset.onclick=()=>{for(const[k,v]of Object.entries(DEFAULT_SCORE_WEIGHTS)){const inp=$(`score_${k}`);if(inp){inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}))}}toast('初期配点をセットしました。保存で確定します')};
    }
    if(!settings.querySelector('.ux-advanced')&&(scoreCard||evalCard||backupCard)){
      const details=document.createElement('details');details.className='ux-advanced';details.innerHTML='<summary>詳細設定</summary><div class="ux-advanced-body"></div>';
      const body=details.querySelector('.ux-advanced-body');
      const anchor=healthCard||weightCard;anchor.after(details);
      [scoreCard,evalCard,backupCard].forEach(c=>{if(c)body.appendChild(c)});
    }
  }
  organizeSettings();

  /* ---------- render wrappers now active ---------- */
  const oldGoto=goto;
  goto=function(id){oldGoto(id);if(id==='settings')organizeSettings();if(id==='home')updateHomeUX()};
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

  const version=document.querySelector('.version');if(version)version.textContent=`Health Score v${VERSION}`;
  renderHome();renderCalendar();
  showOnboarding();
})();