import {createProp} from './props.js?v=20261023-flat2';
import { CONFIG } from './config.js?v=20261023-flat2';
import { boxPolygon, obstaclePolygons, penetration, sweepPolygons } from './collision.js?v=20261023-flat2';
export const WORLD=Object.freeze({width:960,height:500,floor:415,catX:240,librarianX:780});
export const normalizeAnswer=value=>value.normalize('NFC').replace(/[\s!.！。．]/gu,'');
const acceptedAnswer=String.fromCodePoint(44256,50577,51060,50752,32,49324,49436,44032,32,46028,50500,50772,45796);
export const isCorrectAnswer=value=>normalizeAnswer(value)===normalizeAnswer(acceptedAnswer);
export class Chase {
 constructor(config=CONFIG){this.config=config;this.reset()}
 reset(){Object.assign(this,{state:'ready',elapsed:0,health:this.config.health,x:WORLD.catX,vx:0,y:0,vy:0,jumps:2,invincible:0,obstacles:[],spawnAt:this.config.warmup,serial:0,bookSerial:0,distance:0,recoil:0,hits:0,hitStop:0,stun:0,hitActive:false,hitAge:0,landingAge:null,defeatAge:0,contacts:[],maxPenetration:0})}
 start(){this.reset();this.state='playing'}
 jump(){
  if(this.state!=='playing'||this.health<=0||this.stun>0||this.hitStop>0||this.jumps===0)return false;
  this.vy=this.jumps===2?this.config.jumpForce:this.config.doubleJumpForce;this.jumps--;this.landingAge=null;return true;
 }
 catPolygon(x=this.x,y=this.y){const b=this.config.catCollider;return boxPolygon(x+b.x,WORLD.floor-y+b.y,b.w,b.h)}
 prepareObstacle(o){
  o.lift??=0;o.targetLift??=o.lift;o.launchLift??=o.lift;o.angle??=0;o.vx??=0;o.vy??=0;o.angularVelocity??=0;o.reactionAge??=0;o.age??=0;
  o.damageConsumed??=Boolean(o.hit);o.reacting??=false;return o;
 }
 spawn(){
  const kinds=['stack','high','basket','low','box','basket','high'],kind=kinds[this.serial%kinds.length];
  const airborne=kind==='high'||kind==='low',spriteId=airborne?['book-red','book-green','book-blue'][(this.bookSerial+Math.floor(this.bookSerial/3))%3]:kind==='stack'?'book-stack':kind;
  const trajectory=airborne?Math.floor(this.bookSerial/9)%3:0;
  const o=createProp(spriteId,{id:this.serial,kind,trajectory,lift:0});
  o.x=WORLD.librarianX-this.config.librarianHeight*.28-o.w/2;
  o.targetLift=kind==='high'?128:kind==='low'?32:0;
  // Lift is the artwork's bottom, so each natural book height shares the hand center.
  o.launchLift=this.config.librarianHeight*.56-o.h/2;o.lift=airborne?o.launchLift:0;
  // An earlier deflected prop stays visible until its normal cleanup. Delay the
  // next launch if its approach could reach that prop before cleanup finishes.
  const speed=this.config.runSpeed+this.config.speedIncrease*this.elapsed/this.config.duration;
  for(const prior of this.obstacles)if(prior.reacting){
   const right=Math.max(...obstaclePolygons(prior,WORLD.floor).flat().map(p=>p.x));
   const arrival=(o.x-right-8)/(speed+Math.max(0,prior.vx));
   if(arrival<Math.max(0,3-prior.reactionAge)+.12)return false;
  }
  this.serial++;if(airborne)this.bookSerial++;
  this.obstacles.push(this.prepareObstacle(o));this.recoil=.25;return true;
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
   o.reacting=true;o.reactionAge=0;
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
   const maxMotion=Math.max(300,Math.abs(this.vx)+Math.abs(this.vy),...this.obstacles.map(o=>Math.abs(o.vx||0)+Math.abs(o.vy||0)));
   const angular=Math.max(1,...this.obstacles.map(o=>Math.abs(o.angularVelocity||0)));
   const step=Math.min(remaining,1/120,4/maxMotion,.04/angular);this.step(step);remaining-=step;
  }
 }
 step(dt){
  const previous={x:this.x,y:this.y};
  this.elapsed=Math.min(this.config.duration,this.elapsed+dt);
  this.invincible=Math.max(0,this.invincible-dt);this.stun=Math.max(0,this.stun-dt);this.recoil=Math.max(0,this.recoil-dt);
  if(this.hitActive){this.hitAge+=dt;if(this.landingAge!==null){this.landingAge+=dt;if(this.landingAge>=.26){this.hitActive=false;this.landingAge=null}}}
  const speed=this.config.runSpeed+this.config.speedIncrease*this.elapsed/this.config.duration;
  this.distance+=speed*dt;
  if(this.stun<=0){const desired=Math.max(-this.config.homeSpeed,Math.min(this.config.homeSpeed,(WORLD.catX-this.x)*7));this.vx+=(desired-this.vx)*(1-Math.exp(-10*dt))}
  else this.vx*=Math.exp(-1.5*dt);
  this.x+=this.vx*dt;this.vy-=this.config.gravity*dt;this.y+=this.vy*dt;
  if(this.y<=0){this.y=0;this.vy=Math.max(0,this.vy);this.jumps=2;if(this.hitActive&&this.landingAge===null)this.landingAge=0}
  if(this.elapsed>=this.spawnAt&&this.health>0){const spawned=this.spawn();this.spawnAt=this.elapsed+(spawned?Math.max(this.config.minimumInterval,this.config.obstacleInterval-.4*this.elapsed/this.config.duration):.12)}
  for(const o of this.obstacles){
   this.prepareObstacle(o);o.previous={x:o.x,lift:o.lift,angle:o.angle};o.age+=dt;
   if(o.reacting){
    o.reactionAge+=dt;o.x+=o.vx*dt;o.vy-=this.config.propGravity*dt;o.lift+=o.vy*dt;o.angle+=o.angularVelocity*dt;
    const bottom=Math.max(...obstaclePolygons(o,WORLD.floor).flat().map(p=>p.y));
    if(bottom>WORLD.floor){o.lift+=bottom-WORLD.floor;if(o.vy< -35)o.vy=-o.vy*.24;else o.vy=0;o.vx*=Math.exp(-2*dt);o.angularVelocity*=Math.exp(-2.5*dt)}
    o.vx*=Math.exp(-.35*dt);
   }else{
    o.x-=speed*dt;
    if(o.kind==='high'||o.kind==='low'){
     const blend=Math.max(0,1-o.age/.65);o.lift=o.targetLift+(o.launchLift-o.targetLift)*blend*blend+4*blend*(1-blend)*[0,22,44][o.trajectory||0];o.angle=Math.sin(this.elapsed*8+o.id)*.15-.2;
    }
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
   for(const o of this.obstacles)for(const part of obstaclePolygons(o,WORLD.floor)){const overlap=penetration(this.catPolygon(),part);if(overlap){this.separate(o,overlap.normal,overlap.depth);this.react(o,overlap.normal);resolved=true}}
   this.x=Math.max(30,this.x);this.y=Math.max(0,this.y);
   if(!resolved)break;
  }
  this.maxPenetration=Math.max(0,...this.obstacles.flatMap(o=>obstaclePolygons(o,WORLD.floor).map(poly=>penetration(this.catPolygon(),poly)?.depth||0)));
  this.obstacles=this.obstacles.filter(o=>o.x+o.w> -100&&o.x< WORLD.width+130&&!(o.reactionAge>3&&Math.abs(o.x-this.x)>150));
  if(this.health<=0){this.defeatAge+=dt;if(this.defeatAge>=this.config.defeatDelay)this.state='failed'}
  else if(this.elapsed>=this.config.duration)this.state='comic';
 }
 separate(o,n,depth){
  const distance=depth+this.config.contactGap;
  // Both are light movable bodies. Share the MTV; never send the cat through a prop.
  this.x+=n.x*distance*.6;this.y-=n.y*distance*.6;
  o.x-=n.x*distance*.4;o.lift+=n.y*distance*.4;
  this.contacts.push({x:this.x+this.config.catCollider.x+this.config.catCollider.w/2,y:WORLD.floor-this.y-24,normal:n});
 }
}
