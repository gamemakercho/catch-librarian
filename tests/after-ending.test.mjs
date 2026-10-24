import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../after-ending/after-ending.js',import.meta.url),'utf8');
function setup({base='https://gamemakercho.github.io/catch-librarian/',embedded=false,options={}}={}){
 const requests=[],events=[],changes=[],finishes=[],restarts=[];let time=1000,focuses=0;
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.nodeType=1;this.listeners={};this.children=[];this.dataset={};this.attrs={};this.hidden=false;this.textContent=''}
  set innerHTML(html){this.html=html;this.selectors={};for(const [,tag,attrs,classes]of html.matchAll(/<([a-z0-9]+)\b([^>]*class="([^"]+)"[^>]*)>/g)){const e=new Element(tag);e.hidden=/\bhidden\b/.test(attrs);for(const c of classes.split(/\s+/))this.selectors['.'+c]=e}}
  get innerHTML(){return this.html}
  append(e){this.children.push(e);e.parentElement=this}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(e=>e!==this)}
  querySelector(selector){return this.selectors?.[selector]||null}
  setAttribute(k,v){this.attrs[k]=String(v)}
  focus(){focuses++}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
  dispatchEvent(e){e.preventDefault??=()=>{e.defaultPrevented=true};for(const fn of this.listeners[e.type]||[])fn(e);if(e.type==='after-ending:complete')events.push(e.detail);return !e.defaultPrevented}
  set src(value){this.value=value;requests.push(value)}get src(){return this.value}
 }
 const document={currentScript:embedded?{src:''}:{src:new URL('after-ending/after-ending.js?v=20261024-after5',base).href},baseURI:base,createElement:tag=>new Element(tag)},window={};
 vm.runInNewContext(source,{document,window,URL,Date,performance:{now:()=>time},CustomEvent:class{constructor(type,{detail,bubbles}){this.type=type;this.detail=detail;this.bubbles=bubbles}}});
 const root=new Element(),story=window.CatLibrarianAfterEnding.mount(root,{images:embedded?{'returned-scene.webp':'data:image/webp;base64,scene'}:undefined,onChange:s=>{changes.push({...s});options.onChange?.(s)},onFinish:s=>{finishes.push({...s});options.onFinish?.(s)},onRestart:()=>restarts.push(true),...options});
 const find=s=>story.element.querySelector(s),click=(detail=1)=>find('.ae-next').dispatchEvent({type:'click',detail}),advance=ms=>{time+=ms};
 return {story,root,find,click,advance,requests,events,changes,finishes,restarts,get focuses(){return focuses},stages:window.CatLibrarianAfterEnding.stages};
}
const plain=value=>JSON.parse(JSON.stringify(value));
test('post-answer art stays lazy and loads exactly the composite relative WebP in a Pages subpath',()=>{
 const t=setup();assert.equal(t.requests.length,0);assert.equal(t.story.element.hidden,true);const result=t.story.show({step:0,focus:false});assert.equal(result.step,0);assert.equal(t.focuses,0);assert.equal(t.find('.ae-title').textContent,'철푸덕!');assert.equal(t.find('.ae-text').textContent,'손이다… 내 손!\n돌아왔다!');assert.deepEqual(t.requests,['https://gamemakercho.github.io/catch-librarian/after-ending/assets/returned-scene.webp']);assert.equal(t.changes.length,1);assert.equal(t.finishes.length,0);t.advance(250);t.click();assert.equal(t.requests.length,1);assert.equal(t.requests.some(p=>/\.png|impact-reference|lobby/.test(p)),false);
});
test('approved roles, exact dialogue and buttons remain unchanged through every deliberate stage',()=>{
 const t=setup();const approved=[['returned','철푸덕!','사서','손이다… 내 손!\n돌아왔다!','다음으로'],['thanks','','사서','책도 바닥도, 나까지 구해 줬네\n정말 고마워!','다음으로'],['cat','','고양이','냐옹','다음으로'],['promise','','사서','너도 오늘 수고했다\n내일은… 얌전히 책만 보자','모험 마치기'],['complete','고양이와 사서가 돌아왔다!','','오늘 도서관을 지켜 줘서 고마워요','이야기 처음부터']];t.story.show();
 for(let i=0;i<5;i++){assert.equal(t.story.element.dataset.step,approved[i][0]);for(const [selector,j]of [['.ae-title',1],['.ae-speaker',2],['.ae-text',3],['.ae-next',4]])assert.equal(t.find(selector).textContent,approved[i][j]);assert.equal(t.story.snapshot().step,i);if(i<4){t.advance(250);t.click()}}
 assert.equal(t.finishes.length,1);assert.equal(t.events.length,1);assert.deepEqual(plain(t.story.snapshot()),{version:1,answerConfirmed:true,step:4,finished:true});assert.ok(Object.isFrozen(t.stages)&&t.stages.every(Object.isFrozen));
});
test('250ms guard prevents double clicks and repeated API advances including finish and restart',()=>{
 const t=setup();t.story.show();t.click();t.click();t.story.next();assert.equal(t.story.snapshot().step,1);t.advance(249);t.click();assert.equal(t.story.snapshot().step,1);t.advance(1);t.click();assert.equal(t.story.snapshot().step,2);t.advance(250);t.click();t.advance(250);t.click();assert.equal(t.story.snapshot().step,4);for(let i=0;i<20;i++)t.click();assert.equal(t.finishes.length,1);assert.equal(t.events.length,1);assert.equal(t.restarts.length,0);t.advance(250);t.click();t.advance(500);t.click();assert.equal(t.restarts.length,1);
});
test('initial carried Enter click and Space keyup are suppressed but fresh keyboard and pointer choices work',()=>{
 const t=setup();t.story.show({focus:false});t.click(0);assert.equal(t.story.snapshot().step,0);const keyup={type:'keyup',key:' '};t.find('.ae-next').dispatchEvent(keyup);assert.equal(keyup.defaultPrevented,true);t.find('.ae-next').dispatchEvent({type:'keydown',key:'Enter',repeat:false});t.click(0);assert.equal(t.story.snapshot().step,1);const held={type:'keydown',key:'Enter',repeat:true};t.find('.ae-next').dispatchEvent(held);assert.equal(held.defaultPrevented,true);t.story.show({step:0});t.click(1);assert.equal(t.story.snapshot().step,1);
});
test('hide stops all progress, show resets cleanly, and restored completion never notifies again',()=>{
 const t=setup();t.story.show({step:2});t.story.hide();t.advance(2000);t.click();t.story.next();assert.equal(t.story.snapshot().step,2);assert.equal(t.story.element.hidden,true);t.story.show({step:1});t.click();assert.equal(t.story.snapshot().step,2);t.story.show({step:4,finished:true});assert.equal(t.finishes.length,0);assert.equal(t.events.length,0);assert.equal(t.requests.length,1);t.story.show({step:0});assert.equal(t.story.snapshot().finished,false);assert.equal(t.story.snapshot().step,0);t.story.destroy();t.story.next();t.story.show({step:3});assert.equal(t.root.children.length,0);assert.equal(t.story.snapshot().step,0);
});
test('offline mode uses one supplied data image and failure retry never requests split or reference art',()=>{
 const t=setup({base:'file:///C:/games/game.html',embedded:true});t.story.show();assert.deepEqual(t.requests,['data:image/webp;base64,scene']);t.find('.ae-image').onerror();assert.equal(t.find('.ae-retry').hidden,false);t.find('.ae-retry').dispatchEvent({type:'click'});assert.deepEqual(t.requests,['data:image/webp;base64,scene','data:image/webp;base64,scene']);t.find('.ae-image').onload();assert.equal(t.find('.ae-loading').hidden,true);assert.equal(t.find('.ae-retry').hidden,true);t.story.hide();t.find('.ae-retry').dispatchEvent({type:'click'});assert.equal(t.requests.length,2);
});
test('source remains timer-free and scoped layout contains the whole art with a short-viewport image cap',()=>{
 assert.equal(/\bsetTimeout\s*\(|\bsetInterval\s*\(/.test(source),false);const css=readFileSync(new URL('../after-ending/after-ending.css',import.meta.url),'utf8');assert.match(css,/object-fit:contain/);assert.match(css,/100dvh - 400px/);assert.match(css,/@media\(max-height:500px\)/);assert.match(css,/\.after-ending \.ae-next\{[^}]*min-height:48px/);assert.equal(/(^|\})\s*(?:body|button)(?:\{|,)/.test(css),false);
});

test('synchronous show reset inside a completion save cancels the obsolete finish callback',()=>{
 let story;const t=setup({options:{onChange:s=>{if(s.step===4)story.show({step:0,focus:false})}}});story=t.story;story.show({step:3});story.next();assert.equal(story.snapshot().step,0);assert.equal(story.snapshot().finished,false);assert.equal(t.finishes.length,0);assert.equal(t.events.length,0);t.advance(250);story.next();assert.equal(story.snapshot().step,1);
});

