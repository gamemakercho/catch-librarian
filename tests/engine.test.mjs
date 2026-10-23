import test from 'node:test';
import assert from 'node:assert/strict';
import { Chase, isCorrectAnswer } from '../engine.js';
import { CONFIG } from '../config.js';
import {sampleMotion,LIBRARIAN_SCALE,heldBookPose} from '../librarian-motion.js';
const tick=(g,seconds)=>{for(let left=seconds;left>1e-9;left-=1/120)g.update(Math.min(left,1/120))};
test('two jumps only; landing restores both; inactive state rejects inputs',()=>{const g=new Chase();assert.equal(g.jump(),false);g.start();assert.equal(g.jump(),true);tick(g,.1);assert.ok(g.y>0);assert.equal(g.jumps,1);assert.equal(g.jump(),true);assert.equal(g.jumps,0);assert.equal(g.jump(),false);tick(g,1.5);assert.equal(g.y,0);assert.equal(g.jumps,2);g.state='paused';const before=g.elapsed;tick(g,1);assert.equal(g.elapsed,before);assert.equal(g.jump(),false)});
test('3 second warmup; minimum arrival spacing and visible reaction window',()=>{const g=new Chase();g.start();tick(g,2.99);assert.equal(g.obstacles.length,0);tick(g,.04);assert.equal(g.obstacles.length,1);const approachSeconds=(g.obstacles[0].x-(g.x+35))/(CONFIG.runSpeed+CONFIG.speedIncrease*g.elapsed/CONFIG.duration);assert.ok(approachSeconds>.95&&approachSeconds<1.05,'doubled approach speed leaves about one second');const arrivals=[];let last=0;for(let i=0;i<3600;i++){g.health=100;g.update(1/120);if(g.serial!==last){arrivals.push(g.elapsed);last=g.serial}}for(let i=1;i<arrivals.length;i++)assert.ok(arrivals[i]-arrivals[i-1]>=CONFIG.minimumInterval-.01)});
test('one hit per obstacle, one-second invulnerability, actual collision and retry reset',()=>{const g=new Chase();g.start();const a={hit:false};assert.ok(g.hit(a));assert.equal(g.health,2);assert.equal(g.hit({hit:false}),false);tick(g,1.2);assert.equal(g.hit(a),false);assert.ok(g.hit({hit:false}));tick(g,1.2);assert.ok(g.hit({hit:false}));assert.equal(g.state,'playing');assert.equal(g.health,0);assert.equal(g.jump(),false);tick(g,.8);assert.equal(g.state,'failed');const elapsed=g.elapsed;tick(g,5);assert.equal(g.elapsed,elapsed);g.start();assert.equal(g.health,3);assert.equal(g.obstacles.length,0);assert.equal(g.elapsed,0);tick(g,6);assert.ok(g.health<3)});
test('high books pass over grounded body; ground objects are jumpable',()=>{const g=new Chase();g.start();g.spawnAt=100;g.obstacles=[{id:0,kind:'high',x:240,w:48,h:25,lift:128,hit:false}];g.update(.02);assert.equal(g.health,3);g.obstacles=[{id:1,kind:'stack',x:240,w:48,h:53,lift:0,hit:false}];g.y=110;g.update(.02);assert.equal(g.health,3);g.y=0;g.vy=0;g.update(.02);assert.equal(g.health,2)});
test('full 30-second chase with the tall stacks can be won by visible single and double jumps',()=>{const g=new Chase();g.start();let firstJump=null;for(let i=0;i<4000&&g.state==='playing';i++){const tall=g.obstacles.find(o=>o.kind==='double-stack'&&!o.hit&&o.x>g.x-120);if(tall&&tall.x>g.x+240&&tall.x<g.x+280&&g.y===0){g.jump();firstJump=g.elapsed}else if(tall&&firstJump!==null&&g.jumps===1&&g.elapsed-firstJump>=.35){g.jump();firstJump=null}else{const approaching=g.obstacles.find(o=>o.kind!=='high'&&o.kind!=='double-stack'&&o.x>g.x+50&&o.x<g.x+120&&!o.hit);if(approaching&&g.y===0)g.jump()}g.update(1/120)}assert.equal(g.state,'ending-trip');assert.equal(g.elapsed,30);assert.ok(g.health>0);const elapsed=g.elapsed;assert.equal(g.jump(),false);tick(g,5);assert.equal(g.elapsed,elapsed)});
test('answer ignores spaces, exclamation and periods but rejects wrong/incomplete phrases',()=>{for(const answer of ['고양이와 사서가 돌아왔다','  고양이와사서가돌아왔다!  ','고양이와  사서가\n돌아왔다.','고양이와 사서가 돌아왔다！。','고양이와 사서가 돌아왔다'.normalize('NFD')])assert.equal(isCorrectAnswer(answer),true,answer);for(const answer of ['','고양이와 사서','사서가 돌아왔다','고양이와 사서가 돌아왔어'])assert.equal(isCorrectAnswer(answer),false)});


