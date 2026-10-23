import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
let source='// Generated from the measured JSON layouts by scripts/build-scene-data.mjs.\n';
for(const [name,path] of [['SPRITE_LAYOUT','assets/sprites/sprite-layout-v2.json'],['PROPS_LAYOUT','assets/props/props-layout.json'],['BACKGROUND_LAYOUT','assets/background/background-layout.json'],['MOTION_LAYOUT','assets/librarian/librarian-motion-layout.json'],['DOUBLE_STACK_LAYOUT','assets/props/book-stack-double.json']]){
 const data=JSON.parse(await readFile(new URL(path,root),'utf8'));
 source+='export const '+name+'='+JSON.stringify(data)+';\n';
}
source+="export const SCENE_IMAGE_FILES=[...new Set([...SPRITE_LAYOUT.sheets.map(s=>s.image),PROPS_LAYOUT.image,...PROPS_LAYOUT.frames.map(f=>f.image).filter(Boolean),BACKGROUND_LAYOUT.image,...Object.values(MOTION_LAYOUT.clips).map(c=>c.image)])];\n";
await writeFile(new URL('scene-data.js',root),source);
