import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Renderer} from '../renderer.js';
const layout=JSON.parse(readFileSync(new URL('../assets/sprites/sprite-layout-v2.json',import.meta.url),'utf8'));
test('v2 measured rectangles stay inside image; both cat sheets use one fixed reference scale',()=>{
 for(const sheet of layout.sheets){assert.equal(sheet.frames.length,8);for(const f of sheet.frames){const r=f.source_rect;assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=1536&&r.y+r.h<=1024);assert.ok(f.anchor_local.x>=0&&f.anchor_local.x<=r.w);assert.ok(f.anchor_local.y>=0&&f.anchor_local.y<=r.h)}}
 const calls=[],context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),drawImage:(...args)=>calls.push(args)}, {get:(t,k)=>t[k]||(()=>{})});
 const oldDocument=globalThis.document,oldDpr=globalThis.devicePixelRatio;
 globalThis.document={createElement:()=>({getContext:()=>context})};globalThis.devicePixelRatio=2;
 try{const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:320})},images=[{id:'run'},{id:'lib'},{id:'hit'}],renderer=new Renderer(canvas,images,layout);
  assert.equal(renderer.scales.cat,58/261);assert.equal(renderer.scales.librarian,180/391);assert.equal(canvas.width,640);assert.equal(canvas.height,333);
  renderer.sprite('cat-run-thin-v2',240,415,0,4);renderer.sprite('cat-hit-recover-v2',240,415,0,2);renderer.sprite('librarian-run',780,415,0,7);
  for(const [i,id,frameIndex]of [[0,'cat-run-thin-v2',4],[1,'cat-hit-recover-v2',2],[2,'librarian-run',7]]){const sheet=layout.sheets.find(s=>s.id===id),f=sheet.frames[frameIndex],call=calls[i],scale=renderer.scales[sheet.scale_group];assert.deepEqual(call.slice(1,5),Object.values(f.source_rect));assert.ok(Math.abs(call[7]/f.source_rect.w-scale)<1e-12);assert.ok(Math.abs(call[8]/f.source_rect.h-scale)<1e-12);assert.equal(call[5],(i===2?780:240)-f.anchor_local.x*scale);assert.equal(call[6],415-f.anchor_local.y*scale)}
  assert.equal(calls[0][0],images[0]);assert.equal(calls[1][0],images[2]);assert.equal(calls[2][0],images[1]);assert.equal(renderer.debug,false);
 }finally{globalThis.document=oldDocument;globalThis.devicePixelRatio=oldDpr}
});
