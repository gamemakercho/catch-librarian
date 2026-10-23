import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
let source='// Generated from the measured JSON layouts by scripts/build-scene-data.mjs.\n';
for(const [name,path] of [['SPRITE_LAYOUT','assets/sprites/sprite-layout-v2.json'],['PROPS_LAYOUT','assets/props/props-layout.json'],['BACKGROUND_LAYOUT','assets/background/background-layout.json']]){
 const data=JSON.parse(await readFile(new URL(path,root),'utf8'));
 source+='export const '+name+'='+JSON.stringify(data)+';\n';
}
await writeFile(new URL('scene-data.js',root),source);
