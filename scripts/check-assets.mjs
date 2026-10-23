import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {SPRITE_LAYOUT,PROPS_LAYOUT,BACKGROUND_LAYOUT,MOTION_LAYOUT,DOUBLE_STACK_LAYOUT,SCENE_IMAGE_FILES} from '../scene-data.js';
const root=resolve(import.meta.dirname,'..'),read=f=>readFileSync(resolve(root,f),'utf8');
const manifest=JSON.parse(read('asset-verification.json')),assets=manifest.verified;
function webpSize(bytes){
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('WebP header');
 let alpha=false,size;for(let p=12;p+8<=bytes.length;){const type=bytes.toString('ascii',p,p+4),n=bytes.readUInt32LE(p+4),d=p+8;
  if(type==='VP8X'){size={width:bytes.readUIntLE(d+4,3)+1,height:bytes.readUIntLE(d+7,3)+1};alpha=Boolean(bytes[d]&16)}
  if(type==='VP8L'){const bits=bytes.readUInt32LE(d+1);size={width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};alpha=Boolean(bits&0x10000000)}
  if(type==='VP8 '&&!size)size={width:bytes.readUInt16LE(d+6)&0x3fff,height:bytes.readUInt16LE(d+8)&0x3fff};
  if(type==='ALPH')alpha=true;p=d+n+(n%2);
 }return {...size,alpha};
}
for(const f of assets){const bytes=readFileSync(resolve(root,f.file));if(bytes.length!==f.bytes||createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Asset hash: '+f.file);if(f.file.endsWith('.webp')){const size=webpSize(bytes);if(size.width!==f.width||size.height!==f.height||size.alpha!==f.alpha)throw Error('WebP dimensions/alpha: '+f.file)}}
for(const [name,path] of [['SPRITE_LAYOUT','assets/sprites/sprite-layout-v2.json'],['PROPS_LAYOUT','assets/props/props-layout.json'],['BACKGROUND_LAYOUT','assets/background/background-layout.json'],['MOTION_LAYOUT','assets/librarian/librarian-motion-layout.json'],['DOUBLE_STACK_LAYOUT','assets/props/book-stack-double.json']]){
 const compiled={SPRITE_LAYOUT,PROPS_LAYOUT,BACKGROUND_LAYOUT,MOTION_LAYOUT,DOUBLE_STACK_LAYOUT,SCENE_IMAGE_FILES}[name];if(JSON.stringify(compiled)!==JSON.stringify(JSON.parse(read(path))))throw Error('Run npm run build:scene: '+name);
}
for(const file of SCENE_IMAGE_FILES)if(!existsSync(resolve(root,file)))throw Error('Scene image path: '+file);
for(const [name,clip] of Object.entries(MOTION_LAYOUT.clips)){if(clip.frames.reduce((n,f)=>n+f.duration_ms,0)!==clip.duration_ms)throw Error('Motion duration '+name);for(const f of clip.frames){if(f.root_anchor.x!==144||f.root_anchor.y!==212||f.source_rect.w!==320||f.source_rect.h!==320)throw Error('Motion registration '+name)}}
for(const sheet of SPRITE_LAYOUT.sheets){if(!existsSync(resolve(root,sheet.image))||sheet.frames.length!==8)throw Error('Sprite path/count');for(const f of sheet.frames){const a=f.source_rect;if(a.x<0||a.y<0||a.x+a.w>1536||a.y+a.h>1024||!f.anchor_local)throw Error('Measured sprite rectangle')}}
for(const f of PROPS_LAYOUT.frames){const a=f.source_rect;if(a.x<0||a.y<0||a.x+a.w>1536||a.y+a.h>1024||f.collision_points_normalized.length<3||!f.ground_anchor_local)throw Error('Measured prop rectangle')}
const ids=[...read('index.html').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)throw Error('Duplicate HTML ID');
for(const m of read('app.js').matchAll(/\$\('([^']+)'\)/g))if(!ids.includes(m[1]))throw Error('Missing HTML ID: '+m[1]);
for(const file of ['app.js','renderer.js','engine.js','collision.js','librarian-motion.js','config.js','props.js','scene-data.js'])for(const m of read(file).matchAll(/from\s+['"]([^'"]+)['"]/g))if(m[1].startsWith('.')&&!existsSync(resolve(root,dirname(file),m[1].split('?')[0])))throw Error('Missing module: '+m[1]);
if(/postcard-back|assets\/reference/.test(read('app.js')+read('index.html')))throw Error('Reference image exposed');
const activeBytes=assets.filter(a=>a.file.endsWith('.webp')).reduce((n,f)=>n+f.bytes,0);if(activeBytes!==manifest.after_image_bytes)throw Error('Image size budget');
console.log(JSON.stringify({verifiedAssets:assets.length,catFrames:16,librarianFrames:22,propForms:PROPS_LAYOUT.frames.length,webpBytes:activeBytes,initialImageBytes:manifest.initial_image_bytes,smallerThanPreviousPercent:+(100*(1-activeBytes/manifest.before_active_image_bytes)).toFixed(1),hashes:'pass',dimensionsAndAlpha:'pass',measuredLayouts:'pass',modulePaths:'pass',htmlIds:'pass'},null,2));
