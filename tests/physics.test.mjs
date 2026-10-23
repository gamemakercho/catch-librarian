import test from 'node:test';
import assert from 'node:assert/strict';
import {Chase} from '../engine.js';
import {CONFIG} from '../config.js';
import {createProp} from '../props.js';
const tick=(g,seconds)=>{for(let remaining=seconds;remaining>1e-9;remaining-=1/120)g.update(Math.min(remaining,1/120))};
test('camera, incoming obstacles and both sprite gaits run at exactly twice the previous speed',()=>{
 assert.equal(CONFIG.runSpeed,205*2);assert.equal(CONFIG.speedIncrease,42*2);assert.equal(CONFIG.spriteFPS,12*2);
 const g=new Chase();g.start();g.spawnAt=1000;g.obstacles=[createProp('box',{id:0,kind:'box',x:800,lift:0})];g.update(.5);
 const expected=410*.5+(84/30)*.5*.5/2;assert.ok(Math.abs(g.distance-expected)<1e-8);assert.ok(Math.abs(g.obstacles[0].x-(800-expected))<1e-8);
});
test('books obey the same gravity after .65 seconds and keep descending on a true parabola',()=>{
 const g=new Chase();g.start();g.spawnAt=1000;g.x=40;
 const o=g.prepareObstacle(createProp('book-red',{id:0,kind:'high',x:1000,lift:82,vy:350,angle:0,angularVelocity:0}));g.obstacles=[o];
 tick(g,.8);assert.ok(Math.abs(o.lift-(82+350*.8-.5*CONFIG.propGravity*.8*.8))<1e-7);assert.ok(Math.abs(o.vy-(350-CONFIG.propGravity*.8))<1e-7);
 const before=o.lift;tick(g,.1);assert.ok(o.lift<before-10);assert.ok(Math.abs(o.lift-(82+350*.9-.5*CONFIG.propGravity*.9*.9))<1e-7);
});
test('floor rebound reaches half the prior apex instead of an arbitrary fixed lift',()=>{
 for(const dt of [1/120,.05]){
  const g=new Chase(),o=g.prepareObstacle(createProp('book-red',{id:0,kind:'low',x:600,lift:82,vy:160,angle:0,angularVelocity:0})),ground=g.groundLift(o);let firstPeak=o.lift-ground,reboundPeak=0;
  for(let t=0;t<4&&o.bounces<2;t+=dt){g.moveProp(o,dt);if(o.bounces===0)firstPeak=Math.max(firstPeak,o.lift-ground);else if(o.bounces===1)reboundPeak=Math.max(reboundPeak,o.lift-ground)}
  assert.ok(o.bounces>=2);assert.ok(reboundPeak/firstPeak>.495&&reboundPeak/firstPeak<.505,'peak ratio '+reboundPeak/firstPeak);
 }
});
test('hit props are removed by .9 simulated seconds, with no late fade reset',()=>{
 const g=new Chase();g.start();g.spawnAt=1000;g.obstacles=[createProp('box',{id:0,kind:'box',x:270,lift:0})];for(let i=0;i<100&&!g.hits;i++)g.update(1/120);
 assert.equal(g.hits,1);const o=g.obstacles[0];tick(g,.6);assert.ok(g.obstacles.includes(o));assert.ok(o.reactionAge>.5);tick(g,.4);assert.equal(g.obstacles.includes(o),false);assert.equal(g.health,2);
});
test('a fatal hit just before 30 seconds finishes its reaction and fails, never discovers a treat',()=>{
 const g=new Chase();g.start();g.spawnAt=1000;g.elapsed=29.9;g.health=1;g.obstacles=[createProp('box',{id:0,kind:'box',x:270,lift:0})];
 for(let i=0;i<100&&!g.hits;i++)g.update(1/120);assert.equal(g.health,0);assert.equal(g.hitFrame,1);tick(g,.25);assert.equal(g.state,'playing');assert.equal(g.elapsed,30);const distance=g.distance;tick(g,.5);assert.equal(g.state,'failed');assert.equal(g.distance,distance);assert.equal(g.elapsed,30);
});
