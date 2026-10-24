import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROP_FRAMES,createProp,propTransform,transformPropPoint} from '../props.js';
import {Chase,WORLD} from '../engine.js';
import {CONFIG} from '../config.js';
import {obstaclePolygons,penetration,boxPolygon} from '../collision.js';
import {Renderer,backgroundTiles} from '../renderer.js';
import {PROPS_LAYOUT,BACKGROUND_LAYOUT,SPRITE_LAYOUT,SCENE_IMAGE_FILES} from '../scene-data.js';
const signedArea=p=>p.reduce((a,v,i)=>a+v.x*p[(i+1)%p.length].y-p[(i+1)%p.length].x*v.y,0)/2;
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const fixture=()=>{const g=new Chase();g.start();g.spawnAt=1000;return g};
function assertSeparated(g){for(const o of g.obstacles)for(const poly of obstaclePolygons(o))assert.ok((penetration(g.catPolygon(),poly)?.depth||0)<.002);assert.ok(Number.isFinite(g.x)&&Number.isFinite(g.y))}
test('all seven measured prop outlines decompose into finite convex parts with conserved area',()=>{
 for(const f of PROP_FRAMES.values()){
  const b=f.visible_bounds_local,outline=f.collision_outline_normalized.map(p=>({x:b.x+p.x*b.w,y:b.y+p.y*b.h}));
  assert.ok(Math.abs(f.parts.reduce((a,p)=>a+Math.abs(signedArea(p)),0)-Math.abs(signedArea(outline)))<.001,f.id);
  for(const p of f.parts){assert.ok(p.length>=3);for(let i=0;i<p.length;i++){assert.ok(Math.hypot(p[i].x-p[(i+1)%p.length].x,p[i].y-p[(i+1)%p.length].y)>1e-5);assert.ok(cross(p[i],p[(i+1)%p.length],p[(i+2)%p.length])>=-1e-7)}}
 }
});
test('six natural prop ratios and the requested slimmer double-stack size share exact render/collision pivots at every rotation',()=>{
 const calls=[],c=new Proxy({drawImage:(...a)=>calls.push(a)}, {get:(t,k)=>t[k]||(()=>{})}),images=Object.fromEntries(SCENE_IMAGE_FILES.map(url=>[url,{id:url}]));
 const renderer=new Renderer({getContext:()=>c,getBoundingClientRect:()=>({width:960})},images,SPRITE_LAYOUT);
 for(const f of PROP_FRAMES.values())for(const angle of [0,.6,Math.PI]){
  const o=createProp(f.id,{x:300,lift:0,angle}),t=propTransform(o),scaleX=f.render_width_world/f.visible_bounds_local.w,scaleY=f.render_height_world===undefined?scaleX:f.render_height_world/f.visible_bounds_local.h;
  if(f.id!=='double-stack'){assert.ok(Math.abs(o.h/o.w-f.visible_bounds_local.h/f.visible_bounds_local.w)<1e-9);assert.equal(scaleX,scaleY)}else{assert.equal(o.w,78);assert.equal(o.h,124);assert.notEqual(scaleX,scaleY)}
  const anchor=transformPropPoint(o,f.ground_anchor_local);if(!angle)assert.ok(Math.abs(anchor.y-WORLD.floor)<1e-9);
  const pivot=transformPropPoint(o,f.pivot_local);assert.equal(pivot.x,t.x);assert.equal(pivot.y,t.y);
  const sourceArea=f.parts.reduce((sum,p)=>sum+Math.abs(signedArea(p)),0),worldArea=obstaclePolygons(o).reduce((sum,p)=>sum+Math.abs(signedArea(p)),0);assert.ok(Math.abs(worldArea-sourceArea*scaleX*scaleY)<1e-6,f.id+' collider must rotate the same two render scales');
  renderer.obstacle(o);const a=calls.at(-1);assert.equal(a[0],images[f.image||PROPS_LAYOUT.image]);assert.deepEqual(a.slice(1,5),Object.values(f.source_rect));assert.equal(a[5],-f.pivot_local.x*scaleX);assert.equal(a[6],-f.pivot_local.y*scaleY);assert.ok(Math.abs(a[7]/f.source_rect.w-scaleX)<1e-12);assert.ok(Math.abs(a[8]/f.source_rect.h-scaleY)<1e-12);
 }
 const closed=createProp('book-red'),open=createProp('book-green');assert.ok(closed.h>closed.w);assert.ok(open.w>open.h);
});
test('open and fluttering page notches are air while visible pages remain solid',()=>{
 for(const [id,air,paper]of [['book-green',{x:240,y:60},{x:100,y:100}],['book-blue',{x:280,y:70},{x:150,y:160}]]){
  const o=createProp(id,{x:200,lift:40,angle:.35}),probe=p=>{const q=transformPropPoint(o,p);return boxPolygon(q.x-.1,q.y-.1,.2,.2)};
  assert.equal(obstaclePolygons(o).some(p=>penetration(probe(air),p)),false,id+' notch');
  assert.equal(obstaclePolygons(o).some(p=>penetration(probe(paper),p)),true,id+' page');
 }
});
for(const f of PROPS_LAYOUT.frames)test(f.id+' actual outline separates at contact and at 5000px/s without tunneling',()=>{
 for(const fast of [false,true]){
  const g=fixture();g.obstacles=[createProp(f.id,{id:0,kind:'low',x:fast?500:278,lift:12,targetLift:12,launchLift:12,age:2,angle:.3,reacting:fast,vx:fast?-5000:0,vy:0,angularVelocity:fast?8:0})];
  for(let n=0;n<100&&g.hits===0;n++)g.update(fast?.1:1/120);
  assert.equal(g.hits,1,f.id);assert.equal(g.health,2);assertSeparated(g);assert.ok(g.obstacles[0].damageConsumed);assert.ok(g.obstacles[0].vx>0);
  for(let n=0;n<120;n++){g.update(1/120);assertSeparated(g)}assert.equal(g.health,2);
 }
});
test('all book shapes and launch curves clear a grounded cat high and contact low at every chase speed',()=>{
 for(const id of ['book-red','book-green','book-blue'])for(const kind of ['high','low'])for(const trajectory of [0,1,2])for(const speed of [CONFIG.runSpeed,CONFIG.runSpeed+CONFIG.speedIncrease/2,CONFIG.runSpeed+CONFIG.speedIncrease]){
  const g=new Chase({...CONFIG,runSpeed:speed,speedIncrease:0});g.start();g.spawnAt=1000;
  const o=createProp(id,{id:0,kind,trajectory,x:0,lift:0,angle:-.18+trajectory*.12,angularVelocity:[1.4,-1.7,2.1][trajectory],vy:(kind==='high'?CONFIG.bookThrowHigh:CONFIG.bookThrowLow)[trajectory]});
  o.x=WORLD.librarianX-CONFIG.librarianHeight*.28-o.w/2;o.lift=CONFIG.librarianHeight*.56-o.h/2;g.obstacles=[o];
  for(let n=0;n<240;n++){g.update(1/120);assertSeparated(g)}assert.equal(g.hits,kind==='high'?0:1,[id,kind,trajectory,speed].join('/'));
 }
});

