import {propFrame,transformPropPoint} from './props.js?v=20261024-balance6';
// Convex SAT, plus continuous translation TOI. Screen coordinates: y down.
const COLLISION_EPS=1e-8;
export function boxPolygon(x,y,w,h){return [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]}
export function obstaclePolygons(o,floorY=415){
 const f=propFrame(o);return f?f.parts.map(part=>part.map(p=>transformPropPoint(o,p,floorY))):[obstaclePolygon(o,floorY)];
}
export function obstaclePolygon(o,floorY=415){
 const cx=o.x+o.w/2,cy=floorY-o.lift-o.h/2,c=Math.cos(o.angle||0),s=Math.sin(o.angle||0);
 return [[-o.w/2,-o.h/2],[o.w/2,-o.h/2],[o.w/2,o.h/2],[-o.w/2,o.h/2]].map(([x,y])=>({x:cx+x*c-y*s,y:cy+x*s+y*c}));
}
function polygonAxes(a,b){return [a,b].flatMap(p=>p.map((v,i)=>{const q=p[(i+1)%p.length],dx=q.x-v.x,dy=q.y-v.y,length=Math.hypot(dx,dy);return {x:-dy/length,y:dx/length}}))}
function projection(poly,n){const values=poly.map(p=>p.x*n.x+p.y*n.y);return {min:Math.min(...values),max:Math.max(...values)}}
export function penetration(a,b){
 let depth=Infinity,normal=null;
 for(const axis of polygonAxes(a,b)){
  const pa=projection(a,axis),pb=projection(b,axis);
  if(pa.max<=pb.min+COLLISION_EPS||pb.max<=pa.min+COLLISION_EPS)return null;
  const left=pa.max-pb.min,right=pb.max-pa.min;
  if(Math.min(left,right)<depth){depth=Math.min(left,right);const sign=left<right?-1:1;normal={x:axis.x*sign,y:axis.y*sign}}
 }
 return {depth,normal};
}
export function sweepPolygons(a,b,deltaA,deltaB){
 if(penetration(a,b))return null;
 const relative={x:deltaA.x-deltaB.x,y:deltaA.y-deltaB.y};let enter=-Infinity,exit=Infinity,normal=null;
 for(const axis of polygonAxes(a,b)){
  const pa=projection(a,axis),pb=projection(b,axis),v=relative.x*axis.x+relative.y*axis.y;
  if(Math.abs(v)<COLLISION_EPS){if(pa.max<pb.min||pb.max<pa.min)return null;continue}
  const t1=(pb.min-pa.max)/v,t2=(pb.max-pa.min)/v,first=Math.min(t1,t2),last=Math.max(t1,t2);
  if(first>enter){enter=first;const sign=v>0?-1:1;normal={x:axis.x*sign,y:axis.y*sign}}
  exit=Math.min(exit,last);if(enter>exit)return null;
 }
 if(!normal||enter< -COLLISION_EPS||enter>1||exit<0)return null;
 return {time:Math.max(0,enter),normal};
}
