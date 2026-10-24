import {Chase} from '../engine.js';
import {CONFIG} from '../config.js';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
export function playBurst(speed,kind,jitter=0,{phase=12,bookSerial=1}={}){
 const g=new Chase({...CONFIG,runSpeed:speed,speedIncrease:0});g.start();g.spawnAt=1000;g.elapsed=phase;g.bookSerial=bookSerial;const expected=kind==='low'?3:4;g.spawnBurst(kind,expected);
 const planned=new Map(),jumped=new Set(),jumpTimes=[],releaseTimes=[],release=g.releaseBook.bind(g);
 g.releaseBook=(action,age)=>{release(action,age);releaseTimes.push(g.elapsed-phase)};
 for(let n=0;n<720;n++){
  if(kind==='low')for(const o of g.obstacles)if(!o.reacting&&!jumped.has(o.id)){
   // This is a visible-position response, with the same timing offset on each book.
   if(!planned.has(o.id)&&o.x<g.x+135+Math.max(0,-jitter)*speed&&o.x>g.x)planned.set(o.id,g.elapsed+Math.max(0,jitter));
   if(planned.has(o.id)&&g.elapsed>=planned.get(o.id)&&g.y===0&&g.jump()){jumped.add(o.id);jumpTimes.push(g.elapsed-phase)}
  }
  g.update(1/120);
 }
 return {speed,kind,count:expected,phase,initial_book_serial:bookSerial,input_offset_ms:Math.round(jitter*1000),hits:g.hits,health:g.health,releases:releaseTimes.map(v=>+v.toFixed(4)),jumps:jumpTimes.map(v=>+v.toFixed(4)),pass:g.hits===0&&releaseTimes.length===expected&&(kind==='high'||jumpTimes.length===3)};
}
export function burstInputReport(){
 const trials=[];for(const speed of [410,450,494]){
  for(const phase of [0,12])for(const jitter of [-.06,-.03,0,.03,.06])trials.push(playBurst(speed,'low',jitter,{phase,bookSerial:phase===12?1:0}));
  for(const phase of [0,24])trials.push(playBurst(speed,'high',0,{phase,bookSerial:4}));
 }
 return {verification:'Actual Chase.update continuous collision; normal three-heart health, no invincibility override, one grounded single jump per low book, no jump for high books.',input_reference:'Book visible left edge 135px ahead of the cat root, with -60 to +60ms timing jitter.',config:{burstLowInterval:CONFIG.burstLowInterval,burstHighInterval:CONFIG.burstHighInterval,throwDuration:CONFIG.throwDuration,throwRelease:CONFIG.throwRelease,gravity:CONFIG.gravity,jumpForce:CONFIG.jumpForce,discoverySeconds:CONFIG.discoverySeconds,endingDuration:CONFIG.endingDuration},passed:trials.filter(t=>t.pass).length,total:trials.length,trials};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){const report=burstInputReport();if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.passed!==report.total)process.exitCode=1}
