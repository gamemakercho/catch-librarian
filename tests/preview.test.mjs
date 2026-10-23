import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),html=await readFile(new URL('tests/collision-preview.html',root),'utf8');
let core='';for(const f of ['scene-data.js','config.js','props.js','collision.js','engine.js','renderer.js'])core+=(await readFile(new URL(f,root),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')+'\n';
class Element{
 constructor(){this.value='';this.textContent='';this.listeners={}}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
 fire(type){for(const fn of this.listeners[type]||[])fn()}
 getContext(){return new Proxy({createRadialGradient:()=>({addColorStop(){}})}, {get:(t,k)=>t[k]||(()=>{})})}
 getBoundingClientRect(){return {width:960}}
}
test('actual developer preview boots, launches real ballistic books, shows gallery and frozen discovery without undefined values',async()=>{
 const elements={};for(const m of html.matchAll(/id="([^"]+)"/g))elements[m[1]]=new Element();elements.scenario.value='stack';elements.bookform.value='book-red';elements.speed.value='normal';
 let nextFrame;const document={hidden:false,getElementById:id=>elements[id],addEventListener(){}},window={addEventListener(){}};
 const ctx={document,window,console,Image:class{set src(v){queueMicrotask(()=>this.onload())}},requestAnimationFrame:fn=>{nextFrame=fn}};
 const inline=html.match(/<script type="module">([\s\S]*)<\/script>/)[1].replace(/^import .*;\r?\n/gm,'');await vm.runInNewContext(core+'\n(async()=>{'+inline+'})()',ctx);
 const status=()=>JSON.parse(elements.status.textContent);assert.equal(status().props.length,1);assert.equal(status().props[0].vy,0);assert.equal(typeof nextFrame,'function');
 elements.scenario.value='low';elements.throw.fire('click');assert.ok(status().props[0].x>650);assert.ok(status().props[0].vy>0);const initial=status().props[0].lift;elements.step.fire('click');assert.ok(status().props[0].lift>initial);
 for(let i=0;i<9;i++)elements.step.fire('click');assert.ok(status().props[0].bounces>=1);assert.equal(status().props[0].opacity,1);
 elements.gallery.fire('click');assert.equal(status().props.length,6);assert.ok(status().props.every(o=>Number.isFinite(o.vy)));
 elements.finish.fire('click');assert.equal(status().state,'discovery');assert.equal(status().time,30);const distance=status().distance;elements.step.fire('click');assert.equal(status().distance,distance);
});
