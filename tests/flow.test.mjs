await import('../build-offline.mjs');
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {CONFIG} from '../config.js';
import { readFile } from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const layout=JSON.parse(await readFile(new URL('../assets/sprites/sprite-layout-v2.json',import.meta.url),'utf8'));
let source=(await readFile(new URL('../after-ending/after-ending.js',import.meta.url),'utf8'))+'\n';for(const f of ['scene-data.js','config.js','props.js','collision.js','librarian-motion.js','engine.js','renderer.js','app.js'])source+=(await readFile(new URL('../'+f,import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')+'\n';
const expose='\nglobalThis.subject={game,getState:()=>state,getAfterSnapshot:()=>afterStory?.snapshot()};';source+=expose;
class Element {
 constructor({tag='div',onImage}={}){this.nodeType=1;this.tagName=tag.toUpperCase();this.listeners={};this.hidden=false;this.disabled=false;this.value='';this.textContent='';this.attrs={};this.dataset={};this.style={};this.className='';this.children=[];this.onImage=onImage;this.classList={toggle:(name,force)=>{const classes=new Set(this.className.split(/\s+/).filter(Boolean));const enabled=force??!classes.has(name);if(enabled)classes.add(name);else classes.delete(name);this.className=[...classes].join(' ');return enabled},contains:name=>this.className.split(/\s+/).includes(name)}}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
 dispatchEvent(event){event.target??=this;event.preventDefault??=()=>{event.defaultPrevented=true};for(const fn of this.listeners[event.type]||[])fn(event);return !event.defaultPrevented}
 setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]??null}removeAttribute(k){delete this.attrs[k]}
 focus(){this.focused=true}blur(){this.focused=false;this.blurCount=(this.blurCount||0)+1}
 append(...nodes){for(const child of nodes){child.parentElement=this;this.children.push(child)}}appendChild(child){this.append(child);return child}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(e=>e!==this)}
 querySelector(selector){const match=e=>selector.startsWith('.')?e.className.split(/\s+/).includes(selector.slice(1)):e.tagName.toLowerCase()===selector;for(const child of this.children){if(match(child))return child;const found=child.querySelector(selector);if(found)return found}return null}
 set innerHTML(value){this.html=value;this.children=[];for(const m of value.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*class="([^"]+)"[^>]*>/gi)){const child=new Element({tag:m[1],onImage:this.onImage});child.className=m[2];this.append(child)}}get innerHTML(){return this.html||''}
 set src(value){this.source=value;if(this.onImage&&this.tagName==='IMG'){this.onImage(value);queueMicrotask(()=>this.onload?.())}}get src(){return this.source}
 getContext(){return new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(target,key)=>target[key]||(()=>{})})}
}
class Input extends Element{}
async function setup({fail=false,offline=false,storage=new Map(),storageBlocked=false,parentOrigin=null}={}){
 const elements={};for(const match of html.matchAll(/id="([^"]+)"/g))elements[match[1]]=match[1]==='answer'?new Input():new Element();
 for(const id of ['comic-screen','puzzle-screen','after-answer-screen','complete-screen'])if(elements[id])elements[id].hidden=true;
 elements['answer-form'].reset=()=>{elements.answer.value=''};
 const requests=[],main=new Element({tag:'main'}),baseURI=offline?'file:///C:/games/catch-librarian.html':'https://test.invalid/catch-librarian/index.html';
 const document=Object.assign(new Element(),{hidden:false,baseURI,currentScript:offline?null:{src:'https://test.invalid/catch-librarian/after-ending/after-ending.js'},getElementById:id=>elements[id],querySelector:selector=>selector==='main'?main:null,createElement:tag=>new Element({tag,onImage:value=>requests.push(value)})});
 const window=new Element(),completions=[],parentMessages=[];window.parent=parentOrigin?{postMessage:(message,origin)=>parentMessages.push({message,origin})}:window;window.addEventListener('escape-room:complete',e=>completions.push(e.detail));
 let frame;let now=1000;const errors=[];
 const context={console:{error:(...e)=>errors.push(e)},document,window,URL,HTMLInputElement:Input,HTMLTextAreaElement:class extends Element{},Image:class{set src(value){requests.push(value);queueMicrotask(()=>fail?this.onerror?.():this.onload?.())}},fetch:async()=>({ok:true,json:async()=>layout}),performance:{now:()=>now},localStorage:{setItem:(k,v)=>{if(storageBlocked)throw Error('blocked');storage.set(k,v)},getItem:k=>{if(storageBlocked)throw Error('blocked');return storage.get(k)||null},removeItem:k=>{if(storageBlocked)throw Error('blocked');storage.delete(k)}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;this.bubbles=options.bubbles}},requestAnimationFrame:fn=>{frame=fn},location:{reload(){}}};
 let appSource=offline?(await readFile(new URL('../사서를잡아라_바로실행.html',import.meta.url),'utf8')).match(/<script>([\s\S]*)<\/script>/)[1]+expose:source;
 if(parentOrigin)appSource=appSource.replace('parentOrigin:null','parentOrigin:'+JSON.stringify(parentOrigin));
 vm.runInNewContext(appSource,context);await new Promise(resolve=>setImmediate(resolve));
 const fire=(id,type,extra={})=>elements[id].dispatchEvent({type,...extra});
 const after=selector=>elements['after-answer-screen'].querySelector(selector);
 const fireAfter=(type='click',extra={})=>after('.ae-next').dispatchEvent({type,detail:1,...extra});
 const advance=seconds=>{for(let i=0;i<seconds*60;i++){now+=1000/60;frame(now)}};
 return {elements,main,document,window,storage,subject:context.subject,errors,requests,completions,parentMessages,fire,fireAfter,after,advance};
}
function finishChase(t,{showComic=true}={}){
 for(let i=0;i<2400&&t.subject.getState()==='playing';i++){
  const g=t.subject.game;const next=g.obstacles.find(o=>o.kind!=='high'&&!o.hit&&o.x>g.x);
  if(g.y===0&&next&&next.x<g.x+(next.kind==='double-stack'?280:160)){t.fire('game','pointerdown',{isPrimary:true,button:0});g.testJumpTime=g.elapsed;g.testDouble=next.kind==='double-stack'}
  else if(g.testDouble&&g.jumps===1&&g.elapsed-g.testJumpTime>=.33)t.fire('game','pointerdown',{isPrimary:true,button:0});
  t.advance(1/60);
 }
 assert.ok(['ending-discovery','ending-trip','ending-fly'].includes(t.subject.getState()),t.subject.getState());assert.equal(t.subject.game.elapsed,30);
 if(showComic)t.advance(CONFIG.endingDuration+.05);
}
const AFTER_KEY=CONFIG.completionKey+':after-answer:v1';
function reachPuzzle(t){t.fire('start','click');finishChase(t);t.fire('comic-auto','click');for(let i=0;i<5;i++)t.fire('next','click');assert.equal(t.subject.getState(),'puzzle')}
function solve(t){t.elements.answer.value='고양이와 사서가 돌아왔다';t.fire('answer-form','submit');assert.equal(t.subject.getState(),'after-answer')}
function finishStory(t){for(let i=0;i<4;i++){t.advance(.3);t.fireAfter()}assert.equal(t.subject.getAfterSnapshot().step,4)}
test('asset load gate, single pointer input, double jump, space and explicit pause/resume',async()=>{const t=await setup();assert.equal(t.subject.getState(),'ready');assert.equal(t.errors.length,0);t.fire('start','click');assert.equal(t.subject.getState(),'playing');t.fire('jump','pointerdown',{isPrimary:true,button:0});assert.equal(t.subject.game.jumps,1);t.fire('jump','click',{detail:1});assert.equal(t.subject.game.jumps,1);t.fire('game','pointerdown',{isPrimary:true,button:0});assert.equal(t.subject.game.jumps,0);t.advance(1.5);assert.equal(t.subject.game.jumps,2);t.window.dispatchEvent({type:'keydown',code:'Space',target:t.elements.game,repeat:false});assert.equal(t.subject.game.jumps,1);t.fire('pause','click');const elapsed=t.subject.game.elapsed;t.advance(5);assert.equal(t.subject.game.elapsed,elapsed);t.fire('start','click');assert.equal(t.subject.getState(),'playing');t.document.hidden=true;t.document.dispatchEvent({type:'visibilitychange'});assert.equal(t.subject.getState(),'paused');t.document.hidden=false;t.fire('start','click');t.advance(.1);assert.ok(t.subject.game.elapsed>elapsed)});
test('actual 30s flow and original 5 panels lead from guarded quiz directly to the first returned scene',async()=>{
 const t=await setup();t.fire('start','click');finishChase(t);assert.equal(t.subject.getState(),'comic');assert.equal(t.elements['run-screen'].hidden,true);assert.equal(t.elements['comic-screen'].hidden,false);const before=t.subject.game.y;t.fire('jump','pointerdown',{isPrimary:true,button:0});assert.equal(t.subject.game.y,before);
 t.fire('comic-auto','click');for(let p=1;p<=5;p++){assert.equal(t.elements['comic-count'].textContent,`${p} / 5`);assert.ok(t.elements['comic-image'].src.includes(`0${p}-`));t.fire('next','click')}
 assert.equal(t.subject.getState(),'puzzle');assert.equal(t.after('.after-ending'),null);assert.equal(t.requests.some(src=>src.includes('returned-scene')),false);
 t.elements.answer.value='고양이';t.fire('answer-form','submit');assert.ok(t.elements['answer-feedback'].textContent.includes('다시'));t.fire('answer','compositionstart');t.elements.answer.value='고양이와사서가돌아왔다!';t.fire('answer-form','submit');assert.equal(t.subject.getState(),'puzzle');t.fire('answer','compositionend');t.fire('answer-form','submit');assert.equal(t.subject.getState(),'puzzle');t.advance(.2);
 t.fire('answer-form','submit');assert.equal(t.subject.getState(),'after-answer');assert.equal(t.elements['puzzle-screen'].hidden,true);assert.equal(t.elements['after-answer-screen'].hidden,false);assert.equal(t.elements['complete-screen'].hidden,true);assert.equal(t.elements.answer.blurCount,1);assert.equal(t.after('.ae-title').textContent,'철푸덕!');assert.equal(t.after('.ae-speaker').textContent,'사서');assert.equal(t.after('.ae-text').textContent,'손이다… 내 손!\n돌아왔다!');assert.equal(t.completions.length,0);assert.equal(t.storage.has(CONFIG.completionKey),false);assert.equal(JSON.parse(t.storage.get(AFTER_KEY)).step,0);assert.ok(t.main.classList.contains('after-story-active'));
 const elapsed=t.subject.game.elapsed;t.advance(30);assert.equal(t.subject.getAfterSnapshot().step,0);assert.equal(t.subject.game.elapsed,elapsed);t.fire('answer-form','submit');assert.equal(t.subject.getAfterSnapshot().step,0);assert.equal(t.completions.length,0);assert.equal(t.requests.filter(src=>src.includes('returned-scene.webp')).length,1);
});
test('failure UI retry starts a fresh round and comic auto progression pauses when hidden',async()=>{const t=await setup();t.fire('start','click');t.advance(25);assert.equal(t.subject.getState(),'failed');assert.equal(t.elements.start.textContent,'다시 도전하기');t.fire('start','click');assert.equal(t.subject.game.health,3);assert.equal(t.subject.game.elapsed,0);finishChase(t);assert.equal(t.subject.getState(),'comic');t.document.hidden=true;t.advance(10);assert.equal(t.elements['comic-count'].textContent,'1 / 5');t.document.hidden=false;t.advance(4);assert.equal(t.elements['comic-count'].textContent,'2 / 5');t.advance(16);assert.equal(t.subject.getState(),'puzzle')});
test('failed image loading offers a recoverable error, never starts game',async()=>{const t=await setup({fail:true});assert.equal(t.subject.getState(),'error');assert.equal(t.elements.start.textContent,'다시 불러오기');assert.ok(t.errors.length>0);assert.equal(t.subject.game.elapsed,0)});

