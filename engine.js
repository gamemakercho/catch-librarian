import {createProp} from './props.js?v=20261025-fullscreen7';
import {heldBookPose,endingRootPose} from './librarian-motion.js?v=20261025-fullscreen7';
import { CONFIG } from './config.js?v=20261025-fullscreen7';
import { boxPolygon, obstaclePolygons, penetration, sweepPolygons } from './collision.js?v=20261025-fullscreen7';
export const WORLD=Object.freeze({width:960,height:500,floor:415,catX:240,librarianX:780});
export const normalizeAnswer=value=>value.normalize('NFC').replace(/[\s!.！。．]/gu,'');
const acceptedAnswer=String.fromCodePoint(44256,50577,51060,50752,32,49324,49436,44032,32,46028,50500,50772,45796);
export const isCorrectAnswer=value=>normalizeAnswer(value)===normalizeAnswer(acceptedAnswer);
export class Chase {
 constructor(config=CONFIG,random=Math.random){this.config=config;this.random=random;this.reset()}
 reset(){Object.assign(this,{state:'ready',elapsed:0,health:this.config.health,x:WORLD.catX,vx:0,y:0,vy:0,jumps:2,invincible:0,obstacles:[],spawnAt:this.config.warmup,serial:0,encounterSerial:0,bookSerial:0,burstSerial:0,burst:null,distance:0,recoil:0,hits:0,hitStop:0,stun:0,hitActive:false,hitAge:0,landingAge:null,defeatAge:0,discoveryAge:0,throwAction:null,queuedThrow:null,doubleStackCount:0,endingAge:0,endingStartX:null,endingStartY:null,endingToe:null,endingRoot:null,endingStarted:false,contacts:[],maxPenetration:0})}
 start(){this.reset();this.state='playing'}
 jump(){
  if(this.state!=='playing'||this.health<=0||this.stun>0||this.hitStop>0||this.jumps===0)return false;
  this.vy=this.jumps===2?this.config.jumpForce:this.config.doubleJumpForce;this.jumps--;this.landingAge=null;return true;
 }
 catPolygon(x=this.x,y=this.y){const b=this.config.catCollider;return boxPolygon(x+b.x,WORLD.floor-y+b.y,b.w,b.h)}
 prepareObstacle(o){
  o.lift??=0;o.angle??=0;o.vx??=0;o.vy??=0;o.angularVelocity??=0;o.reactionAge??=0;o.age??=0;o.bounces??=0;
  o.damageConsumed??=Boolean(o.hit);o.reacting??=false;return o;
 }
 spawn(kindOverride=null){
  if(this.state!=='playing'||this.health<=0)return false;
  const kinds=['stack','high','double-stack','burst-low','box','basket','double-stack','burst-high','low'];
  let kind=kindOverride||kinds[this.encounterSerial%kinds.length];
  if(kind==='burst-low'||kind==='burst-high'){if(!this.spawnBurst(kind==='burst-low'?'low':'mixed',kind==='burst-low'?3:4))return false;this.encounterSerial++;return true}
  if(kind==='double-stack'&&!kindOverride&&(this.elapsed<8||this.doubleStackCount>=2))kind='stack';
  const airborne=kind==='high'||kind==='low';
  // A running throw owns a single immutable choice and at most one pending choice.
  if(airborne&&this.throwAction&&this.queuedThrow)return false;
  const form=airborne?['book-red','book-green','book-blue'][(this.bookSerial+Math.floor(this.bookSerial/3))%3]:kind==='stack'?'book-stack':kind;
  const trajectory=airborne?Math.floor(this.bookSerial/9)%3:0;
  const request={id:this.serial++,kind,form,trajectory,age:0,released:false};
  if(!kindOverride)this.encounterSerial++;
  if(airborne){
   this.bookSerial++;
   if(this.throwAction)this.queuedThrow=request;else this.throwAction=request;
  }else{
   const o=createProp(form,{id:request.id,kind,trajectory,lift:0});
   o.x=WORLD.librarianX-this.config.librarianHeight*.28-o.w/2;
   this.obstacles.push(this.prepareObstacle(o));
   if(kind==='double-stack')this.doubleStackCount++;
  }
  return true;
 }
 spawnBurst(kind='low',count=3){
  if(this.state!=='playing'||this.health<=0||this.burst||this.throwAction||this.queuedThrow||!['low','high','mixed'].includes(kind)||![3,4].includes(count))return false;
  const choices=kind==='mixed'?Array.from({length:count},(_,i)=>i<Math.ceil(count/2)?'low':'high'):Array(count).fill(kind);
  // Freeze the shuffled choices for this finite batch; pause/hits never reroll them.
  if(kind==='mixed')for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999999,this.random()))*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
  this.burst={id:this.burstSerial++,kind,choices,count,index:0,nextAt:this.elapsed,interval:kind==='low'?this.config.burstLowInterval:this.config.burstHighInterval};
  this.updateBurst();return true;
 }
 updateBurst(){
  const b=this.burst;if(!b)return;
  if(b.index===b.count){if(!this.throwAction&&!this.queuedThrow){this.burst=null;this.spawnAt=Math.max(this.spawnAt,this.elapsed+this.config.burstRecovery)}return}
  if(this.elapsed+1e-9<b.nextAt||this.throwAction||this.queuedThrow)return;
  if(this.spawn(b.choices[b.index])){this.throwAction.burstId=b.id;this.throwAction.burstIndex=b.index++;b.nextAt=this.elapsed+b.interval}
 }
 releaseBook(action,newAge=action.age){
  // Sample the hand at the exact release time, even when this update skipped frames.
  const releaseGame={...this,elapsed:this.elapsed-Math.max(0,newAge-this.config.throwRelease)};
  const pose=heldBookPose(releaseGame,{...action,age:this.config.throwRelease});
  const o=createProp(action.form,{id:action.id,kind:action.kind,trajectory:action.trajectory,burstId:action.burstId,burstIndex:action.burstIndex,...pose});
  o.launchLift=o.lift;o.vy=(action.kind==='high'?this.config.bookThrowHigh:this.config.bookThrowLow)[action.trajectory];
  o.angularVelocity=[1.4,-1.7,2.1][action.trajectory];
  this.obstacles.push(this.prepareObstacle(o));this.recoil=.25;
 }
 updateThrow(dt){
  let remaining=dt;
  while(this.throwAction&&remaining>1e-9){
   const a=this.throwAction,oldAge=a.age,used=Math.min(remaining,this.config.throwDuration-oldAge);let newAge=oldAge+used;
   for(const boundary of [this.config.throwRelease,this.config.throwDuration])if(Math.abs(newAge-boundary)<1e-9)newAge=boundary;
   a.age=newAge;
   if(!a.released&&oldAge<this.config.throwRelease&&newAge>=this.config.throwRelease){a.released=true;this.releaseBook(a,newAge)}
   remaining-=used;
   if(newAge>=this.config.throwDuration-1e-9){this.throwAction=this.queuedThrow;this.queuedThrow=null}else break;
  }
 }
 cancelThrows(){this.throwAction=null;this.queuedThrow=null;this.burst=null}
 beginEnding(){
  if(this.endingStarted||this.health<=0)return false;
  this.endingStarted=true;this.state='ending-discovery';this.endingAge=0;this.endingStartX=this.x;this.endingStartY=this.y;
  this.endingToe={x:814,y:WORLD.floor};this.endingRoot=endingRootPose(this,0);
  this.cancelThrows();this.hitActive=false;this.stun=0;this.hitStop=0;this.vx=0;
  return true;
 }
 updateEnding(dt){
  this.endingAge=Math.min(this.config.endingDuration,this.endingAge+dt);
  for(const boundary of [this.config.discoverySeconds,this.config.discoverySeconds+this.config.endingToeOff,this.config.discoverySeconds+this.config.endingStumble,this.config.endingDuration])if(Math.abs(this.endingAge-boundary)<1e-9)this.endingAge=boundary;
  const clipAge=this.endingAge-this.config.discoverySeconds;
  this.state=this.endingAge>=this.config.endingDuration-1e-9?'ending-complete':clipAge< -1e-9?'ending-discovery':clipAge>=this.config.endingStumble-1e-9?'ending-gap':clipAge>=this.config.endingToeOff-1e-9?'ending-fly':'ending-trip';
  this.endingRoot=endingRootPose(this,this.endingAge);
  // Input and contacts are disabled, but the cat settles and deflected props finish fading.
  this.vy-=this.config.gravity*dt;this.y=Math.max(0,this.y+this.vy*dt);if(!this.y)this.vy=0;
  for(const o of this.obstacles){
   this.prepareObstacle(o);o.age+=dt;
   if(o.reacting){o.reactionAge+=dt;o.x+=o.vx*dt;this.moveProp(o,dt);o.vx*=Math.exp(-.35*dt)}
   else if(o.kind==='high'||o.kind==='low'){o.x-=(this.config.runSpeed+this.config.speedIncrease)*dt;this.moveProp(o,dt)}
  }
  this.obstacles=this.obstacles.filter(o=>o.x+o.w> -100&&o.x<WORLD.width+130&&(!o.reacting||o.reactionAge<(o.reactionLifetime??this.config.propLifetime)));
 }
 groundLift(o,angle=o.angle){
  // Measured outlines, including their shared sprite pivot, determine the floor.
  return Math.max(...obstaclePolygons({...o,lift:0,angle},WORLD.floor).flat().map(p=>p.y))-WORLD.floor;
 }
 moveProp(o,dt){
  const gravity=this.config.propGravity,rest=this.config.propRestitution;
  let remaining=dt;
  for(let bounce=0;remaining>1e-9&&bounce<4;bounce++){
   const startLift=Math.max(o.lift,this.groundLift(o)),startAngle=o.angle,velocity=o.vy;
   const liftAt=t=>startLift+velocity*t-.5*gravity*t*t;
   const angleAt=t=>startAngle+o.angularVelocity*t;
   const clearance=t=>liftAt(t)-this.groundLift(o,angleAt(t));
   if(o.grounded&&velocity===0){o.angle=angleAt(remaining);o.lift=this.groundLift(o);remaining=0;break}
   if(clearance(remaining)>=0){o.lift=liftAt(remaining);o.angle=angleAt(remaining);o.vy=velocity-gravity*remaining;o.grounded=false;remaining=0;break}
   // Solve the floor contact inside this substep, then integrate its rebound.
   // sqrt(.5) velocity restitution gives half the previous apex height.
   let lo=0,hi=remaining;
   for(let i=0;i<20;i++){const mid=(lo+hi)/2;if(clearance(mid)>0)lo=mid;else hi=mid}
   const contact=(lo+hi)/2,impactVelocity=velocity-gravity*contact;
   o.angle=angleAt(contact);o.lift=this.groundLift(o);o.vy=Math.max(0,-impactVelocity)*rest;
   o.bounces++;o.grounded=o.vy<8;if(o.grounded)o.vy=0;
   remaining-=contact;
  }
  // Only tiny settling bounces can exhaust the substep loop.
  if(remaining>1e-9){o.angle+=o.angularVelocity*remaining;o.lift=Math.max(o.lift,this.groundLift(o));o.vy=0;o.grounded=true}
 }
 hit(obstacle){
  // Damage history is separate from geometry. This never controls separation.
  if(this.state!=='playing'||obstacle.damageConsumed||obstacle.hit)return false;
  obstacle.damageConsumed=true;obstacle.hit=true;
  if(this.invincible>0||this.health<=0)return false;
  this.health--;this.hits++;this.invincible=this.config.invincibility;
  this.hitActive=true;this.hitAge=0;this.landingAge=null;
  this.hitStop=this.config.hitStop;this.stun=this.config.stunDuration;this.defeatAge=0;
  this.spawnAt=Math.max(this.spawnAt,this.elapsed+this.config.spawnRecoverySpace);
  if(this.burst)this.burst.nextAt=Math.max(this.burst.nextAt,this.elapsed+this.config.burstHitRecovery);return true;
 }
 react(o,n){
  const newDamage=this.hit(o),firstPhysical=!o.reacting;
  if(newDamage||firstPhysical){
   if(!newDamage){this.hitActive=true;this.hitAge=0;this.landingAge=null;this.stun=Math.max(this.stun,.12)}
   if(Math.abs(n.x)>.25)this.vx=n.x*this.config.knockbackX;
   this.vy=n.y>.5?Math.min(this.vy,-140):Math.max(this.vy,this.config.knockbackY);
   this.landingAge=null;
   o.vx=-n.x*this.config.propKnockback;o.vy=n.y>.5?180:n.y<-.5?-130:155;
   o.angularVelocity=(n.x<=0?1:-1)*(o.kind==='basket'?5:o.kind==='stack'?2.4:8);
   o.reacting=true;o.reactionAge=0;o.grounded=false;
   if(o.burstId!==undefined){o.reactionLifetime=this.config.burstPropLifetime;o.fadeStart=this.config.burstPropFadeStart}
  }
  // Screen-relative velocity: reacting objects do NOT also subtract camera speed.
  const relativeNormal=(this.vx-o.vx)*n.x+(-this.vy+o.vy)*n.y;
  if(relativeNormal<0){const impulse=-relativeNormal+.5;this.vx+=n.x*impulse*.4;this.vy-=n.y*impulse*.4;o.vx-=n.x*impulse*.6;o.vy+=n.y*impulse*.6}
 }
 get hitFrame(){
  if(!this.hitActive)return null;
  if(this.hitStop>0||this.hitAge<.016)return 1;
  if(this.landingAge!==null)return this.landingAge<.09?5:this.landingAge<.18?6:7;
  return this.vy>35?2:this.vy< -35?4:3;
 }
 update(dt){
  if(!['playing','ending-discovery','ending-trip','ending-fly','ending-gap'].includes(this.state)||!Number.isFinite(dt)||dt<=0)return;
  let remaining=Math.min(dt,.5);this.contacts=[];
  while(remaining>1e-9&&['playing','ending-discovery','ending-trip','ending-fly','ending-gap'].includes(this.state)){
   if(this.state!=='playing'){const endStep=Math.min(remaining,1/120);this.updateEnding(endStep);remaining-=endStep;continue}
   if(this.hitStop>0){const frozen=Math.min(remaining,this.hitStop);this.hitStop=Math.max(0,this.hitStop-frozen);remaining-=frozen;continue}
   const cameraSpeed=this.config.runSpeed+this.config.speedIncrease*this.elapsed/this.config.duration;
   const maxMotion=Math.max(300,Math.abs(this.vx)+Math.abs(this.vy),...this.obstacles.map(o=>(o.reacting?Math.abs(o.vx||0):cameraSpeed)+Math.abs(o.vy||0)));
   const angular=Math.max(1,...this.obstacles.map(o=>Math.abs(o.angularVelocity||0)));
   const eventBoundary=this.throwAction?(this.throwAction.released?this.config.throwDuration:this.config.throwRelease)-this.throwAction.age:Infinity;
   const burstBoundary=this.burst&&this.burst.index<this.burst.count?this.burst.nextAt-this.elapsed:Infinity;
   const step=Math.min(remaining,1/120,4/maxMotion,.04/angular,eventBoundary>1e-9?eventBoundary:Infinity,burstBoundary>1e-9?burstBoundary:Infinity);this.step(step);remaining-=step;
  }
 }
 step(dt){
  if(this.health>0)dt=Math.min(dt,this.config.duration-this.elapsed);
  if(dt<=0){this.beginEnding();return}
  const clockDt=Math.min(dt,Math.max(0,this.config.duration-this.elapsed));
  const previous={x:this.x,y:this.y};
  this.elapsed=Math.min(this.config.duration,this.elapsed+clockDt);
  if(this.config.duration-this.elapsed<1e-9)this.elapsed=this.config.duration;
  this.invincible=Math.max(0,this.invincible-dt);this.stun=Math.max(0,this.stun-dt);this.recoil=Math.max(0,this.recoil-dt);
  if(this.hitActive){this.hitAge+=dt;if(this.landingAge!==null){this.landingAge+=dt;if(this.landingAge>=.26){this.hitActive=false;this.landingAge=null}}}
  const speed=this.config.runSpeed+this.config.speedIncrease*(this.elapsed-clockDt/2)/this.config.duration;
  this.distance+=speed*clockDt;
  if(this.stun<=0){const desired=Math.max(-this.config.homeSpeed,Math.min(this.config.homeSpeed,(WORLD.catX-this.x)*7));this.vx+=(desired-this.vx)*(1-Math.exp(-10*dt))}
  else this.vx*=Math.exp(-1.5*dt);
  this.x+=this.vx*dt;this.vy-=this.config.gravity*dt;this.y+=this.vy*dt;
  if(this.y<=0){this.y=0;this.vy=Math.max(0,this.vy);this.jumps=2;if(this.hitActive&&this.landingAge===null)this.landingAge=0}
  for(const o of this.obstacles){
   this.prepareObstacle(o);o.previous={x:o.x,lift:o.lift,angle:o.angle};o.age+=dt;
   if(o.reacting){
    o.reactionAge+=dt;o.x+=o.vx*dt;this.moveProp(o,dt);
    o.vx*=Math.exp(-.35*dt);
   }else{
    o.x-=speed*clockDt;
    if(o.kind==='high'||o.kind==='low')this.moveProp(o,dt);
   }
  }
  // Continuous translation test catches fast books before an end-step overlap.
  for(const o of this.obstacles){
   if(!o.previous)continue;
   const prev=o.previous,from={...o,x:prev.x,lift:prev.lift,angle:prev.angle};
   const collision=obstaclePolygons(from,WORLD.floor).map(poly=>sweepPolygons(this.catPolygon(previous.x,previous.y),poly,{x:this.x-previous.x,y:previous.y-this.y},{x:o.x-prev.x,y:prev.lift-o.lift})).filter(Boolean).sort((a,b)=>a.time-b.time)[0];
   if(collision){
    const t=collision.time;this.x=previous.x+(this.x-previous.x)*t;this.y=previous.y+(this.y-previous.y)*t;
    o.x=prev.x+(o.x-prev.x)*t;o.lift=prev.lift+(o.lift-prev.lift)*t;
    this.separate(o,collision.normal,0);this.react(o,collision.normal);
   }
  }
  // Invulnerability and damageConsumed never bypass these physical passes.
  for(let pass=0;pass<24;pass++){
   let resolved=false;
   for(const o of this.obstacles){
    for(const part of obstaclePolygons(o,WORLD.floor)){const overlap=penetration(this.catPolygon(),part);if(overlap){this.separate(o,overlap.normal,overlap.depth);this.react(o,overlap.normal);resolved=true}}
    const ground=this.groundLift(o);if(o.lift<ground){o.lift=ground;resolved=true}
   }
   this.x=Math.max(30,this.x);this.y=Math.max(0,this.y);
   if(!resolved)break;
  }
  this.maxPenetration=Math.max(0,...this.obstacles.flatMap(o=>obstaclePolygons(o,WORLD.floor).map(poly=>penetration(this.catPolygon(),poly)?.depth||0)));
  this.obstacles=this.obstacles.filter(o=>o.x+o.w> -100&&o.x< WORLD.width+130&&(!o.reacting||o.reactionAge<(o.reactionLifetime??this.config.propLifetime)));
  // Resolve fatal contacts and the active-time limit before releasing any pending book.
  if(this.health>0&&this.elapsed<this.config.duration){
   this.updateThrow(dt);this.updateBurst();
   if(!this.burst&&this.elapsed>=this.spawnAt&&this.spawn())this.spawnAt=this.elapsed+Math.max(this.config.minimumInterval,this.config.obstacleInterval-.4*this.elapsed/this.config.duration);
  }else this.cancelThrows();
  if(this.health<=0){this.cancelThrows();this.defeatAge+=dt;if(this.defeatAge>=this.config.defeatDelay)this.state='failed'}
  else if(this.elapsed>=this.config.duration)this.beginEnding();
 }
 separate(o,n,depth){
  const distance=depth+this.config.contactGap;
  // Both are light movable bodies. Share the MTV; never send the cat through a prop.
  this.x+=n.x*distance*.6;this.y-=n.y*distance*.6;
  o.x-=n.x*distance*.4;o.lift+=n.y*distance*.4;
  this.contacts.push({x:this.x+this.config.catCollider.x+this.config.catCollider.w/2,y:WORLD.floor-this.y-24,normal:n});
 }
}
