import {readFile,writeFile} from 'node:fs/promises';
const files=['assets/sprites/cat-run.png','assets/sprites/librarian-run.png',...['01-chase','02-treat','03-sparkle','04-trip','05-jump'].map(x=>`assets/ending/ending-${x}.png`),'assets/puzzle/fold-guide.svg'];
const embedded={};for(const f of files)embedded[f]=`data:${f.endsWith('.svg')?'image/svg+xml':'image/png'};base64,${(await readFile(new URL('./'+f,import.meta.url))).toString('base64')}`;
const layout=JSON.parse(await readFile(new URL('./assets/sprites/sprite-layout.json',import.meta.url),'utf8'));
let html=await readFile(new URL('./index.html',import.meta.url),'utf8');
let js='';for(const f of ['config.js','engine.js','renderer.js','app.js'])js+=(await readFile(new URL('./'+f,import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')+'\n';
js=js.replace("const response=await fetch('assets/sprites/sprite-layout.json');if(!response.ok)throw new Error('layout');const layout=await response.json();",'const layout='+JSON.stringify(layout)+';').replace('img.src=src','img.src=EMBEDDED[src]||src').replace("$('comic-image').src=comicFiles[panel]","$('comic-image').src=EMBEDDED[comicFiles[panel]]");
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>'+await readFile(new URL('./styles.css',import.meta.url),'utf8')+'</style>').replace('src="assets/puzzle/fold-guide.svg"','src="'+embedded['assets/puzzle/fold-guide.svg']+'"').replace('<script type="module" src="app.js"></script>','<script>\nconst EMBEDDED='+JSON.stringify(embedded)+';\n'+js.replace(/<\/script/gi,'<\\/script')+'\n</script>');
await writeFile(new URL('./사서를잡아라_바로실행.html',import.meta.url),html);console.log('Standalone offline game generated.');
