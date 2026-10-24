import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {obstacleOpacity,endingCatPose,Renderer} from '../renderer.js';
import {SPRITE_LAYOUT,SCENE_IMAGE_FILES,PROPS_LAYOUT} from '../scene-data.js';
import {createProp} from '../props.js';
import {CONFIG} from '../config.js';
test('deflected props fade continuously within one second including hit-stop',()=>{
 const alpha=[0,CONFIG.propFadeStart,.4,.65,CONFIG.propLifetime].map(reactionAge=>obstacleOpacity({reacting:true,reactionAge}));assert.equal(alpha[0],1);assert.equal(alpha[1],1);assert.equal(alpha.at(-1),0);assert.ok(alpha[2]<1&&alpha[2]>alpha[3]);assert.ok(CONFIG.propLifetime+CONFIG.hitStop<=1);assert.equal(obstacleOpacity({reacting:false,reactionAge:10}),1);
});
test('discovery leaves the treat and reaction readable throughout the three-second hold',()=>{
 const game={x:230,y:100,endingStartX:230,endingStartY:100};assert.deepEqual(endingCatPose({...game,endingAge:0}),{catX:230,catY:100});assert.deepEqual(endingCatPose({...game,endingAge:.5}),{catX:250,catY:0});
 const texts=[],images=[],c=new Proxy({drawImage:(...a)=>images.push(a),fillText:text=>texts.push(text),createRadialGradient:()=>({addColorStop(){}})}, {get:(t,k)=>t[k]||(()=>{})}),assets=Object.fromEntries(SCENE_IMAGE_FILES.map(p=>[p,{}])),r=new Renderer({getContext:()=>c,getBoundingClientRect:()=>({width:960})},assets,SPRITE_LAYOUT),catFrame=SPRITE_LAYOUT.sheets.find(s=>s.id==='cat-hit-recover-v2').frames[0];
 for(const [age,state]of [[.3,'ending-discovery'],[1.5,'ending-discovery'],[1.5,'paused'],[CONFIG.discoverySeconds-1e-6,'ending-discovery']]){texts.length=0;images.length=0;r.draw({...game,obstacles:[],state,endingStarted:true,elapsed:30,distance:1000,endingAge:age},0);assert.ok(texts.includes('츄르'));assert.ok(texts.includes('츄르!'));assert.ok(texts.includes('!'));assert.ok(images.length>=4);assert.deepEqual(images.at(-1).slice(1,5),Object.values(catFrame.source_rect))}
 texts.length=0;r.draw({...game,obstacles:[],state:'ending-trip',endingStarted:true,elapsed:30,distance:1000,endingAge:CONFIG.discoverySeconds+.3},0);assert.ok(texts.includes('츄르'));assert.equal(texts.includes('츄르!'),false);
});
test('danger alpha outlines are cached once and follow rotated fading artwork',()=>{
 const draws=[],cache=[],main=new Proxy({drawImage:(...a)=>draws.push(['draw',...a]),rotate:a=>draws.push(['rotate',a])}, {get:(t,k)=>t[k]||(()=>{})}),ownerDocument={createElement:()=>({getContext:()=>new Proxy({drawImage:(...a)=>cache.push(a)}, {get:(t,k)=>t[k]||(()=>{})})})},assets=Object.fromEntries(SCENE_IMAGE_FILES.map(p=>[p,{}])),r=new Renderer({ownerDocument,getContext:()=>main,getBoundingClientRect:()=>({width:960})},assets,SPRITE_LAYOUT),o=createProp('book-green',{kind:'low',x:400,lift:80,angle:.4,reacting:true,reactionAge:.4});r.obstacle(o);const count=cache.length;assert.equal(r.outlineCache.size,1);assert.ok(count>=14);assert.equal(draws.find(x=>x[0]==='rotate')[1],.4);assert.ok(main.globalAlpha<1);r.obstacle({...o,angle:.8,reactionAge:.6});assert.equal(cache.length,count);assert.equal(r.outlineCache.size,1);assert.ok(main.globalAlpha<obstacleOpacity(o));assert.equal(draws.at(-1)[0],'draw');const tall=PROPS_LAYOUT.frames.find(f=>f.id==='double-stack');assert.ok(tall.image);
});
test('compact main HTML keeps all screen IDs without an outer promotional intro',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.equal(/<header|<footer|class="intro"|쉿, 사서가 달아나고 있어!/.test(html),false);assert.equal((html.match(/<h1>/g)||[]).length,1);for(const id of ['step-run','step-comic','step-puzzle','run-screen','comic-screen','puzzle-screen','complete-screen'])assert.ok(html.includes('id="'+id+'"'));assert.ok(html.includes('journey visually-hidden'));
});

test('burst reaction fades can finish sooner while ordinary props retain the original lifetime',()=>{
 const burst={reacting:true,reactionLifetime:.42,fadeStart:.08};assert.equal(obstacleOpacity({...burst,reactionAge:.08}),1);assert.ok(Math.abs(obstacleOpacity({...burst,reactionAge:.25})-.5)<1e-9);assert.equal(obstacleOpacity({...burst,reactionAge:.42}),0);assert.ok(obstacleOpacity({reacting:true,reactionAge:.42})>0);
});
