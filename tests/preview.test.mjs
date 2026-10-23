import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {SCENE_IMAGE_FILES} from '../scene-data.js';
const root=new URL('../',import.meta.url),html=await readFile(new URL('tests/collision-preview.html',root),'utf8');
let core='';
for(const f of ['scene-data.js','config.js','props.js','collision.js','librarian-motion.js','engine.js','renderer.js'])core+=(await readFile(new URL(f,root),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')+'\n';
async function boot(){
 const drawCalls=[],loaded=[],elements={};
 class Element{
  constructor(){this.value='';this.textContent='';this.listeners={};this.width=960;this.height=500;this.context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),drawImage:(image,...args)=>{assert.ok(image,'renderer must resolve every runtime image by URL');drawCalls.push({image,args})}}, {get:(t,k)=>t[k]||(()=>{})})}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
  fire(type){for(const fn of this.listeners[type]||[])fn()}
  getContext(){return this.context}
  getBoundingClientRect(){return {width:960}}
 }
 for(const m of html.matchAll(/id="([^"]+)"/g))elements[m[1]]=new Element();
 elements.scenario.value='stack';elements.bookform.value='book-red';elements.speed.value='normal';
 let nextFrame;
 const document={hidden:false,getElementById:id=>elements[id],addEventListener(){},createElement:()=>new Element()},window={addEventListener(){}};
 for(const el of Object.values(elements))el.ownerDocument=document;
 const ctx={document,window,console,Image:class{set src(value){this.url=value;loaded.push(value);queueMicrotask(()=>this.onload())}},requestAnimationFrame:fn=>{nextFrame=fn}};
 const inline=html.match(/<script type="module">([\s\S]*)<\/script>/)[1].replace(/^import .*;\r?\n/gm,'');
 await vm.runInNewContext(core+'\n(async()=>{'+inline+'})()',ctx);
 return {elements,click:id=>elements[id].fire('click'),status:()=>JSON.parse(elements.status.textContent),loaded,drawCalls,nextFrame};
}
const near=(actual,expected,epsilon=1e-5)=>assert.ok(Math.abs(actual-expected)<epsilon,`${actual} should be near ${expected}`);

test('actual developer page boots with one URL-keyed load per scene image, including new motions and double stack',async()=>{
 const page=await boot(),s=page.status();
 assert.equal(s.props.length,1);assert.equal(s.props[0].vy,0);assert.equal(typeof page.nextFrame,'function');
 assert.deepEqual(page.loaded.sort(),SCENE_IMAGE_FILES.map(src=>'../'+src).sort());assert.equal(new Set(page.loaded).size,page.loaded.length);
 for(const name of ['librarian-run-aligned','librarian-throw-aligned','librarian-stumble-aligned','book-stack-double'])assert.ok(page.loaded.some(src=>src.includes(name)));
 assert.ok(page.drawCalls.some(call=>call.image.url?.includes('library-background-sideview')));
 assert.ok(Number.isFinite(s.motion.root.x)&&Number.isFinite(s.motion.root.y));assert.equal(s.motion.clip,'run');
 for(const id of ['step-fine','step','step-release','throw','finish','gallery','debug'])assert.ok(page.elements[id]);
});

test('preview controls retain the chosen hand-held book until 230ms, release it once, and keep the lower-body run clock moving',async()=>{
 const page=await boot();page.elements.scenario.value='high';page.elements.bookform.value='book-green';page.click('throw');
 let s=page.status();assert.equal(s.props.length,0);assert.equal(s.throwAction.form,'book-green');assert.equal(s.throwAction.frame,0);assert.equal(s.throwAction.released,false);assert.ok(s.motion.hand);
 const initialRunFrame=s.motion.runFrame;
 page.click('step');page.click('step');page.click('step-fine');page.click('step-fine');s=page.status();
 near(s.throwAction.age,.22);assert.equal(s.throwAction.frame,2);assert.equal(s.props.length,0);assert.notEqual(s.motion.runFrame,initialRunFrame);
 page.click('step-fine');s=page.status();near(s.throwAction.age,.23);assert.equal(s.throwAction.frame,3);assert.equal(s.throwAction.released,true);assert.equal(s.props.length,1);assert.equal(s.props[0].id,'book-green');assert.ok(s.props[0].vy>0);
 const id=s.props[0].obstacleId;page.click('step-release');s=page.status();assert.equal(s.props.length,1);assert.equal(s.props[0].obstacleId,id);
 page.click('step');s=page.status();assert.equal(s.throwAction,null);assert.equal(s.props.length,1);assert.equal(s.props[0].obstacleId,id);assert.equal(s.motion.clip,'run');assert.notEqual(s.motion.runFrame,0);
});

