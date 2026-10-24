import {SPRITE_LAYOUT,SCENE_IMAGE_FILES} from './scene-data.js?v=20261024-balance6';
import { CONFIG } from './config.js?v=20261024-balance6';
import { Chase, isCorrectAnswer } from './engine.js?v=20261024-balance6';
import { Renderer } from './renderer.js?v=20261024-balance6';
const $ = id => document.getElementById(id);
const game = new Chase();
const comicFiles = ['01-chase','02-treat','03-sparkle','04-trip','05-jump'].map(x=>`assets/ending/ending-${x}.webp`);
const comicAlts = ['사서의 뒤를 헉헉대며 쫓아가는 고양이','사서의 뒷통수 너머로 보이는 츄르','츄르를 발견하고 눈이 십자가 모양으로 빛나는 사서','넘어진 사서의 운동화와 놀란 고양이','바닥에서 올려다본 시점, 큰 앞발을 내밀며 뛰어드는 고양이'];
let state='loading', renderer, lastTime=null, ambient=0, panel=0, comicElapsed=0, autoComic=true, composing=false, compositionEnded=0, priorHits=0;
const afterAnswerKey=CONFIG.completionKey+':after-answer:v1';
let afterStory=null,afterProgress=null,completionAnnounced=false;
const paw = '<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="7" cy="12" rx="4" ry="5" transform="rotate(-25 7 12)"/><ellipse cx="14" cy="7" rx="4" ry="5"/><ellipse cx="23" cy="9" rx="4" ry="5" transform="rotate(18 23 9)"/><ellipse cx="28" cy="17" rx="3.5" ry="4.5" transform="rotate(35 28 17)"/><path d="M7 25c0-5 6-11 10-10s10 7 9 12c-1 5-7 2-10 2S7 30 7 25Z"/></svg>';
function hud(){
 $('time').innerHTML=`${Math.ceil(Math.max(0,CONFIG.duration-game.elapsed))}<small>초</small>`;
 $('paws').innerHTML=Array.from({length:CONFIG.health},(_,i)=>`<span style="opacity:${i<game.health?1:.2}">${paw}</span>`).join('');
 $('paws').setAttribute('aria-label',`체력 ${game.health}칸`);
 $('jump-dots').textContent=Array.from({length:2},(_,i)=>i<game.jumps?'●':'○').join(' ');$('jump-dots').setAttribute('aria-label',`남은 점프 ${game.jumps}회`);
}
let previousHUD='';function syncHUD(){const key=[Math.ceil(CONFIG.duration-game.elapsed),game.health,game.jumps].join();if(key!==previousHUD){hud();previousHUD=key}}
function showScreen(name){document.querySelector('main')?.classList.toggle('after-story-active',name==='after-answer');for(const id of ['run','comic','puzzle','after-answer','complete'])$(id+'-screen').hidden=id!==name;if(name!=='after-answer')afterStory?.hide();for(const id of ['run','comic','puzzle']){const el=$('step-'+id);if(id===name||(['after-answer','complete'].includes(name)&&id==='puzzle'))el.setAttribute('aria-current','step');else el.removeAttribute('aria-current')}window.scrollTo?.({top:0,left:0,behavior:'auto'})}
function overlay(title,copy,button,label='도서관의 마지막 추격전'){$('overlay').hidden=false;$('overlay-title').textContent=title;$('overlay-copy').textContent=copy;$('overlay-label').textContent=label;$('start').textContent=button;$('start').disabled=false;$('pause').hidden=true;$('jump').disabled=true}
let pausedState='playing';
const endingStates=['ending-discovery','ending-trip','ending-fly','ending-gap'];
let comicPreloads;function preloadComics(){comicPreloads??=comicFiles.map(src=>{const img=new Image();img.decoding='async';img.src=src;return img})}
function start(){preloadComics();game.start();state='playing';priorHits=0;lastTime=null;$('overlay').hidden=true;$('pause').hidden=false;$('jump').disabled=false;$('game-message').textContent='책장 사이로 출발!';syncHUD()}
function jump(){if(state!=='playing')return;game.jump();syncHUD()}
function pause(){if(state!=='playing'&&!endingStates.includes(state))return;pausedState=state;state='paused';game.state='paused';overlay('잠깐, 책갈피를 꽂아 둘게.','준비가 되면 모험을 이어가 주세요.','계속 달리기','모험을 잠시 쉬는 중');lastTime=null}
function resume(){state=pausedState;game.state=pausedState;$('overlay').hidden=true;$('pause').hidden=false;$('jump').disabled=state!=='playing';lastTime=null}
$('start').addEventListener('click',()=>{if(state==='paused')resume();else if(state==='error')location.reload();else if(state==='ready'||state==='failed')start()});
$('pause').addEventListener('click',pause);
// Pointer events are the only touch/mouse jump source: no duplicate touch + click.
for(const el of [$('game'),$('jump')])el.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;e.preventDefault();jump()});
$('jump').addEventListener('click',e=>{if(e.detail===0)jump()});
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.isComposing)return;if(e.code==='Space'&&state==='playing'){e.preventDefault();if(!e.repeat)jump()}if(e.code==='Escape'&&(state==='playing'||endingStates.includes(state)))pause();if(e.code==='F2'&&renderer){e.preventDefault();renderer.debug=!renderer.debug}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();lastTime=null});
window.addEventListener('pagehide',pause);
window.addEventListener('resize',()=>renderer?.resize());
function ending(){state=game.state;$('jump').disabled=true;$('pause').hidden=false;$('game-message').textContent='앗, 저 앞에 츄르가!'}
function comic(){state='comic';game.state='comic';game.obstacles=[];$('jump').disabled=true;$('game-message').textContent='';panel=0;comicElapsed=0;showScreen('comic');setPanel();$('next').focus({preventScroll:true})}
function setPanel(){comicElapsed=0;$('comic-image').src=comicFiles[panel];$('comic-image').alt=comicAlts[panel];$('comic-count').textContent=`${panel+1} / 5`;$('comic-progress').innerHTML=comicFiles.map((_,i)=>`<span class="${i<=panel?'active':''}"></span>`).join('');$('next').textContent=panel===4?'엽서 펼치기 →':'다음 →'}
function nextPanel(){if(state!=='comic')return;if(panel<4){panel++;setPanel()}else{state='puzzle';showScreen('puzzle');$('answer').focus({preventScroll:true})}}
$('next').addEventListener('click',nextPanel);
$('comic-auto').addEventListener('click',()=>{autoComic=!autoComic;comicElapsed=0;$('comic-auto').textContent=autoComic?'자동 넘김 끄기':'자동 넘김 켜기';$('comic-auto').setAttribute('aria-pressed',String(autoComic))});
$('answer').addEventListener('compositionstart',()=>{composing=true});$('answer').addEventListener('compositionend',()=>{composing=false;compositionEnded=performance.now()});
$('answer').addEventListener('keydown',e=>{if(e.key==='Enter'&&(composing||e.isComposing||e.keyCode===229)){e.preventDefault()}});
$('answer').addEventListener('input',()=>{$('answer-feedback').textContent='';$('answer').removeAttribute('aria-invalid')});
$('answer-form').addEventListener('submit',e=>{e.preventDefault();if(state!=='puzzle'||composing||performance.now()-compositionEnded<80)return;const value=$('answer').value;if(!value.trim()){$('answer-feedback').textContent='엽서에서 찾은 문장을 적어 주세요.';$('answer').focus();return}if(!isCorrectAnswer(value)){$('answer-feedback').textContent='아직 이야기가 완성되지 않았어요. 접은 모서리를 다시 살펴봐 주세요.';$('answer').setAttribute('aria-invalid','true');return}beginAfterAnswer()});
function normalizeAfterProgress(saved){
 if(!saved||saved.version!==1||saved.answerConfirmed!==true||!Number.isInteger(saved.step)||saved.step<0||saved.step>4||typeof saved.finished!=='boolean')return null;
 const finished=saved.finished||saved.step===4;
 return {version:1,answerConfirmed:true,step:finished?4:saved.step,finished};
}
function readSavedJSON(key){try{return JSON.parse(localStorage.getItem(key))}catch{return null}}
function saveAfterProgress(saved){
 afterProgress=normalizeAfterProgress(saved);if(!afterProgress)return;
 try{localStorage.setItem(afterAnswerKey,JSON.stringify(afterProgress))}catch{/* Memory progress still works when storage is blocked. */}
}
function notifyCompletion(){
 if(completionAnnounced)return;completionAnnounced=true;
 const detail={puzzleId:'cat-librarian-ending',completed:true,completedAt:new Date().toISOString()};
 try{localStorage.setItem(CONFIG.completionKey,JSON.stringify(detail))}catch{/* Completion still succeeds without storage. */}
 window.dispatchEvent(new CustomEvent('escape-room:complete',{detail}));
 if(CONFIG.parentOrigin&&window.parent!==window)window.parent.postMessage({type:'escape-room:complete',...detail},CONFIG.parentOrigin);
}
function getAfterStory(){
 if(!afterStory){
  const images=typeof EMBEDDED!=='undefined'?{'returned-scene.webp':EMBEDDED['after-ending/assets/returned-scene.webp']}:undefined;
  afterStory=window.CatLibrarianAfterEnding.mount($('after-answer-screen'),{
   images,onChange:saveAfterProgress,
   onFinish(saved){if(state!=='after-answer')return;saveAfterProgress(saved);notifyCompletion()},
   onRestart:restart,
  });
 }
 return afterStory;
}
function beginAfterAnswer(saved){
 const restored=normalizeAfterProgress(saved);completionAnnounced=Boolean(restored?.finished);
 state='after-answer';game.state='after-answer';lastTime=null;comicElapsed=0;
 $('answer').blur();$('answer-feedback').textContent='';$('answer').removeAttribute('aria-invalid');
 showScreen('after-answer');getAfterStory().show(restored||{step:0,focus:false});
}
function complete(){
 // Legacy completion records remain valid; this screen never replaces the new story.
 completionAnnounced=true;state='complete';game.state='complete';showScreen('complete');
 $('completed-sentence').textContent='고양이와 사서가 돌아왔다';$('complete-screen').classList.toggle('reveal',false);
}
function restart(){
 for(const key of [afterAnswerKey,CONFIG.completionKey])try{localStorage.removeItem(key)}catch{/* Reset this session even when storage is unavailable. */}
 afterProgress=null;completionAnnounced=false;afterStory?.hide();game.reset();state='ready';pausedState='playing';lastTime=null;ambient=0;panel=0;comicElapsed=0;priorHits=0;composing=false;compositionEnded=0;previousHUD='';
 showScreen('run');$('answer-form').reset();$('answer-feedback').textContent='';$('answer').removeAttribute('aria-invalid');$('game-message').textContent='';autoComic=true;$('comic-auto').textContent='자동 넘김 끄기';$('comic-auto').setAttribute('aria-pressed','true');
 overlay('작은 발로, 힘껏 달려 봐!','책 더미를 피해 잠시 사서를 따라가 주세요.\n화면이나 점프 버튼을 누르면 폴짝!','모험 시작하기');hud();
}
$('replay').addEventListener('click',restart);
function frame(time){
 const dt=lastTime===null?0:Math.min((time-lastTime)/1000,.25);lastTime=time;
 if(!document.hidden){
  ambient+=dt;
  if(state==='playing'){
   game.update(dt);syncHUD();
   if(game.hits!==priorHits){priorHits=game.hits;$('game-message').textContent='앗! 괜찮아, 다시 폴짝!'}
   else if(game.invincible===0&&game.elapsed>3)$('game-message').textContent='';
   if(game.state==='failed'){state='failed';game.failedVisualAge=0;overlay('잠깐 쉬었다, 다시 달릴까?','괜찮아! 책 더미를 잘 보고 뛰어넘어 봐.','다시 도전하기','다음엔 조금 더 멀리!')}
   else if(endingStates.includes(game.state))ending();
  }else if(endingStates.includes(state)){
   game.update(dt);if(game.state==='ending-complete')comic();else state=game.state;
  }else if(state==='failed'){game.failedVisualAge+=dt
  }else if(state==='comic'&&autoComic){comicElapsed+=dt;if(comicElapsed>=CONFIG.comicSeconds)nextPanel()}
  if(renderer&&['ready','playing','paused','failed',...endingStates].includes(state))renderer.draw(game,ambient);
 }
 requestAnimationFrame(frame);
}
async function load(){try{const files=SCENE_IMAGE_FILES;const entries=await Promise.all(files.map(src=>new Promise((resolve,reject)=>{const img=new Image();img.decoding='async';img.onload=()=>resolve([src,img]);img.onerror=()=>reject(new Error(src));img.src=src})));const images=Object.fromEntries(entries);renderer=new Renderer($('game'),images,SPRITE_LAYOUT);state='ready';overlay('작은 발로, 힘껏 달려 봐!','책 더미를 피해 잠시 사서를 따라가 주세요.\n화면이나 점프 버튼을 누르면 폴짝!','모험 시작하기');hud();const saved=normalizeAfterProgress(readSavedJSON(afterAnswerKey));if(saved)beginAfterAnswer(saved);else if(readSavedJSON(CONFIG.completionKey)?.completed===true)complete();requestAnimationFrame(frame)}catch(error){state='error';overlay('책장을 불러오지 못했어요.','인터넷 연결을 확인하고 다시 열어 주세요.','다시 불러오기','잠깐만요!');console.error('Asset loading failed:',error)}}
load();


