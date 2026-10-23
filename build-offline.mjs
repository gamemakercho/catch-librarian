import {readFile,writeFile} from 'node:fs/promises';
import {SPRITE_LAYOUT,PROPS_LAYOUT,BACKGROUND_LAYOUT} from './scene-data.js';
const files=[...SPRITE_LAYOUT.sheets.map(s=>s.image),PROPS_LAYOUT.image,BACKGROUND_LAYOUT.image,...['01-chase','02-treat','03-sparkle','04-trip','05-jump'].map(x=>`assets/ending/ending-${x}.webp`),'assets/puzzle/fold-guide.svg'];
const embedded={};for(const f of files)embedded[f]=`data:${f.endsWith('.svg')?'image/svg+xml':'image/webp'};base64,${(await readFile(new URL('./'+f,import.meta.url))).toString('base64')}`;
let html=await readFile(new URL('./index.html',import.meta.url),'utf8');
let js='';for(const f of ['scene-data.js','config.js','props.js','collision.js','engine.js','renderer.js','app.js'])js+=(await readFile(new URL('./'+f,import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')+'\n';
js=js.replaceAll('img.src=src','img.src=EMBEDDED[src]||src').replace("$('comic-image').src=comicFiles[panel]","$('comic-image').src=EMBEDDED[comicFiles[panel]]");
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>'+await readFile(new URL('./styles.css',import.meta.url),'utf8')+'</style>').replace('src="assets/puzzle/fold-guide.svg"','src="'+embedded['assets/puzzle/fold-guide.svg']+'"').replace(/<script type="module" src="app\.js(?:\?[^"]*)?"><\/script>/,'<script>\nconst EMBEDDED='+JSON.stringify(embedded)+';\n'+js.replace(/<\/script/gi,'<\\/script')+'\n</script>');
await writeFile(new URL('./사서를잡아라_바로실행.html',import.meta.url),html);console.log('Standalone WebP game generated.');
