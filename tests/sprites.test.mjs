import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../renderer.js';
import {CONFIG} from '../config.js';
import {SPRITE_LAYOUT,MOTION_LAYOUT,SCENE_IMAGE_FILES} from '../scene-data.js';
import {sampleMotion,librarianPose,heldBookPose,endingRootPose,motionEventCrossed,motionEventTime} from '../librarian-motion.js';
import {createProp,transformPropPoint} from '../props.js';
const images=Object.fromEntries(SCENE_IMAGE_FILES.map(path=>[path,{id:path}]));
function fixture(){const calls=[],clips=[],c=new Proxy({drawImage:(...args)=>calls.push(args),rect:(...a)=>clips.push(a)}, {get:(t,k)=>t[k]||(()=>{})});const canvas={getContext:()=>c,getBoundingClientRect:()=>({width:320})};return {renderer:new Renderer(canvas,images,SPRITE_LAYOUT),canvas,calls,clips}}
const g={state:'playing',elapsed:5.2,x:240,y:0},hold=CONFIG.discoverySeconds;
test('cat sheets retain measured foot anchors, one fixed scale and URL image mapping',()=>{
 const {renderer:r,canvas,calls}=fixture();assert.equal(r.scales.cat,58/261);assert.equal(r.scales.librarian,180/270);assert.equal(canvas.width,320);assert.equal(canvas.height,167);
 for(const [index,sheet]of SPRITE_LAYOUT.sheets.entries()){assert.equal(sheet.scale_group,'cat');r.sprite(sheet.id,240,415,0,index+2);const f=sheet.frames[index+2],a=calls.at(-1),s=r.scales.cat;assert.deepEqual(a.slice(1,5),Object.values(f.source_rect));assert.equal(a[0],images[sheet.image]);assert.equal(a[5],240-f.anchor_local.x*s);assert.equal(a[6],415-f.anchor_local.y*s);assert.equal(a[7],f.source_rect.w*s);assert.equal(a[8],f.source_rect.h*s)}assert.equal(r.debug,false);
});
test('run, throw and horizontal stumble share one pelvis registration and scale',()=>{
 for(const clip of Object.values(MOTION_LAYOUT.clips)){assert.equal(clip.scale_group,'librarian-v3');assert.equal(clip.reference_height_px,270);assert.equal(clip.frames.reduce((s,f)=>s+f.duration_ms,0),clip.duration_ms);for(const f of clip.frames)assert.deepEqual(f.root_anchor,{x:144,y:212})}
 const {renderer:r,calls}=fixture();for(const [state,endingAge]of [['playing',0],['ending-discovery',1],['ending-trip',hold+.3],['ending-fly',hold+.9]]){const p=r.librarian({...g,state,endingAge},5.2),a=calls.at(-1);assert.ok(Math.abs(a[7]-320*2/3)<1e-9);assert.ok(Math.abs(a[8]-320*2/3)<1e-9);assert.equal(p.scale,2/3)}
});
test('668ms run and crossed motion events keep real time at 30, 60 and 120fps',()=>{
 for(const fps of [30,60,120]){for(const target of [.084,.168,.334,.501,.668,1.336]){let age=0;while(age+1/fps<target)age+=1/fps;age+=target-age;assert.equal(sampleMotion('run',age).frameIndex,sampleMotion('run',target).frameIndex)}let age=0,count=0;while(age<.6){const next=age+1/fps;if(motionEventCrossed('throw','release-book',age,next))count++;age=next}assert.equal(count,1)}
 assert.equal(sampleMotion('run',.668).frameIndex,0);assert.equal(sampleMotion('run',.334).frameIndex,4);assert.equal(motionEventTime('throw','release-book'),.23);assert.equal(motionEventTime('stumble','toe-off'),.64);assert.ok(motionEventCrossed('throw','release-book',.15,.39));assert.equal(motionEventCrossed('throw','release-book',.23,.39),false);assert.equal(sampleMotion('throw',20).frameIndex,5);
});
test('run supports meet the floor while unsupported strides interpolate a small pelvis arc',()=>{
 let min=Infinity,max=-Infinity;for(let n=0;n<668;n++){const p=librarianPose({...g,elapsed:n/1000}),f=p.frame;min=Math.min(min,p.root.y);max=Math.max(max,p.root.y);if(f.support_anchor)assert.ok(Math.abs(p.root.y+(f.support_anchor.y-f.root_anchor.y)*p.scale-415)<1e-9)}assert.ok(max-min<3);
});
test('throw composites only upper body and retains ongoing run legs through recovery',()=>{
 const {renderer:r,calls,clips}=fixture(),legs=new Set();for(const age of [.01,.1,.2,.3,.4,.49]){const p=r.librarian({...g,elapsed:5.2+age,throwAction:{age,form:'book-red',trajectory:0,released:age>=.23}},5.2+age);legs.add(p.runFrameIndex);assert.equal(p.runFrameIndex,sampleMotion('run',5.2+age).frameIndex);assert.ok(p.throwing)}assert.ok(legs.size>=5);assert.ok(clips.some(a=>a[3]===108*2/3));assert.ok(calls.length>=12);assert.equal(librarianPose({...g,elapsed:5.71}).frameIndex,sampleMotion('run',5.71).frameIndex);
});
test('all natural book shapes use exact noncentral palm contact before and at release',()=>{
 for(const form of ['book-red','book-green','book-blue'])for(const trajectory of [0,1,2])for(const age of [.01,.1,.2,.23]){const held=heldBookPose(g,{form,trajectory,age}),o=createProp(form,held),point=transformPropPoint(o,held.contactLocal);assert.ok(Math.hypot(point.x-held.hand.x,point.y-held.hand.y)<1e-9);assert.equal(o.w,createProp(form).w);assert.equal(o.h,createProp(form).h)}
});
test('stumble locks the annotated toe, releases continuously and exits fully right',()=>{
 const toe={x:814,y:415};for(const age of [0,.1,.22,.36,.5,.639999]){const p=librarianPose({...g,state:'ending-trip',endingAge:hold+age,endingToe:toe}),f=p.frame;assert.ok(f.toe_locked);assert.ok(Math.abs(p.root.x+(f.support_anchor.x-f.root_anchor.x)*p.scale-toe.x)<1e-9);assert.ok(Math.abs(p.root.y+(f.support_anchor.y-f.root_anchor.y)*p.scale-toe.y)<1e-9)}const before=endingRootPose({endingToe:toe},hold+.64-1e-9),off=endingRootPose({endingToe:toe},hold+.64),air=endingRootPose({endingToe:toe},hold+.84),exit=endingRootPose({endingToe:toe},hold+1.04);assert.ok(Math.hypot(before.x-off.x,before.y-off.y)<1e-8);assert.ok(air.x>off.x&&air.y<off.y);assert.ok(exit.x>960+320/3);assert.equal(librarianPose({...g,state:'ending-fly',endingAge:hold+1.04}).frameIndex,7);
});
test('paused ending holds the same clip and root',()=>{
 const ending={...g,state:'ending-fly',endingStarted:true,endingAge:hold+.82,endingToe:{x:814,y:415}},p=librarianPose(ending),paused=librarianPose({...ending,state:'paused'});assert.equal(paused.frameIndex,p.frameIndex);assert.deepEqual(paused.root,p.root);assert.equal(paused.ending,true);
});

test('three-second discovery holds the run frame and pelvis before the full stumble starts',()=>{
 assert.equal(hold,3);const before=librarianPose({...g,elapsed:30}),root=before.root;
 for(const age of [0,.3,1.5,hold-1e-6]){const game={...g,elapsed:30,state:'ending-discovery',endingStarted:true,endingAge:age},p=librarianPose(game,30+age);assert.equal(p.name,'run');assert.equal(p.frameIndex,before.frameIndex);assert.equal(p.discovering,true);assert.deepEqual(p.root,root);assert.deepEqual(endingRootPose(game),root);const paused=librarianPose({...game,state:'paused'},99);assert.equal(paused.name,'run');assert.equal(paused.frameIndex,p.frameIndex);assert.deepEqual(paused.root,p.root)}
 const trip=librarianPose({...g,elapsed:30,state:'ending-trip',endingStarted:true,endingAge:hold});assert.equal(trip.name,'stumble');assert.equal(trip.frameIndex,0);assert.equal(trip.discovering,false);
});
