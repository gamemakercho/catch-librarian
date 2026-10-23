import { CONFIG } from './config.js?v=20261023-flat2';
import { WORLD } from './engine.js?v=20261023-flat2';
import { obstaclePolygons } from './collision.js?v=20261023-flat2';
import {BACKGROUND_LAYOUT} from './scene-data.js?v=20261023-flat2';
import {propTransform} from './props.js?v=20261023-flat2';
const {floor,librarianX} = WORLD;
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h)}
export function backgroundTiles(distance,section,width=WORLD.width){
 const r=section.source_rect,scale=section.destination_height/r.h,tileWidth=r.w*scale,scroll=distance*section.distance_factor,first=Math.floor(scroll/tileWidth);
 const tiles=[];for(let index=first;index*tileWidth-scroll<width;index++)tiles.push({index,x:index*tileWidth-scroll,width:tileWidth,flipped:Math.abs(index%2)===1});return tiles;
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
  const t=game.state==='ready'?ambient:game.elapsed;
  const shadow=(x,y,w)=>{c.fillStyle='#4c322530';c.beginPath();c.ellipse(x,y,w,5,0,0,Math.PI*2);c.fill()};shadow(game.x,floor+3,Math.max(7,25-game.y*.06));shadow(librarianX,floor+4,42);
  if(game.state==='playing'&&!game.hitActive)for(let j=0;j<3;j++){const f=(t*3+j/3)%1;c.fillStyle='rgba(255,236,201,'+((1-f)*.6)+')';c.beginPath();c.ellipse(game.x-30-f*40,floor-3-f*13,3+f*5,2+f*4,0,0,Math.PI*2);c.fill()}
  this.sprite('librarian-run',librarianX+(game.recoil>0?Math.sin(game.recoil*30)*7:0),floor,t+.2);
  for(const o of game.obstacles)this.obstacle(o);
  c.save();if(game.invincible>0&&!game.hitActive&&Math.floor(t*12)%8===0)c.globalAlpha=.9;
  const bounce=game.state==='playing'&&!game.hitActive&&game.y===0?Math.sin(t*CONFIG.spriteFPS*Math.PI)*.8:0;
  if(game.hitActive)this.sprite('cat-hit-recover-v2',game.x,floor-game.y,t,game.hitFrame);
  else this.sprite('cat-run-thin-v2',game.x,floor-game.y+bounce,t);c.restore();
  let v=c.createRadialGradient(480,230,160,480,230,620);v.addColorStop(0,'#46311900');v.addColorStop(1,'#46311938');rect(c,0,0,960,500,v);
  if(this.debug)this.drawDebug(game);
 }
 background(distance){
  const c=this.c;for(const section of [BACKGROUND_LAYOUT.wall,BACKGROUND_LAYOUT.floor]){
   const r=section.source_rect;for(const tile of backgroundTiles(distance,section)){
    c.save();c.translate(tile.x+(tile.flipped?tile.width:0),section.destination_y);if(tile.flipped)c.scale(-1,1);
    c.drawImage(this.backgroundImage,r.x,r.y,r.w,r.h,0,0,tile.width,section.destination_height);c.restore();
   }
  }
 }
 obstacle(o){
  const t=propTransform(o,floor);if(!t.frame)return;
  const c=this.c,r=t.frame.source_rect,p=t.frame.pivot_local;
  c.save();c.translate(t.x,t.y);c.rotate(o.angle||0);
  c.drawImage(this.propsImage,r.x,r.y,r.w,r.h,-p.x*t.scale,-p.y*t.scale,r.w*t.scale,r.h*t.scale);c.restore();
 }
 drawDebug(game){const c=this.c;const outline=(poly,color)=>{c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();poly.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke()};outline(game.catPolygon(),'#00ff9d');for(const o of game.obstacles)for(const poly of obstaclePolygons(o,floor))outline(poly,o.damageConsumed?'#ffaa00':'#ff48d4');for(const p of game.contacts){c.fillStyle='#fff';c.beginPath();c.arc(p.x,p.y,3,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+p.normal.x*24,p.y+p.normal.y*24);c.stroke()}c.fillStyle='#102d28dd';c.fillRect(10,10,440,35);c.fillStyle='#fff';c.font='16px monospace';c.fillText('x '+game.x.toFixed(1)+' vx '+game.vx.toFixed(1)+' y '+game.y.toFixed(1)+' penetration '+game.maxPenetration.toFixed(4),20,33)}
}