test('ground props rest on the floor after rotating with the same collision geometry',()=>{
 for(const id of ['box','book-stack','basket','double-stack']){
  const g=fixture();g.obstacles=[createProp(id,{id:0,kind:'basket',x:600,lift:0,reacting:true,vx:0,vy:0,angularVelocity:2})];
  const o=g.obstacles[0];for(let n=0;n<96;n++){g.update(1/120);assert.ok(Math.max(...obstaclePolygons(o).flat().map(p=>p.y))<=WORLD.floor+.001)}
  for(let n=0;n<24;n++)g.update(1/120);assert.ok(!g.obstacles.includes(o),'floor contact does not postpone cleanup');
 }
});
test('book form choice is independent of high/low routes and all three launch curves',()=>{
 const g=fixture(),combinations=new Set(),forms=new Set();
 for(let n=0;n<108;n++){const kind=n%2?'high':'low';assert.equal(g.spawn(kind),true);g.updateThrow(.5);const o=g.obstacles.pop();assert.ok(o);assert.equal(o.kind,kind);forms.add(o.spriteId);combinations.add([o.spriteId,o.kind,o.trajectory].join('/'))}
 for(const kind of ['stack','box','basket','double-stack']){assert.equal(g.spawn(kind),true);const o=g.obstacles.pop();assert.ok(o);forms.add(o.spriteId)}
 assert.equal(forms.size,7);assert.equal(combinations.size,18);
});

