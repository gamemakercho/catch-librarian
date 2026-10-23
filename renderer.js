import { CONFIG } from './config.js?v=20261023-chase3';
import { WORLD } from './engine.js?v=20261023-chase3';
import { obstaclePolygons } from './collision.js?v=20261023-chase3';
import {BACKGROUND_LAYOUT} from './scene-data.js?v=20261023-chase3';
import {propTransform} from './props.js?v=20261023-chase3';
const {floor,librarianX} = WORLD;
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h)}
export function backgroundTiles(distance,section,width=WORLD.width){
 const r=section.source_rect,scale=section.destination_height/r.h,tileWidth=r.w*scale,scroll=distance*section.distance_factor,first=Math.floor(scroll/tileWidth);
 const tiles=[];for(let index=first;index*tileWidth-scroll<width;index++)tiles.push({index,x:index*tileWidth-scroll,width:tileWidth,flipped:Math.abs(index%2)===1});return tiles;
}
export function obstacleOpacity(o,config=CONFIG,ageOffset=0){
 if(!o.reacting)return 1;
 return Math.max(0,Math.min(1,(config.propLifetime-o.reactionAge-ageOffset)/(config.propLifetime-config.propFadeStart)));
}
export function discoveryPose(game){
 const age=game.discoveryAge||0,progress=Math.min(1,age/.45),ease=1-(1-progress)**3;
 return {age,catX:(game.discoveryStartX??game.x)+32*ease,catY:(game.discoveryStartY??game.y)*(1-ease),librarianX:librarianX+10*ease};
}
export class Renderer {
 constructor(canvas,images,layout){
  this.canvas=canvas;this.c=canvas.getContext('2d');this.layout=layout;this.propsImage=images[3];this.backgroundImage=images[4];this.debug=CONFIG.debugCollisions;
  this.sheets=new Map(layout.sheets.map((sheet,index)=>[sheet.id,{...sheet,image:images[index]}]));
  this.scales={cat:CONFIG.catHeight/layout.scale_groups.cat.reference_height_px,librarian:CONFIG.librarianHeight/layout.scale_groups.librarian.reference_height_px};this.resize();
 }
 resize(){const width=this.canvas.getBoundingClientRect?.().width||WORLD.width,dpr=Math.min(3,globalThis.devicePixelRatio||1),pixels=Math.max(1,Math.round(width*dpr));if(this.canvas.width!==pixels){this.canvas.width=pixels;this.canvas.height=Math.round(pixels*WORLD.height/WORLD.width)}this.c.setTransform(this.canvas.width/WORLD.width,0,0,this.canvas.height/WORLD.height,0,0);this.c.imageSmoothingEnabled=true}
 sprite(id,x,y,t,frameIndex=null){
  const sheet=this.sheets.get(id),frame=sheet.frames[frameIndex??Math.floor(t*CONFIG.spriteFPS)%sheet.frames.length],anchor=frame.anchor_local,r=frame.source_rect,scale=this.scales[sheet.scale_group];
  this.c.drawImage(sheet.image,r.x,r.y,r.w,r.h,x-anchor.x*scale,y-anchor.y*scale,r.w*scale,r.h*scale);
 }
 draw(game,ambient){
  const c=this.c;c.clearRect(0,0,960,500);this.background(game.distance);
  const t=game.state==='ready'?ambient:game.elapsed,discovering=game.state==='discovery',pose=discovering?discoveryPose(game):{catX:game.x,catY:game.y,librarianX};
  const shadow=(x,y,w)=>{c.fillStyle='#4c322530';c.beginPath();c.ellipse(x,y,w,5,0,0,Math.PI*2);c.fill()};shadow(pose.catX,floor+3,Math.max(7,25-pose.catY*.06));shadow(pose.librarianX,floor+4,42);
  if(game.state==='playing'&&!game.hitActive)for(let j=0;j<3;j++){const f=(t*3+j/3)%1;c.fillStyle='rgba(255,236,201,'+((1-f)*.6)+')';c.beginPath();c.ellipse(game.x-30-f*40,floor-3-f*13,3+f*5,2+f*4,0,0,Math.PI*2);c.fill()}
  this.sprite('librarian-run',pose.librarianX+(game.recoil>0&&!discovering?Math.sin(game.recoil*30)*7:0),floor,t+.2,discovering?0:null);
  for(const o of game.obstacles)this.obstacle(o,discovering?Math.max(0,1-pose.age/.25):1,game.state==='failed'?game.failedVisualAge||0:0);
  c.save();if(game.invincible>0&&!game.hitActive&&Math.floor(t*12)%8===0)c.globalAlpha=.9;
  const bounce=game.state==='playing'&&!game.hitActive&&game.y===0?Math.sin(t*CONFIG.spriteFPS*Math.PI)*.8:0;
  if(discovering)this.sprite('cat-hit-recover-v2',pose.catX,floor-pose.catY,t,0);
  else if(game.hitActive)this.sprite('cat-hit-recover-v2',game.x,floor-game.y,t,game.hitFrame);
  else this.sprite('cat-run-thin-v2',game.x,floor-game.y+bounce,t);c.restore();
  let v=c.createRadialGradient(480,230,160,480,230,620);v.addColorStop(0,'#46311900');v.addColorStop(1,'#46311938');rect(c,0,0,960,500,v);
  if(discovering)this.discovery(pose);
  if(this.debug&&!discovering)this.drawDebug(game);
 }
 background(distance){
  const c=this.c;for(const section of [BACKGROUND_LAYOUT.wall,BACKGROUND_LAYOUT.floor]){
   const r=section.source_rect;for(const tile of backgroundTiles(distance,section)){
    c.save();c.translate(tile.x+(tile.flipped?tile.width:0),section.destination_y);if(tile.flipped)c.scale(-1,1);
    c.drawImage(this.backgroundImage,r.x,r.y,r.w,r.h,0,0,tile.width,section.destination_height);c.restore();
   }
  }
 }
 obstacle(o,opacity=1,ageOffset=0){
  const t=propTransform(o,floor);if(!t.frame)return;
  const c=this.c,r=t.frame.source_rect,p=t.frame.pivot_local;
  c.save();c.globalAlpha=obstacleOpacity(o,CONFIG,ageOffset)*opacity;c.translate(t.x,t.y);c.rotate(o.angle||0);
  c.drawImage(this.propsImage,r.x,r.y,r.w,r.h,-p.x*t.scale,-p.y*t.scale,r.w*t.scale,r.h*t.scale);c.restore();
 }
 discovery(pose){
  const c=this.c,appear=Math.min(1,Math.max(0,(pose.age-.12)/.3));if(appear===0)return;
  const bubble=(x,y,w,h,text,font=22)=>{c.fillStyle='#fff9e9';c.strokeStyle='#735039';c.lineWidth=2;c.beginPath();c.roundRect(x-w/2,y-h/2,w,h,12);c.fill();c.stroke();c.fillStyle='#60452f';c.font=`bold ${font}px "Malgun Gothic",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,x,y)};
  c.save();c.globalAlpha=appear;
  // A small tube of cat treat appears ahead, inside the same running stage.
  c.save();c.translate(863,floor-11);c.rotate(-.14);c.scale(1+Math.sin(pose.age*4)*.025,1+Math.sin(pose.age*4)*.025);
  c.fillStyle='#f6d268';c.strokeStyle='#70452f';c.lineWidth=2;c.beginPath();c.roundRect(-32,-10,64,20,4);c.fill();c.stroke();
  c.fillStyle='#c76d65';c.fillRect(-29,-8,9,16);c.fillRect(21,-8,8,16);c.fillStyle='#805239';c.font='bold 11px "Malgun Gothic",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('츄르',1,0);c.restore();
  c.strokeStyle='#ffeaa0';c.lineWidth=3;
  for(let i=0;i<4;i++){const a=i*Math.PI/2+pose.age*.7,x=863+Math.cos(a)*47,y=floor-15+Math.sin(a)*27;c.beginPath();c.moveTo(x-5,y);c.lineTo(x+5,y);c.moveTo(x,y-6);c.lineTo(x,y+6);c.stroke()}
  if(pose.age>.35){bubble(pose.librarianX, floor-218,126,39,'츄르?!');bubble(pose.catX+25,floor-pose.catY-88,32,38,'!',25)}
  c.restore();
 }
 drawDebug(game){const c=this.c;const outline=(poly,color)=>{c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();poly.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke()};outline(game.catPolygon(),'#00ff9d');for(const o of game.obstacles)for(const poly of obstaclePolygons(o,floor))outline(poly,o.damageConsumed?'#ffaa00':'#ff48d4');for(const p of game.contacts){c.fillStyle='#fff';c.beginPath();c.arc(p.x,p.y,3,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+p.normal.x*24,p.y+p.normal.y*24);c.stroke()}c.fillStyle='#102d28dd';c.fillRect(10,10,440,35);c.fillStyle='#fff';c.font='16px monospace';c.fillText('x '+game.x.toFixed(1)+' vx '+game.vx.toFixed(1)+' y '+game.y.toFixed(1)+' penetration '+game.maxPenetration.toFixed(4),20,33)}
}
