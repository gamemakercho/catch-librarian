import test from 'node:test';
import assert from 'node:assert/strict';
import {Chase} from '../engine.js';
import {CONFIG} from '../config.js';
import {Renderer} from '../renderer.js';
const step=(g,t)=>{for(let n=0;n<t*120;n++)g.update(1/120)};
test('scheduled second four-book burst shuffles two high and two low books, keeps each choice over pause and releases once',()=>{
 const orders=new Set();for(const randomValue of [0,.2,.4,.6,.8,.999]){
  const g=new Chase({...CONFIG,homeSpeed:0},()=>randomValue);g.start();g.x=930;g.spawnAt=1000;g.encounterSerial=7;
  const released=[],release=g.releaseBook.bind(g);g.releaseBook=(a,t)=>{released.push({id:a.id,kind:a.kind,index:a.burstIndex,time:g.elapsed});release(a,t)};
  assert.equal(g.spawn(),true);assert.equal(g.encounterSerial,8);assert.equal(g.burst.kind,'mixed');const choices=[...g.burst.choices];orders.add(choices.join());assert.equal(choices.filter(v=>v==='low').length,2);assert.equal(choices.filter(v=>v==='high').length,2);
  const before=[...g.burst.choices];g.state='paused';step(g,1);assert.deepEqual(g.burst.choices,before);assert.equal(g.elapsed,0);g.state='playing';step(g,3.5);
  assert.deepEqual(released.map(a=>a.kind),choices);assert.equal(new Set(released.map(a=>a.id)).size,4);assert.deepEqual(released.map(a=>a.index),[0,1,2,3]);for(let i=0;i<4;i++)assert.ok(Math.abs(released[i].time-(CONFIG.throwRelease+i*CONFIG.burstHighInterval))<1e-8);assert.equal(g.burst,null);assert.equal(g.queuedThrow,null);
 }
 assert.ok(orders.size>=3,'different RNG inputs must produce different mixed patterns');
});
test('fatal hit cancels a mixed batch without leaking queued books into retry',()=>{const g=new Chase({...CONFIG,homeSpeed:0},()=>.5);g.start();g.x=930;g.spawnAt=1000;g.spawnBurst('mixed',4);step(g,.3);g.health=1;g.hit({});step(g,1);assert.equal(g.state,'failed');assert.equal(g.burst,null);g.start();assert.equal(g.throwAction,null);assert.equal(g.queuedThrow,null);assert.equal(g.burst,null);});
test('full-viewport camera preserves equal x/y scale and contains original world on portrait and landscape screens',()=>{
 for(const [width,height]of [[360,538],[390,742],[844,288]]){let transform;const r={canvas:{getBoundingClientRect:()=>({width,height})},c:{setTransform:(...a)=>transform=a}};Renderer.prototype.resize.call(r);assert.equal(transform[0],transform[3]);assert.ok(r.viewWidth>=960);assert.ok(r.viewHeight>=500);assert.ok(r.viewOffset>=0);assert.ok(r.viewX>=0);assert.ok(Math.abs(r.canvas.width/r.canvas.height-width/height)<.01);}
});
