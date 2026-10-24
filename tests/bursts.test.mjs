import test from 'node:test';
import assert from 'node:assert/strict';
import {Chase} from '../engine.js';
import {CONFIG} from '../config.js';
const tick=(g,seconds,dt=1/120)=>{for(let left=seconds;left>1e-9;left-=dt)g.update(Math.min(left,dt))};
function fixture(){const g=new Chase({...CONFIG,homeSpeed:0});g.start();g.spawnAt=1000;g.x=930;const releases=[],release=g.releaseBook.bind(g);g.releaseBook=(action,age)=>{release(action,age);releases.push({id:action.id,kind:action.kind,form:action.form,burstId:action.burstId,index:action.burstIndex,time:g.elapsed})};return {g,releases}}
for(const [kind,count]of [['low',3],['high',4]])test(`${count} ${kind} books are each prepared/released once with a bounded batch at every frame rate`,()=>{
 for(const dt of [1/120,1/60,.1,.25]){
  const {g,releases}=fixture();assert.equal(g.spawnBurst(kind,count),true);assert.equal(g.spawnBurst(kind,count),false);assert.equal(g.burst.count,count);assert.equal(g.burst.index,1);assert.equal(g.throwAction.age,0);assert.equal(g.encounterSerial,0);assert.equal(g.queuedThrow,null);
  tick(g,4,dt);assert.equal(releases.length,count);assert.equal(new Set(releases.map(o=>o.id)).size,count);assert.equal(new Set(releases.map(o=>o.burstId)).size,1);assert.deepEqual(releases.map(o=>o.index),Array.from({length:count},(_,i)=>i));assert.ok(releases.every(o=>o.kind===kind));assert.equal(g.burst,null);assert.equal(g.throwAction,null);assert.equal(g.queuedThrow,null);assert.equal(g.encounterSerial,0);
  const interval=kind==='low'?CONFIG.burstLowInterval:CONFIG.burstHighInterval;for(let i=0;i<count;i++)assert.ok(Math.abs(releases[i].time-(CONFIG.throwRelease+i*interval))<1e-7,JSON.stringify({dt,releases}));
 }
});
test('pause freezes burst ages and later release positions, then a hit postpones remaining preparation',()=>{
 const {g,releases}=fixture();g.spawnBurst('low',3);tick(g,.4);assert.equal(releases.length,1);const before=[g.elapsed,g.throwAction.age,g.burst.index,g.burst.nextAt];g.state='paused';tick(g,2);assert.deepEqual([g.elapsed,g.throwAction.age,g.burst.index,g.burst.nextAt],before);g.state='playing';assert.equal(g.hit({}),true);const allowed=g.burst.nextAt;assert.ok(allowed>=g.elapsed+CONFIG.burstHitRecovery-1e-9);tick(g,CONFIG.burstHitRecovery-.1);assert.equal(g.burst.index,1);assert.equal(releases.length,1);tick(g,2.5);assert.equal(releases.length,3);assert.ok(releases[1].time>=allowed+CONFIG.throwRelease-1e-8);
});
test('fatal hit, exact time limit and retry cancel all remaining burst choices',()=>{
 const a=fixture();a.g.spawnBurst('high',4);tick(a.g,.3);a.g.health=1;a.g.hit({});tick(a.g,1);assert.equal(a.g.state,'failed');assert.equal(a.releases.length,1);assert.equal(a.g.burst,null);assert.equal(a.g.throwAction,null);assert.equal(a.g.queuedThrow,null);
 const b=fixture();b.g.elapsed=29.8;b.g.spawnBurst('low',3);tick(b.g,.5);assert.equal(b.g.state,'ending-discovery');assert.equal(b.g.elapsed,30);assert.equal(b.releases.length,0);assert.equal(b.g.burst,null);b.g.start();assert.equal(b.g.burst,null);assert.equal(b.g.burstSerial,0);assert.equal(b.g.encounterSerial,0);assert.equal(b.g.serial,0);assert.equal(b.g.bookSerial,0);
});
test('normal encounter count stays separate from each batch and leaves recovery space after the last clip',()=>{
 const {g,releases}=fixture();g.spawnAt=0;g.encounterSerial=3;tick(g,.01);assert.equal(g.encounterSerial,4);assert.equal(g.burst.count,3);tick(g,2.3);assert.equal(releases.length,3);assert.equal(g.burst,null);const lastRelease=releases.at(-1).time;assert.ok(g.spawnAt>=lastRelease+(CONFIG.throwDuration-CONFIG.throwRelease)+CONFIG.burstRecovery-1e-8);assert.equal(g.encounterSerial,4);tick(g,2);assert.ok(g.encounterSerial>=5);
});

test('three low books tolerate ±60ms single-jump input jitter across the full chase speed range',async()=>{
 const {burstInputReport}=await import('./burst-probe.mjs');const report=burstInputReport();assert.equal(report.total,36);assert.equal(report.passed,36,JSON.stringify(report.trials.filter(t=>!t.pass)));
});