test('one large manual render step crosses release exactly once and rapid requests keep only one waiting throw',async()=>{
 const page=await boot();page.elements.bookform.value='book-blue';page.click('throw');page.click('queue-throw');
 const waitingId=page.status().queuedThrow.id;page.click('queue-throw');page.click('queue-throw');assert.equal(page.status().queuedThrow.id,waitingId);
 page.click('step-release');let s=page.status();assert.equal(s.props.length,1);assert.equal(s.props[0].id,'book-blue');assert.equal(s.throwAction.released,true);
 page.click('step-release');assert.equal(page.status().props.length,1);page.click('step');assert.equal(page.status().throwAction.id,waitingId);
 page.click('step-release');s=page.status();assert.equal(s.props.length,2);assert.equal(new Set(s.props.map(o=>o.obstacleId)).size,2);assert.equal(s.queuedThrow,null);
});

test('real ending boundary freezes clock and scroll, locks the toe through multiple poses, flies fully offscreen, then finishes once',async()=>{
 const page=await boot();page.click('throw');page.click('queue-throw');page.click('finish');
 let s=page.status();assert.equal(s.state,'ending-trip');near(s.time,30);near(s.ending.age,0);assert.equal(s.throwAction,null);assert.equal(s.queuedThrow,null);
 const distance=s.distance,toe=s.ending.toe,frames=new Set();
 for(let i=0;i<7;i++){
  s=page.status();assert.equal(s.state,'ending-trip');assert.equal(s.motion.toeLocked,true);near(s.motion.support.x,toe.x);near(s.motion.support.y,toe.y);near(s.time,30);near(s.distance,distance);frames.add(s.motion.frame);
  if(i<6)page.click('step');
 }
 assert.ok(frames.size>=4,'toe must remain locked through several distinct stumble drawings');
 const lastRoot=s.motion.root.x;page.click('step');s=page.status();assert.equal(s.state,'ending-fly');assert.equal(s.motion.toeLocked,false);assert.equal(s.motion.support,null);assert.ok(s.motion.root.x>lastRoot);
 page.click('step-release');page.click('step');page.click('step');s=page.status();assert.equal(s.state,'ending-gap');assert.equal(s.ending.fullyOutside,true);assert.ok(s.ending.leftEdge>960);near(s.distance,distance);
 page.click('step');s=page.status();assert.equal(s.state,'ending-complete');near(s.ending.age,1.16);const done=s.ending.age;page.click('step-release');near(page.status().ending.age,done);assert.equal(page.status().state,'ending-complete');
 page.click('reset');s=page.status();near(s.ending.age,0);assert.equal(s.ending.root,null);assert.equal(s.throwAction,null);assert.equal(s.queuedThrow,null);assert.equal(s.state,'playing');
});

test('preview gallery has seven real silhouettes and the two-layer contact consumes only one health point',async()=>{
 const page=await boot();page.click('gallery');let s=page.status();assert.equal(s.props.length,7);assert.equal(new Set(s.props.map(o=>o.id)).size,7);assert.ok(s.props.every(o=>Number.isFinite(o.vy)&&Number.isFinite(o.height)));
 const tall=s.props.find(o=>o.id==='double-stack');near(tall.height,136);assert.ok(tall.width>100&&tall.width<110);
 page.elements.scenario.value='double-stack';page.elements.scenario.fire('change');page.click('impact');s=page.status();assert.equal(s.health,2);assert.equal(s.props.length,1);assert.equal(s.props[0].id,'double-stack');assert.equal(s.props[0].damageConsumed,true);assert.ok(s.penetration<.002);
});
