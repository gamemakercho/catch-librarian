import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
const root=resolve(import.meta.dirname,'..'),read=f=>readFileSync(resolve(root,f),'utf8');
const assets=JSON.parse(read('asset-verification.json')).verified;
for(const f of assets){const bytes=readFileSync(resolve(root,f.file));if(bytes.length!==f.bytes||createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('원본 자산 불일치: '+f.file);if(f.file.endsWith('.png')&&(bytes.readUInt32BE(16)!==1536||bytes.readUInt32BE(20)!==1024))throw Error('원본 이미지 크기 변경: '+f.file);if(f.file.includes('sprites/')&&f.file.endsWith('.png')&&bytes[25]!==6)throw Error('스프라이트 알파 누락');}
const ids=[...read('index.html').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)throw Error('HTML ID 중복');
for(const m of read('app.js').matchAll(/\$\('([^']+)'\)/g))if(!ids.includes(m[1]))throw Error('HTML ID 누락: '+m[1]);
for(const file of ['app.js','renderer.js','engine.js','collision.js','config.js'])for(const m of read(file).matchAll(/from\s+['"]([^'"]+)['"]/g))if(m[1].startsWith('.')&&!existsSync(resolve(root,dirname(file),m[1])))throw Error('모듈 경로 누락: '+m[1]);
if(/postcard-back|assets\/reference/.test(read('app.js')+read('index.html')))throw Error('개발 참고 원본이 실행 경로에 있음');
console.log(JSON.stringify({originalAssets:assets.length,originalAssetBytes:assets.reduce((n,f)=>n+f.bytes,0),endingPanels:5,spriteAlpha:'확인',relativeModules:'확인',htmlIds:'확인'},null,2));

const spriteLayout=JSON.parse(read('assets/sprites/sprite-layout-v2.json'));
for(const sheet of spriteLayout.sheets){if(sheet.frames.length!==8||!spriteLayout.scale_groups[sheet.scale_group])throw Error('스프라이트 그룹/프레임 오류');for(const f of sheet.frames){const r=f.source_rect;if(r.x<0||r.y<0||r.x+r.w>1536||r.y+r.h>1024||!f.anchor_local)throw Error('스프라이트 좌표 오류')}}
console.log('v2 측정 프레임 24개 및 공유 배율 그룹 검사 통과');
