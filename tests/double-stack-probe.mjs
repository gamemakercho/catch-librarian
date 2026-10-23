import {Chase,WORLD} from '../engine.js';
import {CONFIG} from '../config.js';
import {createProp} from '../props.js';
import {obstaclePolygons} from '../collision.js';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
const DT=1/240,LEAD=.8;
export const STACK_SPEEDS=[410,424,438,450,466,480,494];
// Even the sum of both upward launch speeds bounds the displacement between samples.
// Checking the full-height roof over an expanded horizontal span is conservative:
// concave side recesses can only give the cat more clearance than this measure.
const TEMPORAL_MARGIN=(CONFIG.jumpForce+CONFIG.doubleJumpForce)*DT+CONFIG.gravity*DT*DT;
export function attemptDoubleStack(speed,firstTap,secondDelay=null){
 const g=new Chase({...CONFIG,runSpeed:speed,speedIncrease:0});g.start();g.spawnAt=1000;
 const obstacle=createProp('double-stack',{id:0,kind:'double-stack',x:WORLD.catX+CONFIG.catCollider.x+CONFIG.catCollider.w+speed*LEAD,lift:0});
 g.obstacles=[obstacle];let first=false,second=false,minimum=Infinity;
 for(let t=0;t<1.7;t+=DT){
  if(!first&&t+1e-9>=firstTap){g.jump();first=true}
  if(first&&!second&&secondDelay!==null&&t+1e-9>=firstTap+secondDelay){g.jump();second=true}
  // Chase.update uses the actual continuous SAT sweep and physical separation.
  g.update(DT);if(g.hits)return {pass:false,clearance:null};
  const points=obstaclePolygons(obstacle).flat(),left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x));
  const body=g.catPolygon(),catLeft=Math.min(...body.map(p=>p.x)),catRight=Math.max(...body.map(p=>p.x));
  if(right>=catLeft-speed*DT&&left<=catRight+speed*DT){
   const roof=Math.min(...points.map(p=>p.y)),bottom=Math.max(...body.map(p=>p.y));
   minimum=Math.min(minimum,roof-bottom);
  }
 }
 return {pass:true,clearance:minimum-TEMPORAL_MARGIN,sampledClearance:minimum};
}
export function sweepDoubleStack(speeds=STACK_SPEEDS){
 const results=[];
 for(const speed of speeds){
  let singlePasses=0;for(let n=0;n<=120;n++)if(attemptDoubleStack(speed,n/100).pass)singlePasses++;
  const valid=[];let attempted=0;
  for(let first=150;first<=400;first+=25)for(let delay=200;delay<=550;delay+=25){
   attempted++;const r=attemptDoubleStack(speed,first/1000,delay/1000);
   if(r.pass&&r.clearance>=3)valid.push({first_tap_ms:first,second_delay_ms:delay,minimum_clearance_px:+r.clearance.toFixed(3)});
  }
  results.push({speed,single_attempts:121,single_passes:singlePasses,double_attempts:attempted,double_safe_pairs:valid.length,minimum_safe_clearance_px:Math.min(...valid.map(v=>v.minimum_clearance_px)),valid_double_pairs:valid});
 }
 const prop=createProp('double-stack'),fingerprints={};
 for(const path of ['engine.js','config.js','props.js','collision.js','assets/props/props-layout.json'])fingerprints[path]=createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex');
 return {verification:'Actual Chase.update + collision.js continuous SAT sweep; not an analytic-only trajectory probe.',dt_seconds:DT,visible_size:{w:prop.w,h:prop.h},lead_seconds:LEAD,single_timing_scan_ms:{from:0,to:1200,step:10},double_timing_scan_ms:{first_from:150,first_to:400,first_step:25,second_delay_from:200,second_delay_to:550,second_delay_step:25},clearance_method:'Full-height silhouette roof over the cat collider width, including one simulation step of horizontal preview, minus a conservative temporal displacement bound. All accepted cases also have zero actual SAT contacts.',temporal_margin_px:TEMPORAL_MARGIN,source_sha256:fingerprints,results};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const report=sweepDoubleStack(),output=process.argv[2]||fileURLToPath(new URL('./double-stack-results.json',import.meta.url));
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({output,results:report.results.map(({valid_double_pairs,...rest})=>rest)}));
 if(report.results.some(r=>r.single_passes||r.double_safe_pairs<10))process.exitCode=1;
}
