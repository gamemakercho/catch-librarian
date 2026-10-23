import {createProp} from './props.js?v=20261023-chase3';
import { CONFIG } from './config.js?v=20261023-chase3';
import { boxPolygon, obstaclePolygons, penetration, sweepPolygons } from './collision.js?v=20261023-chase3';
export const WORLD=Object.freeze({width:960,height:500,floor:415,catX:240,librarianX:780});
export const normalizeAnswer=value=>value.normalize('NFC').replace(/[\s!.！。．]/gu,'');
const acceptedAnswer=String.fromCodePoint(44256,50577,51060,50752,32,49324,49436,44032,32,46028,50500,50772,45796);
export const isCorrectAnswer=value=>normalizeAnswer(value)===normalizeAnswer(acceptedAnswer);
export class Chase {
 constructor(config=CONFIG){this.config=config;this.reset()}
 reset(){Object.assign(this,{state:'ready',elapsed:0,health:this.config.health,x:WORLD.catX,vx:0,y:0,vy:0,jumps:2,invincible:0,obstacles:[],spawnAt:this.config.warmup,serial:0,bookSerial:0,distance:0,recoil:0,hits:0,hitStop:0,stun:0,hitActive:false,hitAge:0,landingAge:null,defeatAge:0,discoveryAge:0,contacts:[],maxPenetration:0})}
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
 spawn(){
  const kinds=['stack','high','basket','low','box','basket','high'],kind=kinds[this.serial%kinds.length];
  const airborne=kind==='high'||kind==='low',spriteId=airborne?['book-red','book-green','book-blue'][(this.bookSerial+Math.floor(this.bookSerial/3))%3]:kind==='stack'?'book-stack':kind;
  const trajectory=airborne?Math.floor(this.bookSerial/9)%3:0;
  const o=createProp(spriteId,{id:this.serial,kind,trajectory,lift:0});
  o.x=WORLD.librarianX-this.config.librarianHeight*.28-o.w/2;
  // Lift is the artwork's bottom, so each natural book height shares the hand center.
  o.launchLift=this.config.librarianHeight*.56-o.h/2;o.lift=airborne?o.launchLift:0;
  if(airborne){
   o.vy=(kind==='high'?this.config.bookThrowHigh:this.config.bookThrowLow)[trajectory];
   o.angle=-.18+trajectory*.12;o.angularVelocity=[1.4,-1.7,2.1][trajectory];
  }
  this.serial++;if(airborne)this.bookSerial++;
  this.obstacles.push(this.prepareObstacle(o));this.recoil=.25;return true;
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
  this.spawnAt=Math.max(this.spawnAt,this.elapsed+this.config.spawnRecoverySpace);return true;
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
  if(this.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;
  let remaining=Math.min(dt,.5);this.contacts=[];
  while(remaining>1e-9&&this.state==='playing'){
   if(this.hitStop>0){const frozen=Math.min(remaining,this.hitStop);this.hitStop=Math.max(0,this.hitStop-frozen);remaining-=frozen;continue}
   const cameraSpeed=this.config.runSpeed+this.config.speedIncrease*this.elapsed/this.config.duration;
   const maxMotion=Math.max(300,Math.abs(this.vx)+Math.abs(this.vy),...this.obstacles.map(o=>(o.reacting?Math.abs(o.vx||0):cameraSpeed)+Math.abs(o.vy||0)));
   const angular=Math.max(1,...this.obstacles.map(o=>Math.abs(o.angularVelocity||0)));
   const step=Math.min(remaining,1/120,4/maxMotion,.04/angular);this.step(step);remaining-=step;
  }
 }
 step(dt){
  if(this.health>0)dt=Math.min(dt,this.config.duration-this.elapsed);
  if(dt<=0){this.state='discovery';return}
  const clockDt=Math.min(dt,Math.max(0,this.config.duration-this.elapsed));
  const previous={x:this.x,y:this.y};
  this.elapsed=Math.min(this.config.duration,this.elapsed+clockDt);
  this.invincible=Math.max(0,this.invincible-dt);this.stun=Math.max(0,this.stun-dt);this.recoil=Math.max(0,this.recoil-dt);
  if(this.hitActive){this.hitAge+=dt;if(this.landingAge!==null){this.landingAge+=dt;if(this.landingAge>=.26){this.hitActive=false;this.landingAge=null}}}
  const speed=this.config.runSpeed+this.config.speedIncrease*(this.elapsed-clockDt/2)/this.config.duration;
  this.distance+=speed*clockDt;
  if(this.stun<=0){const desired=Math.max(-this.config.homeSpeed,Math.min(this.config.homeSpeed,(WORLD.catX-this.x)*7));this.vx+=(desired-this.vx)*(1-Math.exp(-10*dt))}
  else this.vx*=Math.exp(-1.5*dt);
  this.x+=this.vx*dt;this.vy-=this.config.gravity*dt;this.y+=this.vy*dt;
  if(this.y<=0){this.y=0;this.vy=Math.max(0,this.vy);this.jumps=2;if(this.hitActive&&this.landingAge===null)this.landingAge=0}
  if(this.elapsed>=this.spawnAt&&this.elapsed<this.config.duration&&this.health>0){this.spawn();this.spawnAt=this.elapsed+Math.max(this.config.minimumInterval,this.config.obstacleInterval-.4*this.elapsed/this.config.duration)}
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
  this.obstacles=this.obstacles.filter(o=>o.x+o.w> -100&&o.x< WORLD.width+130&&(!o.reacting||o.reactionAge<this.config.propLifetime));
  if(this.health<=0){this.defeatAge+=dt;if(this.defeatAge>=this.config.defeatDelay)this.state='failed'}
  else if(this.elapsed>=this.config.duration)this.state='discovery';
 }
 separate(o,n,depth){
  const distance=depth+this.config.contactGap;
  // Both are light movable bodies. Share the MTV; never send the cat through a prop.
  this.x+=n.x*distance*.6;this.y-=n.y*distance*.6;
  o.x-=n.x*distance*.4;o.lift+=n.y*distance*.4;
  this.contacts.push({x:this.x+this.config.catCollider.x+this.config.catCollider.w/2,y:WORLD.floor-this.y-24,normal:n});
 }
}
