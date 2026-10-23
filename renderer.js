import { CONFIG } from './config.js';
import { WORLD } from './engine.js';
const {floor,catX,librarianX} = WORLD;
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h)}
function rounded(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function book(c,x,y,w,h,color){rect(c,x,y,w,h,color);rect(c,x+2,y+3,2,h-6,'#ffffff28');rect(c,x+3,y+6,w-6,2,'#d8bf71');rect(c,x+3,y+h-7,w-6,1,'#d8bf7180')}
function shelf(c,x,y,w,h,seed){
 let n=seed;const rand=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296};
 rect(c,x,y,w,h,'#553b2d');rect(c,x+8,y+6,w-16,h-10,'#3f362b');
 const colors=['#7b4336','#36575a','#9d7941','#4d6148','#a15c40','#aa8b58','#516b72'];
 for(let row=0;row<4;row++){let yy=y+12+row*(h-12)/4;let xx=x+13;while(xx<x+w-16){let bw=10+rand()*11;let bh=29+rand()*24;book(c,xx,yy+53-bh,bw,bh,colors[Math.floor(rand()*colors.length)]);xx+=bw+3}rect(c,x+7,yy+55,w-14,8,'#95633c');rect(c,x+7,yy+63,w-14,3,'#402c22')}
 rect(c,x,y,9,h,'#8b5f3b');rect(c,x+w-9,y,9,h,'#8b5f3b');rect(c,x-5,y-8,w+10,10,'#b28351');rect(c,x-4,y+h-5,w+8,10,'#6a432d');
}
function arch(c,x,y,w,h){
 c.save();c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+w/2);c.arc(x+w/2,y+w/2,w/2,Math.PI,0);c.lineTo(x+w,y+h);c.closePath();c.fillStyle='#b18b57';c.fill();c.clip();
 let g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#b4d1cf');g.addColorStop(.65,'#e4e2b6');g.addColorStop(1,'#c9b975');rect(c,x+8,y+8,w-16,h-8,g);
 for(let k=0;k<5;k++){rounded(c,x-20+k*38,y+h-60-k%2*13,80,55,25,'#92ab7d66')}
 rect(c,x+w/2-3,y+8,6,h,'#c3a36a');rect(c,x,y+94,w,6,'#c3a36a');rect(c,x,y+171,w,6,'#c3a36a');c.restore();rect(c,x-8,y+h,w+16,10,'#d1ae76');
}
function plant(c,x,y){rect(c,x-14,y,28,22,'#9b6843');rect(c,x-18,y-3,36,7,'#bd9161');c.strokeStyle='#536547';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+4,y-25,x-8,y-54);c.moveTo(x,y-3);c.quadraticCurveTo(x+9,y-30,x+24,y-39);c.stroke();for(const [dx,dy,a] of [[-9,-45,-.6],[5,-28,.4],[24,-34,-.6],[-7,-18,.4]]){c.save();c.translate(x+dx,y+dy);c.rotate(a);c.fillStyle='#5f7851';c.beginPath();c.ellipse(0,0,12,6,0,0,Math.PI*2);c.fill();c.restore()}}
function library(){
 const layer=document.createElement('canvas');layer.width=1200;layer.height=floor;const c=layer.getContext('2d');
 const wall=c.createLinearGradient(0,0,0,floor);wall.addColorStop(0,'#b69566');wall.addColorStop(.7,'#d4b384');wall.addColorStop(1,'#a88457');rect(c,0,0,1200,floor,wall);
 for(let i=0;i<1200;i+=75){rect(c,i,0,1,floor,'#9b7a4b25')}
 arch(c,275,24,135,277);arch(c,683,24,135,277);
 shelf(c,25,70,192,321,27);shelf(c,455,123,164,268,81);shelf(c,882,55,215,336,92);
 for(const x of [238,639,1125]){rect(c,x,0,22,floor,'#9e7449');rect(c,x+4,0,3,floor,'#c19763');rect(c,x-8,0,38,13,'#795134');rect(c,x-5,floor-18,32,18,'#795134')}
 // Reading desk behind the running path: a different plane from the floor.
 rect(c,348,335,360,17,'#775034');rect(c,359,352,338,46,'#976c44');rect(c,369,358,145,35,'#a67a4f');rect(c,528,358,156,35,'#a67a4f');
 for(let j=0;j<4;j++)rounded(c,535-j*2,324-j*10,63,9,2,['#855240','#bca46b','#476358','#466073'][j]);
 rect(c,430,279,4,54,'#8f673c');rounded(c,415,329,35,6,3,'#725137');c.fillStyle='#54765c';c.beginPath();c.moveTo(431,260);c.lineTo(404,291);c.lineTo(459,291);c.closePath();c.fill();rect(c,418,291,28,3,'#d7b46a');plant(c,660,318);plant(c,127,57);
 for(const x of [350,760,1030]){rect(c,x,0,2,35,'#684e36');let glow=c.createRadialGradient(x+1,57,4,x+1,57,64);glow.addColorStop(0,'#ffdfa466');glow.addColorStop(1,'#ffdfa400');rect(c,x-65,0,130,130,glow);c.fillStyle='#4a5b48';c.beginPath();c.moveTo(x-7,36);c.lineTo(x-23,59);c.quadraticCurveTo(x,69,x+25,59);c.lineTo(x+8,36);c.fill();rounded(c,x-15,60,32,5,2,'#f6d88e')}
 rect(c,0,399,1200,16,'#745034');rect(c,0,402,1200,3,'#c49b65');return layer;
}
export class Renderer {
 constructor(canvas,images,layout){this.canvas=canvas;this.c=canvas.getContext('2d');this.images=images;this.layout=layout;this.back=library();this.scales=layout.sheets.map((s,i)=>(i?CONFIG.librarianHeight:CONFIG.catHeight)/Math.max(...s.frames.map(f=>f.alpha_bounds_local.h)))}
 sprite(index,x,y,t){const c=this.c,s=this.layout.sheets[index],f=s.frames[Math.floor(t*CONFIG.spriteFPS)%8],a=f.suggested_anchor_local,r=f.source_rect,scale=this.scales[index];c.drawImage(this.images[index],r.x,r.y,r.w,r.h,x-a.x*scale,y-a.y*scale,r.w*scale,r.h*scale)}
 draw(game,ambient){
 const c=this.c;const d=game.distance;const offset=(d*.24)%1200;c.clearRect(0,0,960,500);c.drawImage(this.back,-offset,0);c.drawImage(this.back,1200-offset,0);
 c.save();c.globalAlpha=.13;c.fillStyle='#fff1c0';for(const x of [230,650]){c.beginPath();c.moveTo(x-offset,40);c.lineTo(x+130-offset,40);c.lineTo(x+350-offset,415);c.lineTo(x+50-offset,415);c.fill()}c.restore();
 const g=c.createLinearGradient(0,floor,0,500);g.addColorStop(0,'#ce9d5c');g.addColorStop(1,'#a77441');rect(c,0,floor,960,85,g);
 for(let row=0;row<4;row++){const yy=floor+row*23;rect(c,0,yy,960,2,'#704d2f66');rect(c,0,yy+2,960,1,'#f4cc8e70');for(let x=-240;x<1200;x+=220){const xx=x-(d%220)+(row%2)*110;rect(c,xx,yy+2,2,21,'#83573180');rect(c,xx+15,yy+11,160,1,'#e8b77850')}}
 const t=game.state==='playing'?game.elapsed:game.state==='ready'?ambient:game.elapsed;
 const shadow=(x,y,w)=>{c.fillStyle='#4c322530';c.beginPath();c.ellipse(x,y,w,6,0,0,Math.PI*2);c.fill()};
 shadow(catX,floor+3,37-game.y*.06);shadow(librarianX,floor+4,35);
 if(game.state==='playing')for(let j=0;j<3;j++){const f=(t*3+j/3)%1;c.fillStyle=`rgba(255,236,201,${(1-f)*.6})`;c.beginPath();c.ellipse(catX-40-f*48,floor-3-f*13,3+f*5,2+f*4,0,0,Math.PI*2);c.fill()}
 this.sprite(1,librarianX+(game.recoil>0?Math.sin(game.recoil*30)*7:0),floor,t+.2);
 for(const o of game.obstacles)this.obstacle(o,t);
 c.save();if(game.invincible>0&&Math.floor(game.elapsed*16)%2)c.globalAlpha=.28;this.sprite(0,catX,floor-game.y,t);c.restore();
 // A soft vignette keeps the illustrated space warm and readable.
 let v=c.createRadialGradient(480,230,160,480,230,620);v.addColorStop(0,'#46311900');v.addColorStop(1,'#46311938');rect(c,0,0,960,500,v);
 }
 obstacle(o,t){const c=this.c;const y=floor-o.lift-o.h;c.save();c.translate(o.x,y);
 if(o.kind==='basket'){rounded(c,0,4,o.w,o.h-4,8,'#ad783d');c.strokeStyle='#694725';c.lineWidth=3;for(let x=6;x<o.w;x+=9){c.beginPath();c.moveTo(x,7);c.lineTo(x-4,o.h-2);c.stroke()}for(let z=10;z<o.h;z+=9){c.beginPath();c.moveTo(2,z);c.lineTo(o.w-1,z);c.stroke()}c.strokeRect(2,4,o.w-4,o.h-7)}
 else if(o.kind==='stack'){for(let j=0;j<3;j++){rounded(c,j%2*5,j*17,o.w-5,16,2,['#904734','#466d62','#b68c41'][j]);rect(c,4+j%2*5,j*17+4,o.w-13,8,'#f5dfae');rect(c,6,j*17+16,o.w-7,2,'#533a29')}}
 else{c.save();c.translate(o.w/2,o.h/2);c.rotate(Math.sin(t*8+o.id)*.15-.2);rounded(c,-o.w/2,-o.h/2,o.w,o.h,3,o.kind==='high'?'#8f4935':'#42645c');c.strokeStyle='#d7b063';c.lineWidth=2;c.strokeRect(-o.w/2+5,-o.h/2+4,o.w-10,o.h-8);c.restore();c.strokeStyle='#fff2ccaa';c.lineWidth=2;for(let j=0;j<2;j++){c.beginPath();c.moveTo(o.w+8,6+j*10);c.lineTo(o.w+23+j*8,6+j*10);c.stroke()}}
 c.restore();
 }
}