test('wall and floor use separate uniform scales and continuous global mirror parity',()=>{
 for(const section of [BACKGROUND_LAYOUT.wall,BACKGROUND_LAYOUT.floor]){
  const w=section.source_rect.w*section.destination_height/section.source_rect.h;
  for(const d of [0,900,1000,5000,50000]){const tiles=backgroundTiles(d,section);assert.ok(tiles[0].x<=0);assert.ok(tiles.at(-1).x+w>=960);for(let i=0;i<tiles.length;i++){const t=tiles[i];assert.equal(t.width,w);assert.equal(t.flipped,Math.abs(t.index%2)===1);if(i)assert.ok(Math.abs(t.x-tiles[i-1].x-w)<1e-8)}}
  const d=w/section.distance_factor;assert.equal(backgroundTiles(d-.001,section)[1].index,backgroundTiles(d+.001,section)[0].index);assert.equal(backgroundTiles(d-.001,section)[1].flipped,backgroundTiles(d+.001,section)[0].flipped);
 }
 assert.equal(BACKGROUND_LAYOUT.wall.distance_factor,.22);assert.equal(BACKGROUND_LAYOUT.floor.distance_factor,1);assert.equal(BACKGROUND_LAYOUT.floor.destination_y,WORLD.floor);
});
test('optimized images remain below 4MB total and 2.6MB initial scene, with exact sprite alpha',()=>{
 const m=JSON.parse(readFileSync(new URL('../asset-verification.json',import.meta.url),'utf8'));assert.ok(m.after_image_bytes<4_000_000);assert.ok(m.initial_image_bytes<2_600_000);for(const f of m.verified.filter(f=>f.alpha)){assert.equal(f.encoding,'lossless');assert.equal(f.alpha_exact,true);assert.equal(f.visible_rgb_exact,true)}
});

test('deflected props clear before the next launch reaches them, without stacking artwork',()=>{
 const g=new Chase();g.start();g.health=100;for(let n=0;n<4000&&g.state==='playing';n++){g.update(1/120);for(let i=0;i<g.obstacles.length;i++)for(let j=i+1;j<g.obstacles.length;j++)for(const a of obstaclePolygons(g.obstacles[i]))for(const b of obstaclePolygons(g.obstacles[j]))assert.ok((penetration(a,b)?.depth||0)<.002,'prop overlap at '+g.elapsed)}
 assert.equal(g.state,'ending-discovery');assert.ok(g.serial>=6);
});


test('slimmer double stack cached alpha outline preserves independent width/height and the same source pixels',()=>{
 const masks=[],draws=[],context=new Proxy({drawImage:(...a)=>draws.push(a)},{get:(t,k)=>t[k]||(()=>{})}),ownerDocument={createElement:()=>({getContext:()=>new Proxy({drawImage:(...a)=>masks.push(a)},{get:(t,k)=>t[k]||(()=>{})})})},images=Object.fromEntries(SCENE_IMAGE_FILES.map(url=>[url,{id:url}]));
 const renderer=new Renderer({ownerDocument,getContext:()=>context,getBoundingClientRect:()=>({width:960})},images,SPRITE_LAYOUT),o=createProp('double-stack',{x:300,lift:0,angle:.6}),f=PROP_FRAMES.get('double-stack');
 renderer.obstacle(o);const alphaSource=masks.find(a=>a[0]===images[f.image]);assert.deepEqual(alphaSource.slice(1,5),Object.values(f.source_rect));assert.ok(Math.abs(alphaSource[7]-f.source_rect.w*78/220)<1e-9);assert.ok(Math.abs(alphaSource[8]-f.source_rect.h*124/285)<1e-9);assert.equal(renderer.outlineCache.size,1);
 const count=masks.length;renderer.obstacle({...o,angle:1.2});assert.equal(masks.length,count,'rotating the same silhouette reuses its cached outline');assert.equal(renderer.outlineCache.size,1);assert.ok(draws.length>=2);
});
