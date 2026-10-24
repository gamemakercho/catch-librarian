import {Chase,WORLD} from '../engine.js';
import {CONFIG} from '../config.js';
import {createProp} from '../props.js';
import {obstaclePolygons} from '../collision.js';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
const DT=1/240,LEAD=.8;
export const STACK_SPEEDS=[410,424,438,450,466,480,494];
export const STACK_GRID=Object.freeze({first_from:100,first_to:500,first_step:25,second_delay_from:150,second_delay_to:650,second_delay_step:25});
// Historical actual-engine sweep before the user's slimmer-stack request, using
// the 150..400ms / 200..550ms grid at25ms. The old report verified436 safe pairs.
export const PREVIOUS_STACK_SWEEP=Object.freeze({visible_size:{w:104.98245614035088,h:136},grid:{first_from:150,first_to:400,first_step:25,second_delay_from:200,second_delay_to:550,second_delay_step:25},safe_pairs_total:436,per_speed:[{speed:410,safe_pairs:50},{speed:424,safe_pairs:57},{speed:438,safe_pairs:58},{speed:450,safe_pairs:63},{speed:466,safe_pairs:65},{speed:480,safe_pairs:69},{speed:494,safe_pairs:74}]});
// Full silhouette roof + one-step horizontal preview, minus the conservative
// maximum vertical displacement bound. Every accepted case also has zero SAT hits.
const TEMPORAL_MARGIN=(CONFIG.jumpForce+CONFIG.doubleJumpForce)*DT+CONFIG.gravity*DT*DT;
export function attemptDoubleStack(speed,firstTap,secondDelay=null){
 const g=new Chase({...CONFIG,runSpeed:speed,speedIncrease:0});g.start();g.spawnAt=1000;
 const obstacle=createProp('double-stack',{id:0,kind:'double-stack',x:WORLD.catX+CONFIG.catCollider.x+CONFIG.catCollider.w+speed*LEAD,lift:0});
 g.obstacles=[obstacle];let first=false,second=false,minimum=Infinity;
 for(let t=0;t<1.7;t+=DT){
  if(!first&&t+1e-9>=firstTap){g.jump();first=true}
  if(first&&!second&&secondDelay!==null&&t+1e-9>=firstTap+secondDelay){g.jump();second=true}
  g.update(DT);if(g.hits)return {pass:false,clearance:null};
  const points=obstaclePolygons(obstacle).flat(),left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x));
  const body=g.catPolygon(),catLeft=Math.min(...body.map(p=>p.x)),catRight=Math.max(...body.map(p=>p.x));
  if(right>=catLeft-speed*DT&&left<=catRight+speed*DT){
   const roof=Math.min(...points.map(p=>p.y)),bottom=Math.max(...body.map(p=>p.y));minimum=Math.min(minimum,roof-bottom);
  }
 }
 return {pass:Number.isFinite(minimum),clearance:minimum-TEMPORAL_MARGIN,sampledClearance:minimum};
}
export function sweepDoubleStack(speeds=STACK_SPEEDS){
 const results=[],grid=STACK_GRID,old=PREVIOUS_STACK_SWEEP.grid;
 for(const speed of speeds){
  let singlePasses=0;for(let n=0;n<=120;n++)if(attemptDoubleStack(speed,n/100).pass)singlePasses++;
  const valid=[];let attempted=0;
  for(let first=grid.first_from;first<=grid.first_to;first+=grid.first_step)for(let delay=grid.second_delay_from;delay<=grid.second_delay_to;delay+=grid.second_delay_step){
   attempted++;const result=attemptDoubleStack(speed,first/1000,delay/1000);
   if(result.pass&&result.clearance>=3)valid.push({first_tap_ms:first,second_delay_ms:delay,minimum_clearance_px:+result.clearance.toFixed(3)});
  }
  const legacy=valid.filter(p=>p.first_tap_ms>=old.first_from&&p.first_tap_ms<=old.first_to&&p.second_delay_ms>=old.second_delay_from&&p.second_delay_ms<=old.second_delay_to);
  results.push({speed,single_attempts:121,single_passes:singlePasses,double_attempts:attempted,double_safe_pairs:valid.length,legacy_grid_safe_pairs:legacy.length,minimum_safe_clearance_px:Math.min(...valid.map(v=>v.minimum_clearance_px)),valid_double_pairs:valid});
  if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)console.error(JSON.stringify({speed,single_passes:singlePasses,double_safe_pairs:valid.length,legacy_grid_safe_pairs:legacy.length}));
 }
 const prop=createProp('double-stack'),fingerprints={};
 for(const path of ['engine.js','config.js','props.js','collision.js','scene-data.js','assets/props/props-layout.json','assets/props/book-stack-double.json'])fingerprints[path]=createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex');
 const previousSafe=PREVIOUS_STACK_SWEEP.safe_pairs_total,currentSafe=results.reduce((sum,row)=>sum+row.legacy_grid_safe_pairs,0);
 return {verification:'Actual Chase.update + collision.js continuous SAT sweep; not an analytic-only trajectory probe.',dt_seconds:DT,visible_size:{w:prop.w,h:prop.h},lead_seconds:LEAD,single_timing_scan_ms:{from:0,to:1200,step:10},double_timing_scan_ms:grid,clearance_method:'Full-height silhouette roof over the cat collider width, including one simulation step of horizontal preview, minus a conservative temporal displacement bound. All accepted cases also have zero actual SAT contacts.',temporal_margin_px:TEMPORAL_MARGIN,comparison:{previous_verified_sweep:PREVIOUS_STACK_SWEEP,width_reduction_percent:+((1-prop.w/PREVIOUS_STACK_SWEEP.visible_size.w)*100).toFixed(3),height_reduction_percent:+((1-prop.h/PREVIOUS_STACK_SWEEP.visible_size.h)*100).toFixed(3),same_legacy_grid_current_safe_pairs:currentSafe,same_legacy_grid_improvement_percent:+((currentSafe/previousSafe-1)*100).toFixed(3)},source_sha256:fingerprints,results};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const report=sweepDoubleStack(),output=process.argv[2]||fileURLToPath(new URL('./double-stack-results.json',import.meta.url));
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({output,comparison:report.comparison,results:report.results.map(({valid_double_pairs,...rest})=>rest)}));
 if(report.results.some(r=>r.single_passes||r.double_safe_pairs<10||r.minimum_safe_clearance_px<3)||report.comparison.same_legacy_grid_current_safe_pairs<PREVIOUS_STACK_SWEEP.safe_pairs_total*1.25)process.exitCode=1;
}
