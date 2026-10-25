import {CONFIG} from './config.js?v=20261025-fullscreen7';
import {WORLD} from './engine.js?v=20261025-fullscreen7';
import {obstaclePolygons} from './collision.js?v=20261025-fullscreen7';
import {BACKGROUND_LAYOUT,PROPS_LAYOUT} from './scene-data.js?v=20261025-fullscreen7';
import {createProp,propTransform} from './props.js?v=20261025-fullscreen7';
import {librarianPose,heldBookPose,LIBRARIAN_SCALE} from './librarian-motion.js?v=20261025-fullscreen7';
const {floor}=WORLD;
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h)}
export function backgroundTiles(distance,section,width=WORLD.width){
 const r=section.source_rect,scale=section.destination_height/r.h,tileWidth=r.w*scale,scroll=distance*section.distance_factor,first=Math.floor(scroll/tileWidth);
 const tiles=[];for(let index=first;index*tileWidth-scroll<width;index++)tiles.push({index,x:index*tileWidth-scroll,width:tileWidth,flipped:Math.abs(index%2)===1});return tiles;
}
export function obstacleOpacity(o,config=CONFIG,ageOffset=0){
 if(!o.reacting)return 1;
 const lifetime=o.reactionLifetime??config.propLifetime,fadeStart=o.fadeStart??config.propFadeStart;
 return Math.max(0,Math.min(1,(lifetime-o.reactionAge-ageOffset)/(lifetime-fadeStart)));
}
export function endingCatPose(game){
 const age=game.endingAge||0,ease=1-(1-Math.min(1,age/.45))**3;
 return {catX:(game.endingStartX??game.x)+20*ease,catY:(game.endingStartY??game.y)*(1-ease)};
}
export class Renderer {
 constructor(canvas,images,layout){
  this.canvas=canvas;this.c=canvas.getContext('2d');this.layout=layout;this.images=images;this.propsImage=images[PROPS_LAYOUT.image];this.backgroundImage=images[BACKGROUND_LAYOUT.image];this.debug=CONFIG.debugCollisions;
  this.sheets=new Map(layout.sheets.map(sheet=>[sheet.id,{...sheet,image:images[sheet.image]}]));
  this.scales={cat:CONFIG.catHeight/layout.scale_groups.cat.reference_height_px,librarian:LIBRARIAN_SCALE};this.outlineCache=new Map();this.resize();
 }
 resize(){const box=this.canvas.getBoundingClientRect?.()||{width:WORLD.width,height:WORLD.height},width=box.width||WORLD.width,height=box.height||width*WORLD.height/WORLD.width,dpr=Math.min(3,globalThis.devicePixelRatio||1);
  this.canvas.width=Math.max(1,Math.round(width*dpr));this.canvas.height=Math.max(1,Math.round(height*dpr));this.viewWidth=Math.max(WORLD.width,WORLD.height*width/height);this.viewHeight=height*this.viewWidth/width;this.viewX=(this.viewWidth-WORLD.width)/2;this.viewOffset=this.viewHeight-WORLD.height;
  const scale=this.canvas.width/this.viewWidth;this.c.setTransform(scale,0,0,scale,this.viewX*scale,this.viewOffset*scale);this.c.imageSmoothingEnabled=true;
 }
 sprite(id,x,y,t,frameIndex=null){
  const sheet=this.sheets.get(id),frame=sheet.frames[frameIndex??Math.floor(t*CONFIG.spriteFPS)%sheet.frames.length],anchor=frame.anchor_local,r=frame.source_rect,scale=this.scales[sheet.scale_group];
  this.c.drawImage(sheet.image,r.x,r.y,r.w,r.h,x-anchor.x*scale,y-anchor.y*scale,r.w*scale,r.h*scale);
 }
 motionFrame(sample,root,clipArea=null){
  const c=this.c,f=sample.frame,r=f.source_rect,a=f.root_anchor,s=sample.scale,image=this.images[sample.clip.image];
  c.save();if(clipArea){c.beginPath();c.rect(root.x+(clipArea.x-a.x)*s,root.y+(clipArea.y-a.y)*s,clipArea.w*s,clipArea.h*s);c.clip()}
  c.drawImage(image,r.x,r.y,r.w,r.h,root.x-a.x*s,root.y-a.y*s,r.w*s,r.h*s);c.restore();
 }
 librarian(game,t){
  const p=librarianPose(game,t);
  if(p.throwing){
   const upper=p.frame.upper_body_clip,cut=upper.y+upper.h;
   this.motionFrame({...p,clip:p.runSample.clip,frame:p.runFrame},p.root,{x:0,y:cut,w:320,h:320-cut});
   this.motionFrame(p,p.root,upper);
   if(!game.throwAction.released&&p.frame.held_book){const held=heldBookPose({...game,elapsed:t},game.throwAction);if(held)this.obstacle(createProp(held.spriteId,{...held,kind:'held',reacting:false}),1,0,false)}
  }else this.motionFrame(p,p.root);
  return p;
 }
 draw(game,ambient){
  const c=this.c;c.clearRect(-this.viewX,-this.viewOffset,this.viewWidth,this.viewHeight);this.background(game.distance);
  const ending=(String(game.state).startsWith('ending-')||(game.state==='paused'&&game.endingStarted)),t=game.state==='ready'?ambient:game.elapsed+(ending?game.endingAge||0:0),cat=ending?endingCatPose(game):{catX:game.x,catY:game.y};
  const shadow=(x,y,w)=>{c.fillStyle='#4c322530';c.beginPath();c.ellipse(x,y,w,5,0,0,Math.PI*2);c.fill()};shadow(cat.catX,floor+3,Math.max(7,25-cat.catY*.06));
  if(!ending||(game.endingAge||0)<(game.config?.discoverySeconds??CONFIG.discoverySeconds)+.64)shadow(WORLD.librarianX,floor+4,35);
  if(game.state==='playing'&&!game.hitActive)for(let j=0;j<3;j++){const f=(t*3+j/3)%1;c.fillStyle='rgba(255,236,201,'+((1-f)*.6)+')';c.beginPath();c.ellipse(game.x-30-f*40,floor-3-f*13,3+f*5,2+f*4,0,0,Math.PI*2);c.fill()}
  for(const o of game.obstacles)this.obstacle(o,ending?Math.max(0,1-(game.endingAge||0)/.2):1,game.state==='failed'?game.failedVisualAge||0:0);
  const pose=this.librarian(game,t);
  c.save();if(game.invincible>0&&!game.hitActive&&Math.floor(t*12)%8===0)c.globalAlpha=.9;
  const bounce=game.state==='playing'&&!game.hitActive&&game.y===0?Math.sin(t*CONFIG.spriteFPS*Math.PI)*.8:0;
  if(ending&&game.endingAge>.15)this.sprite('cat-hit-recover-v2',cat.catX,floor-cat.catY,t,0);
  else if(game.hitActive)this.sprite('cat-hit-recover-v2',game.x,floor-game.y,t,game.hitFrame);
  else this.sprite('cat-run-thin-v2',cat.catX,floor-cat.catY+bounce,t);c.restore();
  let v=c.createRadialGradient(480,230,160,480,230,620);v.addColorStop(0,'#46311900');v.addColorStop(1,'#46311938');rect(c,-this.viewX,-this.viewOffset,this.viewWidth,this.viewHeight,v);
  if(ending)this.ending(game,cat);
  if(this.debug)this.drawDebug(game,pose);
 }
 background(distance){
  const c=this.c,offset=this.viewOffset||0;
  // Extend the scenery above the play lane. Every image keeps a uniform scale;
  // characters, collision coordinates and throw timing stay in the original world.
  const wall={...BACKGROUND_LAYOUT.wall,destination_y:-offset,destination_height:BACKGROUND_LAYOUT.wall.destination_height+offset};
  for(const section of [wall,BACKGROUND_LAYOUT.floor]){
   const r=section.source_rect;for(const tile of backgroundTiles(distance,section,this.viewWidth||WORLD.width)){
    c.save();c.translate(tile.x-(this.viewX||0)+(tile.flipped?tile.width:0),section.destination_y);if(tile.flipped)c.scale(-1,1);
    c.drawImage(this.backgroundImage,r.x,r.y,r.w,r.h,0,0,tile.width,section.destination_height);c.restore();
   }
  }
 }
 outlinedProp(frame,scaleX,image,scaleY=scaleX){
  const cacheKey=frame.id+':'+scaleX+':'+scaleY;if(this.outlineCache.has(cacheKey))return this.outlineCache.get(cacheKey);
  const make=()=>this.canvas.ownerDocument?.createElement('canvas')||globalThis.document?.createElement?.('canvas');
  const mask=make(),out=make();if(!mask||!out){this.outlineCache.set(cacheKey,null);return null}
  const r=frame.source_rect,pad=5,ratio=2,w=r.w*scaleX,h=r.h*scaleY;
  mask.width=out.width=Math.ceil((w+pad*2)*ratio);mask.height=out.height=Math.ceil((h+pad*2)*ratio);
  const m=mask.getContext('2d'),o=out.getContext('2d');if(!m||!o){this.outlineCache.set(cacheKey,null);return null}
  m.scale(ratio,ratio);m.drawImage(image,r.x,r.y,r.w,r.h,pad,pad,w,h);m.globalCompositeOperation='source-in';m.fillStyle='#fff6d8';m.fillRect(0,0,mask.width,mask.height);
  o.scale(ratio,ratio);o.shadowColor='#39251c38';o.shadowBlur=2*ratio;o.shadowOffsetY=ratio;
  // Dilate a cached alpha mask; no frame loop reads or scans source pixels.
  for(let i=0;i<12;i++){const a=i*Math.PI/6;o.drawImage(mask,Math.cos(a)*1.7,Math.sin(a)*1.7,mask.width/ratio,mask.height/ratio)}
  o.shadowColor='transparent';o.shadowBlur=o.shadowOffsetY=0;o.drawImage(image,r.x,r.y,r.w,r.h,pad,pad,w,h);
  const cached={canvas:out,pad,w:out.width/ratio,h:out.height/ratio};this.outlineCache.set(cacheKey,cached);return cached;
 }
 obstacle(o,opacity=1,ageOffset=0,danger=true){
  const t=propTransform(o,floor);if(!t.frame)return;
  const c=this.c,r=t.frame.source_rect,p=t.frame.pivot_local,image=this.images[t.frame.image||PROPS_LAYOUT.image];
  c.save();c.globalAlpha=obstacleOpacity(o,CONFIG,ageOffset)*opacity;
  if(danger&&!o.reacting&&!['low','high'].includes(o.kind)){c.fillStyle='#3c2b2229';c.beginPath();c.ellipse(o.x+o.w/2,floor+2,Math.max(9,o.w*.36),3,0,0,Math.PI*2);c.fill()}
  c.translate(t.x,t.y);c.rotate(o.angle||0);
  const outline=danger?this.outlinedProp(t.frame,t.scaleX,image,t.scaleY):null;
  if(outline)c.drawImage(outline.canvas,-p.x*t.scaleX-outline.pad,-p.y*t.scaleY-outline.pad,outline.w,outline.h);
  else{if(danger){c.shadowColor='#fff6d8';c.shadowBlur=3.4}c.drawImage(image,r.x,r.y,r.w,r.h,-p.x*t.scaleX,-p.y*t.scaleY,r.w*t.scaleX,r.h*t.scaleY)}
  if(danger&&o.kind==='double-stack'){
   const b=t.frame.visible_bounds_local,x=(b.x+b.w/2-p.x)*t.scaleX,y=(b.y-p.y)*t.scaleY-8;
   c.shadowColor='transparent';c.lineWidth=2.5;c.strokeStyle='#76513c';c.fillStyle='#f7d47a';c.font='bold 17px sans-serif';c.textAlign='center';c.textBaseline='bottom';c.strokeText('↑↑',x,y);c.fillText('↑↑',x,y);
  }
  c.restore();
 }
 ending(game,cat){
  const c=this.c,age=game.endingAge||0,hold=game.config?.discoverySeconds??CONFIG.discoverySeconds,toe=game.endingToe||{x:814,y:floor};
  c.save();c.strokeStyle='#765139';c.lineWidth=3;c.beginPath();c.moveTo(toe.x-12,floor+1);c.lineTo(toe.x+16,floor+1);c.lineTo(toe.x+19,floor-3);c.stroke();
  c.save();c.translate(863,floor-11);c.rotate(-.14);c.fillStyle='#f6d268';c.strokeStyle='#70452f';c.lineWidth=1.5;c.beginPath();c.roundRect(-24,-8,48,16,3);c.fill();c.stroke();c.fillStyle='#c76d65';c.fillRect(-22,-6,7,12);c.fillRect(16,-6,6,12);c.fillStyle='#805239';c.font='bold 9px "Malgun Gothic",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('츄르',1,0);c.restore();
  if(age>.12&&age<hold+.65){c.fillStyle='#fff7df';c.strokeStyle='#765139';c.lineWidth=1.5;c.beginPath();c.roundRect(cat.catX+9,floor-cat.catY-99,28,34,9);c.fill();c.stroke();c.fillStyle='#60452f';c.font='bold 23px sans-serif';c.textAlign='center';c.fillText('!',cat.catX+23,floor-cat.catY-75)}
  if(age<hold){
   c.fillStyle='#fff7df';c.strokeStyle='#765139';c.lineWidth=1.5;c.beginPath();c.roundRect(WORLD.librarianX-44,floor-222,88,35,10);c.fill();c.stroke();c.fillStyle='#60452f';c.font='bold 18px "Malgun Gothic",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('츄르!',WORLD.librarianX,floor-204);
  }
  c.restore();
 }
 drawDebug(game,pose=librarianPose(game)){
  const c=this.c,outline=(poly,color)=>{c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();poly.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke()};
  outline(game.catPolygon(),'#00ff9d');for(const o of game.obstacles)for(const poly of obstaclePolygons(o,floor))outline(poly,o.damageConsumed?'#ffaa00':'#ff48d4');
  for(const p of game.contacts){c.fillStyle='#fff';c.beginPath();c.arc(p.x,p.y,3,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+p.normal.x*24,p.y+p.normal.y*24);c.stroke()}
  c.strokeStyle='#5be6ff';c.lineWidth=1;c.beginPath();c.moveTo(0,floor);c.lineTo(WORLD.width,floor);c.stroke();
  const {root,frame,scale}=pose,a=frame.root_anchor,head=frame.head_reference,point=p=>({x:root.x+(p.x-a.x)*scale,y:root.y+(p.y-a.y)*scale});
  c.strokeStyle='#00eaff';c.beginPath();c.moveTo(root.x-6,root.y);c.lineTo(root.x+6,root.y);c.moveTo(root.x,root.y-6);c.lineTo(root.x,root.y+6);c.stroke();
  if(head){const h=point(head.face_center),w=head.face_size.w*scale,hh=head.face_size.h*scale;c.strokeStyle='#ffe500';c.strokeRect(h.x-w/2,h.y-hh/2,w,hh);c.fillStyle='#ffe500';c.beginPath();c.arc(h.x,h.y,2,0,Math.PI*2);c.fill()}
  if(frame.support_anchor){const p=point(frame.support_anchor);c.strokeStyle='#00ff9d';c.beginPath();c.arc(p.x,p.y,4,0,Math.PI*2);c.stroke()}
  c.fillStyle='#102d28dd';c.fillRect(10,10,575,53);c.fillStyle='#fff';c.font='14px monospace';c.fillText('x '+game.x.toFixed(1)+' vx '+game.vx.toFixed(1)+' y '+game.y.toFixed(1)+' penetration '+game.maxPenetration.toFixed(4),20,31);c.fillText(pose.name+' '+pose.frameIndex+' run '+pose.runFrameIndex+' pelvis '+root.x.toFixed(1)+','+root.y.toFixed(1),20,51);
 }
}