test('standalone offline HTML loads its actual embedded script and starts the game',async()=>{const t=await setup({offline:true});assert.equal(t.subject.getState(),'ready');assert.equal(t.errors.length,0);t.fire('start','click');t.fire('jump','pointerdown',{isPrimary:true,button:0});t.advance(.1);assert.equal(t.subject.getState(),'playing');assert.ok(t.subject.game.y>0);assert.equal(t.subject.game.jumps,1)});

test('initial scene requests only eight WebP runner images, then preloads comics after start',async()=>{const t=await setup();assert.equal(t.requests.length,8);assert.ok(t.requests.every(src=>src.endsWith('.webp')&&!src.includes('/ending/')));t.fire('start','click');assert.equal(t.requests.filter(src=>src.includes('/ending/')).length,5)});

test('arrival keeps the treat message readable for three seconds and pauses before the trip, flight and original comics',async()=>{
 const t=await setup();t.fire('start','click');finishChase(t,{showComic:false});
 assert.equal(t.elements['run-screen'].hidden,false);assert.notEqual(t.elements['comic-screen'].hidden,false);
 assert.equal(t.elements.jump.disabled,true);assert.equal(t.elements.pause.hidden,false);assert.ok(t.elements['game-message'].textContent.includes('츄르'));
 const snapshot=[t.subject.game.elapsed,t.subject.game.distance,t.subject.game.x];
 assert.equal(t.subject.getState(),'ending-discovery');assert.ok(CONFIG.discoverySeconds>=3);
 t.fire('game','pointerdown',{isPrimary:true,button:0});t.advance(2.5);assert.equal(t.subject.getState(),'ending-discovery');assert.ok(t.elements['game-message'].textContent.includes('츄르'));assert.deepEqual([t.subject.game.elapsed,t.subject.game.distance,t.subject.game.x],snapshot);
 const age=t.subject.game.endingAge;t.document.hidden=true;t.document.dispatchEvent({type:'visibilitychange'});t.advance(5);assert.equal(t.subject.game.endingAge,age);assert.equal(t.subject.getState(),'paused');t.document.hidden=false;t.fire('start','click');
 t.advance(CONFIG.endingDuration-2.5+.05);assert.equal(t.subject.getState(),'comic');assert.equal(t.elements['comic-screen'].hidden,false);assert.equal(t.elements['comic-count'].textContent,'1 / 5');
});

