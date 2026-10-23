import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {attemptDoubleStack,STACK_SPEEDS} from './double-stack-probe.mjs';
import {Chase} from '../engine.js';
import {createProp} from '../props.js';
import {obstaclePolygons,penetration} from '../collision.js';

test('integrated double-stack sweep covers the whole 410–494 speed range and multiple safe double inputs',()=>{
 const saved=JSON.parse(readFileSync(new URL('./double-stack-results.json',import.meta.url),'utf8'));
 for(const [path,sha]of Object.entries(saved.source_sha256))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex'),sha,path+' changed: rerun node tests/double-stack-probe.mjs');
 assert.deepEqual(saved.results.map(r=>r.speed),STACK_SPEEDS);
 for(const row of saved.results){
  assert.equal(row.single_attempts,121);assert.equal(row.single_passes,0);assert.ok(row.double_safe_pairs>=10);assert.ok(row.minimum_safe_clearance_px>=3);
  // Re-run early/middle/late safe inputs against the real engine on every speed.
  const pairs=[row.valid_double_pairs[0],row.valid_double_pairs[Math.floor(row.valid_double_pairs.length/2)],row.valid_double_pairs.at(-1)];
  for(const p of pairs){const actual=attemptDoubleStack(row.speed,p.first_tap_ms/1000,p.second_delay_ms/1000);assert.equal(actual.pass,true);assert.ok(actual.clearance>=3)}
  // Re-run the full single-jump timing range rather than relying only on the saved result.
  for(let ms=0;ms<=1200;ms+=10)assert.equal(attemptDoubleStack(row.speed,ms/1000).pass,false,row.speed+'px/s single '+ms+'ms');
 }
});
test('both stacked tiers share one damage history and preserve physical separation',()=>{
 for(const lift of [0,62]){
  const g=new Chase();g.start();g.spawnAt=1000;g.y=lift;g.obstacles=[createProp('double-stack',{id:42,kind:'double-stack',x:275,lift:0})];const o=g.obstacles[0];
  for(let i=0;i<160;i++){g.update(1/120);for(const poly of obstaclePolygons(o))assert.ok((penetration(g.catPolygon(),poly)?.depth||0)<.002)}
  assert.equal(g.hits,1);assert.equal(g.health,2);assert.equal(o.id,42);assert.equal(o.damageConsumed,true);
 }
});
