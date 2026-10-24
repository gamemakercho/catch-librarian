/* Dependency-free post-answer story. Quiz and completion storage remain in app.js. */
(function(global){
 'use strict';
 const script=document.currentScript;
 const defaultBase=script?.src?new URL('./assets/',script.src).href:new URL('./after-ending/assets/',document.baseURI).href;
 const stages=Object.freeze([
  Object.freeze({id:'returned',title:'철푸덕!',speaker:'사서',text:'손이다… 내 손!\n돌아왔다!',next:'다음으로'}),
  Object.freeze({id:'thanks',title:'',speaker:'사서',text:'책도 바닥도, 나까지 구해 줬네\n정말 고마워!',next:'다음으로'}),
  Object.freeze({id:'cat',title:'',speaker:'고양이',text:'냐옹',next:'다음으로'}),
  Object.freeze({id:'promise',title:'',speaker:'사서',text:'너도 오늘 수고했다\n내일은… 얌전히 책만 보자',next:'모험 마치기'}),
  Object.freeze({id:'complete',title:'고양이와 사서가 돌아왔다!',speaker:'',text:'오늘 도서관을 지켜 줘서 고마워요',next:'이야기 처음부터'})
 ]);
 function mount(root,options={}){
  if(!root||root.nodeType!==1)throw Error('후반 장면을 넣을 HTML 요소가 필요합니다');
  const section=document.createElement('section');section.className='after-ending';section.hidden=true;section.setAttribute('aria-label','원래 모습으로 돌아온 두 친구');
  section.innerHTML='<header class="ae-heading"><span class="ae-kicker">다시, 제자리로</span><h2 class="ae-title"></h2></header><figure class="ae-picture"><img class="ae-image" alt="로비 바닥에 철푸덕 앉은 사서와 옆에 있는 고양이" width="720" height="540"><figcaption class="ae-loading" role="status">그림을 불러오는 중…</figcaption></figure><div class="ae-dialogue" aria-live="polite"><p class="ae-speaker"></p><p class="ae-text"></p></div><button type="button" class="ae-next"></button><button type="button" class="ae-retry" hidden>그림 다시 불러오기</button>';
  root.append(section);const find=s=>section.querySelector(s),image=find('.ae-image'),loading=find('.ae-loading'),retry=find('.ae-retry'),button=find('.ae-next');
  let step=0,finished=false,notified=false,visible=false,artStarted=false,destroyed=false,advancing=false,restartRequested=false,generation=0,shownAt=0,lastAdvanceAt=-Infinity,keyboardArmed=false;
  const now=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now();
  const source=()=>options.images?.['returned-scene.webp']||new URL('returned-scene.webp',options.assetBase||defaultBase).href;
  const snapshot=()=>({version:1,answerConfirmed:true,step,finished});
  const call=(fn,value)=>{if(typeof fn==='function')fn(value);};
  function loadArt(force=false){if(destroyed||(artStarted&&!force))return;artStarted=true;loading.hidden=false;retry.hidden=true;loading.textContent='그림을 불러오는 중…';
   image.onload=()=>{if(destroyed)return;loading.hidden=true;retry.hidden=true;section.setAttribute('aria-busy','false');};
   image.onerror=()=>{if(destroyed)return;loading.textContent='그림을 읽지 못했어 다시 불러와 줘';loading.hidden=false;retry.hidden=false;section.setAttribute('aria-busy','false');};
   section.setAttribute('aria-busy','true');let url=source();if(force&&/^https?:/.test(url)){const next=new URL(url);next.searchParams.set('retry',String(Date.now()));url=next.href;}image.src=url;
  }
  function render({focus=false,save=true}={}){const data=stages[step];section.hidden=!visible;section.dataset.step=data.id;
   find('.ae-title').textContent=data.title;find('.ae-title').hidden=!data.title;find('.ae-speaker').textContent=data.speaker;find('.ae-speaker').hidden=!data.speaker;find('.ae-text').textContent=data.text;button.textContent=data.next;
   if(visible)loadArt();if(save)call(options.onChange,snapshot());if(focus&&visible&&!destroyed)button.focus({preventScroll:true});
  }
  function show(saved={}){if(destroyed)return snapshot();generation++;step=Number.isInteger(saved.step)&&saved.step>=0&&saved.step<stages.length?saved.step:0;finished=saved.finished===true||step===4;if(finished)step=4;notified=finished;visible=true;restartRequested=false;keyboardArmed=false;shownAt=now();lastAdvanceAt=-Infinity;render({focus:saved.focus!==false});return snapshot();}
  function next(event){
   if(!visible||destroyed||advancing)return;
   const time=now();
   // A newly focused button must not consume the Enter/Space that submitted the quiz.
   if(event?.detail===0&&!keyboardArmed&&time-shownAt<250)return;
   if(time-lastAdvanceAt<250)return;
   keyboardArmed=false;lastAdvanceAt=time;advancing=true;const activeGeneration=generation;
   try{
    if(finished){if(!restartRequested){restartRequested=true;call(options.onRestart)}return;}
    step=Math.min(4,step+1);finished=step===4;render({focus:true});
    if(generation===activeGeneration&&finished&&!notified){notified=true;const result=snapshot();call(options.onFinish,result);if(generation===activeGeneration&&!destroyed)section.dispatchEvent(new CustomEvent('after-ending:complete',{detail:result,bubbles:true}));}
   }finally{advancing=false;}
  }
  const activationKey=e=>e.key==='Enter'||e.key===' '||e.code==='Space';
  button.addEventListener('keydown',e=>{if(!activationKey(e))return;if(e.repeat){e.preventDefault();return}keyboardArmed=true;});
  button.addEventListener('keyup',e=>{if(activationKey(e)&&!keyboardArmed)e.preventDefault();});
  button.addEventListener('click',next);retry.addEventListener('click',()=>{if(visible&&!destroyed)loadArt(true)});
  return Object.freeze({show,next,snapshot,hide(){visible=false;keyboardArmed=false;section.hidden=true;},destroy(){visible=false;destroyed=true;generation++;image.onload=image.onerror=null;section.remove();},element:section});
 }
 global.CatLibrarianAfterEnding=Object.freeze({mount,stages});
})(window);
