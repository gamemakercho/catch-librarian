import {CONFIG} from './config.js?v=20261025-fullscreen7';
import {MOTION_LAYOUT} from './scene-data.js?v=20261025-fullscreen7';
import {createProp,propFrame} from './props.js?v=20261025-fullscreen7';
const STAGE={width:960,floor:415,librarianX:780};
export const LIBRARIAN_SCALE=CONFIG.librarianHeight/MOTION_LAYOUT.clips.run.reference_height_px;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/** Duration based sampling is independent of render frame rate. */
export function sampleMotion(name,ageSeconds,loop=MOTION_LAYOUT.clips[name].loop){
 const clip=MOTION_LAYOUT.clips[name],duration=clip.duration_ms,age=Math.max(0,ageSeconds*1000);
 const time=loop?((age%duration)+duration)%duration:Math.min(age,duration-1e-7);
 let begin=0,index=0;for(;index<clip.frames.length-1;index++){const end=begin+clip.frames[index].duration_ms;if(time<end-1e-7)break;begin=end}
 return {clip,name,frame:clip.frames[index],frameIndex:index,timeMs:time,frameTimeMs:time-begin,finished:!loop&&age>=duration};
}
export function motionEventTime(name,event){let ms=0;for(const frame of MOTION_LAYOUT.clips[name].frames){if(frame.event===event)return ms/1000;ms+=frame.duration_ms}return null}
export function motionEventCrossed(name,event,oldAge,newAge){const at=motionEventTime(name,event);return at!==null&&oldAge<at&&newAge>=at}
function runRootY(sample){
 const frames=sample.clip.frames,i=sample.frameIndex,root=sample.frame.root_anchor;
 if(sample.frame.support_anchor)return STAGE.floor-(sample.frame.support_anchor.y-root.y)*LIBRARIAN_SCALE;
 let before=(i-1+frames.length)%frames.length,after=(i+1)%frames.length;
 while(!frames[before].support_anchor)before=(before-1+frames.length)%frames.length;
 while(!frames[after].support_anchor)after=(after+1)%frames.length;
 let elapsed=sample.frameTimeMs,span=0;
 for(let j=(before+1)%frames.length;j!==i;j=(j+1)%frames.length)elapsed+=frames[j].duration_ms;
 for(let j=(before+1)%frames.length;j!==after;j=(j+1)%frames.length)span+=frames[j].duration_ms;
 const u=clamp(elapsed/Math.max(1,span),0,1),smooth=u*u*(3-2*u);
 const supportY=frames[before].support_anchor.y+(frames[after].support_anchor.y-frames[before].support_anchor.y)*smooth;
 return STAGE.floor-(supportY-root.y)*LIBRARIAN_SCALE-Math.sin(Math.PI*u)*1.5;
}
export function endingClipAge(game,age=game.endingAge||0){return Math.max(0,age-(game.config?.discoverySeconds??CONFIG.discoverySeconds))}
export function endingRootPose(game,age=game.endingAge||0){
 const hold=game.config?.discoverySeconds??CONFIG.discoverySeconds;
 if(age<hold-1e-9)return {x:STAGE.librarianX,y:runRootY(sampleMotion('run',game.elapsed||0))};
 const clipAge=endingClipAge(game,age),clip=MOTION_LAYOUT.clips.stumble,scale=LIBRARIAN_SCALE,toe=game.endingToe||{x:814,y:STAGE.floor},off=clip.toe_off_time_ms/1000;
 const frame=clipAge<off-1e-9?sampleMotion('stumble',clipAge,false).frame:clip.frames[clip.toe_off_frame-1],support=frame.support_anchor,root=frame.root_anchor;
 const origin={x:toe.x-(support.x-root.x)*scale,y:toe.y-(support.y-root.y)*scale};
 if(clipAge<off)return origin;
 const u=clamp((clipAge-off)/.4,0,1),exit=STAGE.width+clip.frame_canvas.w*scale/2+4;
 return {x:origin.x+(exit-origin.x)*u,y:origin.y-Math.sin(Math.PI*u)*24-10*u};
}
export function librarianPose(game,sampleTime=game.elapsed||0){
 const ending=(String(game.state).startsWith('ending-')||(game.state==='paused'&&game.endingStarted)),age=game.endingAge||0,hold=game.config?.discoverySeconds??CONFIG.discoverySeconds;
 const discovering=ending&&age<hold-1e-9,run=sampleMotion('run',ending?game.elapsed||0:sampleTime),action=game.throwAction;
 const pose=ending?(discovering?run:sampleMotion('stumble',endingClipAge(game,age),false)):action?sampleMotion('throw',action.age,false):run;
 const root=ending?(game.endingRoot||endingRootPose(game)):{x:STAGE.librarianX,y:runRootY(run)};
 return {...pose,scale:LIBRARIAN_SCALE,root,runFrame:run.frame,runFrameIndex:run.frameIndex,runSample:run,throwing:!ending&&Boolean(action),ending,discovering};
}
export function handWorld(game,action=game.throwAction){
 const pose=librarianPose({...game,throwAction:action}),hand=pose.frame.hand_anchor;
 if(!hand)return null;
 const root=pose.frame.root_anchor;
 return {x:pose.root.x+(hand.x-root.x)*pose.scale,y:pose.root.y+(hand.y-root.y)*pose.scale};
}
/** Grip points follow the book's visible right edge, rather than its image center. */
export function heldBookPose(game,action=game.throwAction){
 if(!action)return null;
 const spriteId=action.form||action.spriteId,book=createProp(spriteId),frame=propFrame(book),b=frame.visible_bounds_local,p=frame.pivot_local;
 const grip=spriteId==='book-green'?{x:.90,y:.47}:spriteId==='book-blue'?{x:.84,y:.53}:{x:.82,y:.50};
 const contactLocal={x:b.x+b.w*grip.x,y:b.y+b.h*grip.y},scale=frame.render_width_world/b.w,angle=-.18+(action.trajectory||0)*.12;
 const hand=handWorld(game,action);if(!hand)return null;
 const dx=(contactLocal.x-p.x)*scale,dy=(contactLocal.y-p.y)*scale,c=Math.cos(angle),s=Math.sin(angle);
 const pivot={x:hand.x-dx*c+dy*s,y:hand.y-dx*s-dy*c};
 return {spriteId,x:pivot.x-(p.x-b.x)*scale,lift:STAGE.floor-pivot.y-(frame.ground_anchor_local.y-p.y)*scale,angle,hand,contactLocal};
}