test('throw prepares the selected natural-size book and releases exactly once across skipped frames',()=>{
 const g=new Chase();g.start();g.spawnAt=1000;assert.equal(g.spawn('high'),true);const choice={...g.throwAction};
 assert.equal(g.obstacles.length,0);g.update(.22);assert.equal(g.obstacles.length,0);assert.equal(g.throwAction.form,choice.form);
 const releaseTime=g.elapsed+CONFIG.throwRelease-g.throwAction.age,pose=heldBookPose({...g,elapsed:releaseTime},{...choice,age:CONFIG.throwRelease});
 // Test the boundary directly too: a display update may skip from frame 2 to 4.
 const before=g.throwAction.age;g.elapsed+=.10;g.updateThrow(.10);assert.ok(before<CONFIG.throwRelease);assert.equal(g.obstacles.length,1);
 const o=g.obstacles[0];assert.equal(o.id,choice.id);assert.equal(o.spriteId,choice.form);assert.equal(o.trajectory,choice.trajectory);assert.equal(o.x,pose.x);assert.equal(o.lift,pose.lift);assert.equal(o.angle,pose.angle);
 g.updateThrow(.10);assert.equal(g.obstacles.length,1);g.updateThrow(.20);assert.equal(g.throwAction,null);assert.equal(g.obstacles.length,1);
});
test('rapid throw requests keep one bounded prepared choice and cancelled actions never release',()=>{
 const g=new Chase();g.start();g.spawnAt=1000;g.spawn('low');const first=g.throwAction;g.spawn('high');const pending=g.queuedThrow;assert.equal(g.spawn('low'),false);assert.equal(g.queuedThrow,pending);
 g.updateThrow(.5);assert.equal(g.obstacles.length,1);assert.equal(g.throwAction,pending);assert.equal(g.throwAction.age,0);assert.equal(g.obstacles[0].id,first.id);
 g.updateThrow(.5);assert.equal(g.obstacles.length,2);assert.equal(g.obstacles[1].id,pending.id);assert.equal(g.throwAction,null);
 g.spawn('low');g.cancelThrows();g.updateThrow(.5);assert.equal(g.obstacles.length,2);
 g.spawn('high');g.health=0;g.update(.1);assert.equal(g.throwAction,null);assert.equal(g.queuedThrow,null);assert.equal(g.obstacles.length,2);
 g.start();assert.equal(g.throwAction,null);assert.equal(g.queuedThrow,null);assert.equal(g.bookSerial,0);
});
test('30-second ending locks the toe, flies offscreen continuously, and waits before completion',()=>{
 const g=new Chase();g.start();g.spawnAt=1000;g.elapsed=29.99;g.spawn('high');g.update(.01);assert.equal(g.state,'ending-trip');assert.equal(g.elapsed,30);assert.equal(g.throwAction,null);assert.equal(g.jump(),false);const distance=g.distance;
 for(let i=0;i<5;i++){const frame=sampleMotion('stumble',g.endingAge,false).frame,s=frame.support_anchor,r=frame.root_anchor;assert.equal(frame.toe_locked,true);assert.ok(Math.abs(g.endingRoot.x+(s.x-r.x)*LIBRARIAN_SCALE-g.endingToe.x)<1e-8);assert.ok(Math.abs(g.endingRoot.y+(s.y-r.y)*LIBRARIAN_SCALE-g.endingToe.y)<1e-8);tick(g,[.10,.12,.14,.14,.139][i])}
 const lastRoot={...g.endingRoot};tick(g,.001);assert.equal(g.state,'ending-fly');assert.ok(Math.abs(g.endingRoot.x-lastRoot.x)<.001);assert.ok(Math.abs(g.endingRoot.y-lastRoot.y)<.001);
 const age=g.endingAge;g.state='paused';tick(g,.4);assert.equal(g.endingAge,age);g.state='ending-fly';tick(g,.4);assert.ok(g.endingRoot.x>960+320*LIBRARIAN_SCALE/2);assert.equal(g.state,'ending-fly');tick(g,.119);assert.equal(g.state,'ending-gap');tick(g,.001);assert.equal(g.state,'ending-complete');assert.equal(g.distance,distance);assert.equal(g.elapsed,30);
 g.start();assert.equal(g.endingAge,0);assert.equal(g.endingRoot,null);assert.equal(g.endingToe,null);assert.equal(g.endingStarted,false);assert.equal(g.endingStartX,null);assert.equal(g.endingStartY,null);
});
test('tall stacks first appear after eight seconds, at most twice, with full recovery gaps',()=>{
 const g=new Chase();g.start();g.health=100;const generated=[],seen=new Set();for(let i=0;i<4000&&g.state==='playing';i++){g.update(1/120);for(const o of g.obstacles)if(!seen.has(o.id)){seen.add(o.id);generated.push({id:o.id,kind:o.kind,time:g.elapsed})}}
 const tall=generated.filter(o=>o.kind==='double-stack');assert.equal(tall.length,2);assert.ok(tall[0].time>=8);for(const o of tall){const i=generated.indexOf(o);assert.ok(o.time-generated[i-1].time>=2.6);assert.ok(generated[i+1].time-o.time>=2.8)}
});
