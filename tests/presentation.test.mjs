import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {obstacleOpacity,discoveryPose,Renderer} from '../renderer.js';
import {SPRITE_LAYOUT} from '../scene-data.js';
import {CONFIG} from '../config.js';
test('deflected props fade continuously and become invisible within one second including hit-stop',()=>{
 const ages=[0,CONFIG.propFadeStart,.4,.65,CONFIG.propLifetime],alpha=ages.map(reactionAge=>obstacleOpacity({reacting:true,reactionAge}));
 assert.equal(alpha[0],1);assert.equal(alpha[1],1);assert.equal(alpha.at(-1),0);assert.ok(alpha[2]<1&&alpha[2]>alpha[3]);assert.ok(CONFIG.propLifetime+CONFIG.hitStop<=1);
 assert.equal(obstacleOpacity({reacting:false,reactionAge:10}),1);
});
test('discovery settles airborne cat onto the same floor and keeps the treat inside the canvas',()=>{
 const game={x:230,y:100,discoveryStartX:230,discoveryStartY:100};
 const begin=discoveryPose({...game,discoveryAge:0}),settled=discoveryPose({...game,discoveryAge:.5});
 assert.equal(begin.catX,230);assert.equal(begin.catY,100);assert.equal(settled.catY,0);assert.equal(settled.catX,262);assert.equal(settled.librarianX,790);
 const texts=[],images=[],c=new Proxy({drawImage:(...a)=>images.push(a),fillText:text=>texts.push(text),createRadialGradient:()=>({addColorStop(){}})}, {get:(t,k)=>t[k]||(()=>{})});
 const renderer=new Renderer({getContext:()=>c,getBoundingClientRect:()=>({width:960})},[{},{},{},{},{}],SPRITE_LAYOUT);
 renderer.draw({...game,obstacles:[],state:'discovery',elapsed:30,distance:1000,discoveryAge:1},0);
 assert.ok(texts.includes('츄르'));assert.ok(texts.includes('츄르?!'));assert.ok(texts.includes('!'));assert.ok(images.length>=4);
});
test('main HTML has no outer promotional intro or footer and keeps all screen/progress IDs',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.equal(/<header|<footer|class="intro"|쉿, 사서가 달아나고 있어!/.test(html),false);assert.equal((html.match(/<h1>/g)||[]).length,1);
 for(const id of ['step-run','step-comic','step-puzzle','run-screen','comic-screen','puzzle-screen','complete-screen'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('journey visually-hidden'));
});
