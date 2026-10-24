import {PROPS_LAYOUT} from './scene-data.js?v=20261024-balance6';
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y},0)/2;
// Ear clipping keeps the air between open pages out of the contact geometry.
export function convexParts(outline){
 let points=outline.map(p=>({...p}));if(area(points)<0)points.reverse();
 const triangles=[],inside=(p,a,b,c)=>cross(a,b,p)>=-1e-8&&cross(b,c,p)>=-1e-8&&cross(c,a,p)>=-1e-8;
 while(points.length>3){let found=false;for(let i=0;i<points.length;i++){
  const a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length];
  if(cross(a,b,c)<=1e-8)continue;
  if(points.some(p=>p!==a&&p!==b&&p!==c&&inside(p,a,b,c)))continue;
  triangles.push([a,b,c]);points.splice(i,1);found=true;break;
 }if(!found)throw Error('Invalid prop outline');}
 triangles.push(points);
 // Merge adjacent ears while their union remains convex: fewer SAT projections.
 for(let changed=true;changed;){changed=false;outer:for(let i=0;i<triangles.length;i++)for(let j=i+1;j<triangles.length;j++){
  const a=triangles[i],b=triangles[j];for(let x=0;x<a.length;x++)for(let y=0;y<b.length;y++)if(a[x]===b[(y+1)%b.length]&&a[(x+1)%a.length]===b[y]){
   const merged=[...a.map((_,k)=>a[(x+1+k)%a.length]),...Array.from({length:b.length-2},(_,k)=>b[(y+2+k)%b.length])];
   if(merged.every((p,k)=>cross(p,merged[(k+1)%merged.length],merged[(k+2)%merged.length])>=-1e-8)){
    triangles[i]=merged;triangles.splice(j,1);changed=true;break outer;
   }
  }
 }}
 return triangles;
}
export const PROP_FRAMES=new Map(PROPS_LAYOUT.frames.map(frame=>{
 const b=frame.visible_bounds_local,outline=(frame.collision_outline_normalized||frame.collision_points_normalized).map(p=>({x:b.x+p.x*b.w,y:b.y+p.y*b.h}));
 return [frame.id,{...frame,parts:convexParts(outline)}];
}));
export function propFrame(o){return PROP_FRAMES.get(o.spriteId)}
export function createProp(spriteId,values={}){
 const f=PROP_FRAMES.get(spriteId);if(!f)throw Error('Unknown prop: '+spriteId);
 const scaleX=f.render_width_world/f.visible_bounds_local.w,scaleY=f.render_height_world===undefined?scaleX:f.render_height_world/f.visible_bounds_local.h;
 return {...values,spriteId,w:f.visible_bounds_local.w*scaleX,h:f.visible_bounds_local.h*scaleY};
}
export function propTransform(o,floor=415){
 const frame=propFrame(o),c=Math.cos(o.angle||0),s=Math.sin(o.angle||0);
 if(!frame)return {x:o.x+o.w/2,y:floor-o.lift-o.h/2,c,s};
 const scaleX=frame.render_width_world/frame.visible_bounds_local.w,scaleY=frame.render_height_world===undefined?scaleX:frame.render_height_world/frame.visible_bounds_local.h;
 return {frame,scale:scaleX,scaleX,scaleY,c,s,x:o.x+(frame.pivot_local.x-frame.visible_bounds_local.x)*scaleX,y:floor-o.lift-(frame.ground_anchor_local.y-frame.pivot_local.y)*scaleY};
}
export function transformPropPoint(o,point,floor=415){
 const t=propTransform(o,floor),x=(point.x-t.frame.pivot_local.x)*t.scaleX,y=(point.y-t.frame.pivot_local.y)*t.scaleY;
 return {x:t.x+x*t.c-y*t.s,y:t.y+x*t.s+y*t.c};
}