test('approved after-answer dialogue advances on input with debounce and final notification exactly once',async()=>{
 const t=await setup({parentOrigin:'https://escape.example'});reachPuzzle(t);solve(t);
 t.fireAfter();for(let i=0;i<8;i++)t.fireAfter();assert.equal(t.subject.getAfterSnapshot().step,1);assert.equal(t.after('.ae-speaker').textContent,'사서');assert.equal(t.after('.ae-text').textContent,'책도 바닥도, 나까지 구해 줬네\n정말 고마워!');assert.equal(t.completions.length,0);
 t.advance(.3);t.fireAfter();assert.equal(t.after('.ae-speaker').textContent,'고양이');assert.equal(t.after('.ae-text').textContent,'냐옹');
 t.advance(.3);t.fireAfter();assert.equal(t.after('.ae-speaker').textContent,'사서');assert.equal(t.after('.ae-text').textContent,'너도 오늘 수고했다\n내일은… 얌전히 책만 보자');assert.equal(t.after('.ae-next').textContent,'모험 마치기');assert.equal(t.completions.length,0);
 t.advance(.3);t.fireAfter();assert.equal(t.subject.getAfterSnapshot().finished,true);assert.equal(t.subject.getState(),'after-answer');assert.equal(t.after('.ae-title').textContent,'고양이와 사서가 돌아왔다!');assert.equal(t.after('.ae-text').textContent,'오늘 도서관을 지켜 줘서 고마워요');assert.equal(t.completions.length,1);assert.equal(t.parentMessages.length,1);assert.equal(t.parentMessages[0].origin,'https://escape.example');assert.equal(t.parentMessages[0].message.type,'escape-room:complete');assert.equal(t.completions[0].puzzleId,'cat-librarian-ending');assert.equal(t.completions[0].completed,true);assert.ok(!Number.isNaN(Date.parse(t.completions[0].completedAt)));assert.equal(JSON.parse(t.storage.get(CONFIG.completionKey)).completed,true);assert.equal(JSON.parse(t.storage.get(AFTER_KEY)).finished,true);
 for(let i=0;i<10;i++)t.fireAfter();assert.equal(t.subject.getAfterSnapshot().step,4);assert.equal(t.completions.length,1);assert.equal(t.parentMessages.length,1);t.advance(30);assert.equal(t.subject.getAfterSnapshot().step,4);assert.equal(t.completions.length,1);
});
for(let step=0;step<=4;step++)test(`refresh restores after-answer step ${step} without replay or completion notification`,async()=>{
 const saved={version:1,answerConfirmed:true,step,finished:step===4},storage=new Map([[AFTER_KEY,JSON.stringify(saved)]]);if(step===4)storage.set(CONFIG.completionKey,JSON.stringify({completed:true,completedAt:'2026-10-24T00:00:00.000Z'}));
 const t=await setup({storage});assert.equal(t.subject.getState(),'after-answer');assert.equal(t.subject.getAfterSnapshot().step,step);assert.equal(t.subject.getAfterSnapshot().finished,step===4);assert.equal(t.completions.length,0);assert.equal(t.subject.game.elapsed,0);assert.equal(t.elements['after-answer-screen'].hidden,false);t.advance(10);assert.equal(t.subject.getAfterSnapshot().step,step);assert.equal(t.completions.length,0);
});
test('legacy completion remains recognized, even with malformed or incompatible after-answer data',async()=>{
 for(const invalid of [null,'{broken',JSON.stringify({version:2,answerConfirmed:true,step:3,finished:false}),JSON.stringify({version:1,answerConfirmed:false,step:0,finished:false})]){
  const storage=new Map([[CONFIG.completionKey,JSON.stringify({completed:true})]]);if(invalid!==null)storage.set(AFTER_KEY,invalid);const t=await setup({storage});assert.equal(t.subject.getState(),'complete');assert.equal(t.elements['complete-screen'].hidden,false);assert.equal(t.completions.length,0);assert.equal(t.requests.some(src=>src.includes('returned-scene')),false);
 }
});
test('new progress takes precedence over legacy completed, and restart removes only the two game keys',async()=>{
 const unrelated='other-game:progress';const storage=new Map([[CONFIG.completionKey,JSON.stringify({completed:true})],[AFTER_KEY,JSON.stringify({version:1,answerConfirmed:true,step:1,finished:false})],[unrelated,'keep']]);const t=await setup({storage});assert.equal(t.subject.getState(),'after-answer');assert.equal(t.subject.getAfterSnapshot().step,1);assert.equal(t.completions.length,0);
 for(let i=1;i<4;i++){t.advance(.3);t.fireAfter()}assert.equal(t.completions.length,1);t.advance(.3);t.fireAfter();assert.equal(t.subject.getState(),'ready');assert.equal(t.subject.game.health,3);assert.equal(t.subject.game.elapsed,0);assert.equal(t.elements.answer.value,'');assert.equal(t.elements['after-answer-screen'].hidden,true);assert.equal(t.main.classList.contains('after-story-active'),false);assert.equal(t.storage.has(CONFIG.completionKey),false);assert.equal(t.storage.has(AFTER_KEY),false);assert.equal(t.storage.get(unrelated),'keep');assert.equal(t.storage.size,1);t.fire('start','click');assert.equal(t.subject.getState(),'playing');
});
test('blocked storage still permits story completion and a fresh local restart',async()=>{
 const t=await setup({storageBlocked:true});reachPuzzle(t);solve(t);finishStory(t);assert.equal(t.completions.length,1);assert.equal(t.storage.size,0);t.advance(.3);t.fireAfter();assert.equal(t.subject.getState(),'ready');assert.equal(t.subject.game.health,3);
});
test('offline HTML shows the returned scene from embedded data without an after-ending file request',async()=>{
 const t=await setup({offline:true});reachPuzzle(t);solve(t);assert.ok(t.after('.ae-image').src.startsWith('data:image/webp;base64,'));assert.equal(t.completions.length,0);assert.equal(t.requests.some(src=>/^https?:|^file:/.test(src)),false);finishStory(t);assert.equal(t.completions.length,1);assert.equal(t.errors.length,0);
});
