// Laser relay server — login UI + command relay to the PC agent over WebSocket.
const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { URL } = require('url');
const fs = require('fs');
let HOST_JS='', PROGRAMS_JS='';
try { HOST_JS = fs.readFileSync('/opt/laser/host.js','utf8'); PROGRAMS_JS = fs.readFileSync('/opt/laser/programs.js','utf8'); } catch(e){}

const PORT = 3000;
const USER = process.env.UI_USER || 'admin';
const PASS = process.env.UI_PASSWORD || 'changeme';
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'changeme';

const sessions = new Set();
let agent = null;          // connected PC agent socket
let agentSeen = 0;

function cookies(req){ const o={}; (req.headers.cookie||'').split(';').forEach(c=>{const i=c.indexOf('=');if(i>0)o[c.slice(0,i).trim()]=decodeURIComponent(c.slice(i+1).trim());}); return o; }
function body(req){ return new Promise(r=>{let b='';req.on('data',d=>b+=d);req.on('end',()=>r(b));}); }
function page(b){ return `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Laser Control</title>
<style>body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:0;padding:16px;max-width:560px;margin:auto}h1{font-size:20px}button{font-size:16px;padding:12px;margin:4px;border:0;border-radius:8px;background:#2a2a2a;color:#eee;cursor:pointer}button:active{background:#444}.row{display:flex;flex-wrap:wrap}.row button{flex:1 1 30%}input{font-size:16px;padding:10px;border-radius:8px;border:1px solid #444;background:#1a1a1a;color:#eee}label{display:block;margin:8px 0 2px}#st{padding:6px 10px;border-radius:6px;display:inline-block;margin-bottom:10px}.ok{background:#164}.bad{background:#611}.c{width:34px;height:34px;border-radius:6px;border:2px solid #333;display:inline-block}</style></head><body>${b}</body></html>`; }

const loginPage = page(`<div style="max-width:340px;margin:14vh auto;text-align:center">
<div style="font-size:58px;filter:drop-shadow(0 0 14px #06c)">🔆</div>
<h1 style="font-size:28px;margin:8px 0 2px;background:linear-gradient(90deg,#0cf,#a0f);-webkit-background-clip:text;background-clip:text;color:transparent">Laser Control</h1>
<p style="color:#888;margin:0 0 18px">Enter password to continue</p>
<form method=post action=/login>
<input name=pass type=password autocomplete=current-password placeholder="Password" autofocus style="width:100%;box-sizing:border-box;font-size:18px;padding:14px;text-align:center;border-radius:10px">
<button type=submit style="width:100%;font-size:18px;padding:14px;margin-top:12px;background:linear-gradient(90deg,#06c,#609);box-shadow:0 0 18px rgba(40,120,255,.45)">Unlock</button>
</form>
<script>(function(){var f=document.querySelector('form'),inp=f.pass,sv=null;try{sv=localStorage.getItem('lpw');}catch(e){}
f.addEventListener('submit',function(){try{localStorage.setItem('lpw',inp.value);}catch(e){}});
if(location.search.indexOf('e=1')>=0){try{localStorage.removeItem('lpw');}catch(e){}}
else if(sv){inp.value=sv;f.submit();}})();</script></div>`);

const controlPage = page(`<h1>Laser Control</h1>
<div id=st class=bad>checking…</div>
<p><a href="/map" style="color:#6cf;font-size:16px">→ Zone Mapping tool</a> &nbsp; <a href="/patterns" style="color:#6cf;font-size:16px">→ Patterns</a></p>
<h3>Show</h3>
<div class=row><button onclick="cmd({action:'restore'})">Restore Show</button>
<button onclick="cmd({action:'blackout'})">Blackout</button></div>
<h3>Animations</h3>
<div class=row><button onclick="runPat('p_rainbow')">Rainbow Wave</button>
<button onclick="runPat('p_plasma')">Plasma</button>
<button onclick="runPat('p_breathe')">Breathe</button></div>
<script type="text/plain" id="p_rainbow">
const meta={name:'Rainbow Wave'};
function render(ctx){ for(let i=0;i<ctx.count;i++){ const xy=ctx.xy(i); ctx.setHSV(i,(xy[0]*30+xy[1]*30+ctx.t*90)%360,100,100); } }
</script>
<script type="text/plain" id="p_plasma">
const meta={name:'Plasma'};
function render(ctx){ for(let i=0;i<ctx.count;i++){ const uv=ctx.uv(i); const n=ctx.noise(uv[0]*3,uv[1]*3,ctx.t*0.7); ctx.setHSV(i,(n*360+ctx.t*40)%360,95,100); } }
</script>
<script type="text/plain" id="p_breathe">
const meta={name:'Breathe'};
function render(ctx){ const v=40+40*Math.sin(ctx.t*1.5); ctx.fill(220,90,v); }
</script>
<h3>Solid colour (all mapped cannons)</h3>
<div class=row>
<button style="background:#a00" onclick="cmd({action:'solid',r:255,g:0,b:0})">Red</button>
<button style="background:#0a0" onclick="cmd({action:'solid',r:0,g:255,b:0})">Green</button>
<button style="background:#00c" onclick="cmd({action:'solid',r:0,g:0,b:255})">Blue</button>
<button style="background:#888" onclick="cmd({action:'solid',r:255,g:255,b:255})">White</button>
<button style="background:#444" onclick="cmd({action:'solid',r:0,g:0,b:0})">Off</button></div>
<h3>Single cannon</h3>
<label>Zone index</label><input id=z type=number value=0 min=0 max=48 style=width:80px>
<label>Colour</label><input id=col type=color value="#0066ff">
<br><br><button onclick="var c=document.getElementById('col').value;cmd({action:'setZone',zone:+document.getElementById('z').value,r:parseInt(c.substr(1,2),16),g:parseInt(c.substr(3,2),16),b:parseInt(c.substr(5,2),16)})">Set cannon</button>
<h3>Colour wheel <span style="font-size:13px;color:#999">(drag — all cannons follow live)</span></h3>
<div id=wrap style="position:relative;width:100%;max-width:520px;margin-top:6px">
<canvas id=wheel width=480 height=480 style="touch-action:none;border-radius:50%;width:100%;height:auto;display:block;cursor:crosshair"></canvas>
<div id=mk style="position:absolute;left:50%;top:50%;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 6px #000;transform:translate(-50%,-50%);pointer-events:none;display:none"></div>
</div>
<script>
async function cmd(o){try{var r=await fetch('/api/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(o)});var j=await r.json();}catch(e){}}
function runPat(id){ cmd({action:'loadPattern', code:document.getElementById(id).textContent, params:{}}); }
(function(){var cv=document.getElementById('wheel'),ctx=cv.getContext('2d'),N=480,Rc=240,mk=document.getElementById('mk');
function hsv(h,s,v){var c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,r,g,b;if(h<60){r=c;g=x;b=0}else if(h<120){r=x;g=c;b=0}else if(h<180){r=0;g=c;b=x}else if(h<240){r=0;g=x;b=c}else if(h<300){r=x;g=0;b=c}else{r=c;g=0;b=x}return[Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)];}
var img=ctx.createImageData(N,N),d=img.data;for(var y=0;y<N;y++)for(var x=0;x<N;x++){var dx=x-Rc,dy=y-Rc,rr=Math.sqrt(dx*dx+dy*dy),i=(y*N+x)*4;if(rr<=Rc){var h=(Math.atan2(dy,dx)*180/Math.PI+360)%360,s=rr/Rc,c=hsv(h,s,1);d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;}else{d[i+3]=0;}}ctx.putImageData(img,0,0);
var last=0,down=false;function pick(e){e.preventDefault();var b=cv.getBoundingClientRect();var cx=b.width/2,cy=b.height/2,R=b.width/2;var px=(e.clientX!=null?e.clientX:e.touches[0].clientX)-b.left,py=(e.clientY!=null?e.clientY:e.touches[0].clientY)-b.top;var dx=px-cx,dy=py-cy,ang=Math.atan2(dy,dx),rr=Math.min(Math.sqrt(dx*dx+dy*dy),R);var h=(ang*180/Math.PI+360)%360,s=rr/R,c=hsv(h,s,1);var mx=cx+Math.cos(ang)*rr,my=cy+Math.sin(ang)*rr;mk.style.display='block';mk.style.left=mx+'px';mk.style.top=my+'px';mk.style.background='rgb('+c[0]+','+c[1]+','+c[2]+')';var now=Date.now();if(now-last>80){last=now;cmd({action:'live',r:c[0],g:c[1],b:c[2]});}}
cv.addEventListener('pointerdown',function(e){down=true;if(cv.setPointerCapture)cv.setPointerCapture(e.pointerId);pick(e);});
cv.addEventListener('pointermove',function(e){if(down)pick(e);});
window.addEventListener('pointerup',function(){down=false;});})();
async function poll(){try{var r=await fetch('/api/status');var j=await r.json();var s=document.getElementById('st');if(j.agent){s.className='ok';s.textContent='PC agent: connected';}else{s.className='bad';s.textContent='PC agent: DISCONNECTED';}}catch(e){}}
setInterval(poll,2000);poll();
</script>`);

const mapPage = page(`<h1>Zone Mapping</h1>
<p><a href="/" style="color:#6cf;font-size:16px">← Control</a></p>
<div id=st class=bad>checking…</div>
<p>Pick a zone — it blinks bright white on the rig (~8s) over the show. Note which physical cannon lights up.</p>
<label>Zone (dropdown)</label>
<select id=sel onchange="setz(+this.value)">${Array.from({length:49},(_,i)=>`<option value=${i}>Zone ${i}</option>`).join('')}</select>
<label>Zone (manual entry)</label>
<input id=z type=number min=0 max=48 value=0 style=width:100px onchange="setz(+this.value)">
<br><br>
<div class=row>
<button onclick="step(-1)">◀ Prev</button>
<button onclick="blink()" style="flex:1 1 50%;background:#06c;font-size:20px">BLINK</button>
<button onclick="step(1)">Next ▶</button>
</div>
<p id=cur style="font-size:20px;margin-top:14px"></p>
<script>
function val(){return +document.getElementById('z').value;}
function setz(n){n=Math.max(0,Math.min(48,n||0));document.getElementById('z').value=n;document.getElementById('sel').value=n;document.getElementById('cur').textContent='Selected: zone '+n;}
async function blink(){var n=val();setz(n);document.getElementById('cur').textContent='Blinking zone '+n+'…';try{await fetch('/api/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'blink',zone:n})});}catch(e){}}
function step(d){setz(val()+d);blink();}
async function poll(){try{var r=await fetch('/api/status');var j=await r.json();var s=document.getElementById('st');if(j.agent){s.className='ok';s.textContent='PC agent: connected';}else{s.className='bad';s.textContent='PC agent: DISCONNECTED';}}catch(e){}}
setInterval(poll,2000);poll();setz(0);
</script>`);

const patternsPage = page(`<h1>Laser Control</h1>
<p><a href="/map" style="color:#6cf;font-size:16px">→ Zone Mapping tool</a></p>
<div id=st class=bad>checking…</div>
<p style="color:#93a1b0;font-size:13px">Tap a pattern to send it to the device — previews run live in your browser.</p>
<script type="text/plain" id="s_red">
const meta={name:'Red'};
function render(ctx){ctx.fill(0,100,100);}
</script>
<script type="text/plain" id="s_green">
const meta={name:'Green'};
function render(ctx){ctx.fill(120,100,100);}
</script>
<script type="text/plain" id="s_blue">
const meta={name:'Blue'};
function render(ctx){ctx.fill(240,100,100);}
</script>
<script type="text/plain" id="ex_hue">
const meta = { name:'Hue Wave', params:{ speed:{type:'range',min:0.2,max:4,step:0.1,default:1} } };
function render(ctx){
  for (let i=0;i<ctx.count;i++){
    const xy=ctx.xy(i);
    ctx.setHSV(i, (xy[0]*30 + xy[1]*30 + ctx.t*90*ctx.p.speed) % 360, 100, 100);
  }
}
</script>
<script type="text/plain" id="ex_plasma">
const meta = { name:'Plasma', params:{ scale:{type:'range',min:0.3,max:3,step:0.1,default:1.2}, speed:{type:'range',min:0.1,max:3,step:0.1,default:0.7} } };
function render(ctx){
  for (let i=0;i<ctx.count;i++){
    const uv=ctx.uv(i);
    const n=ctx.noise(uv[0]*3*ctx.p.scale, uv[1]*3*ctx.p.scale, ctx.t*ctx.p.speed);
    ctx.setHSV(i, (n*360 + ctx.t*40)%360, 95, 100);
  }
}
</script>
<script type="text/plain" id="ex_comet">
const meta = { name:'Comet', params:{ speed:{type:'range',min:0.5,max:8,step:0.1,default:3}, hue:{type:'hue',default:200}, trail:{type:'range',min:0.5,max:0.96,step:0.01,default:0.82} } };
function render(ctx){
  ctx.fade(ctx.p.trail);
  const i=Math.floor((ctx.t*ctx.p.speed)%ctx.count);
  ctx.setHSV(i, ctx.p.hue, 100, 100);
}
</script>
<script type="text/plain" id="px_wave">
const meta={name:'Wave'};
function render(ctx){const tk=ctx.t*60;for(let i=0;i<ctx.count;i++){const col=i%ctx.cols;ctx.setHSV(i,(tk*2+col*40)%360,85,60+Math.sin(tk*0.05+col*0.8)*20);}}
</script>
<script type="text/plain" id="px_rainbow">
const meta={name:'Rainbow'};
function render(ctx){const tk=ctx.t*60;for(let i=0;i<ctx.count;i++){const row=Math.floor(i/ctx.cols),col=i%ctx.cols;ctx.setHSV(i,(tk*1.5+(row+col)*25)%360,90,80);}}
</script>
<script type="text/plain" id="px_breathe">
const meta={name:'Breathe'};
function render(ctx){const tk=ctx.t*60;const b=40+Math.sin(tk*0.03)*35;for(let i=0;i<ctx.count;i++)ctx.setHSV(i,220,80,b);}
</script>
<script type="text/plain" id="px_pacman">
const meta={name:'Pac-Man'};
function perim(n,cols){const rows=Math.ceil(n/cols),a=[];for(let c=0;c<cols;c++)a.push(c);for(let r=1;r<rows;r++)a.push(r*cols+(cols-1));for(let c=cols-2;c>=0;c--)a.push((rows-1)*cols+c);for(let r=rows-2;r>=1;r--)a.push(r*cols);return a.filter(function(i){return i<n;});}
function render(ctx){const tk=ctx.t*60;const p=perim(ctx.count,ctx.cols);const pos=Math.floor(tk*0.3)%p.length;for(let i=0;i<ctx.count;i++)ctx.setHSV(i,220,60,15);ctx.setHSV(p[pos],55,95,95);for(let t=1;t<=3;t++){const tp=(pos-t+p.length)%p.length;ctx.setHSV(p[tp],55,80,70-t*18);}}
</script>
<script type="text/plain" id="px_spiral">
const meta={name:'Spiral'};
function render(ctx){const tk=ctx.t*60,cx=(ctx.cols-1)/2,cy=(ctx.rows-1)/2;for(let i=0;i<ctx.count;i++){const row=Math.floor(i/ctx.cols),col=i%ctx.cols,dx=col-cx,dy=row-cy;const ang=Math.atan2(dy,dx),dist=Math.sqrt(dx*dx+dy*dy);ctx.setHSV(i,((ang*57.3+dist*40+tk*3)%360+360)%360,85,75);}}
</script>
<script type="text/plain" id="px_rain">
const meta={name:'Rain'};
function render(ctx){const tk=ctx.t*60,rows=ctx.rows;for(let i=0;i<ctx.count;i++){const row=Math.floor(i/ctx.cols),col=i%ctx.cols;const phase=(tk*0.15+col*2.3+col*col*0.7)%rows;const dist=Math.abs(row-phase);ctx.setHSV(i,200+col*8,70,dist<1.5?90-dist*30:10);}}
</script>
<script type="text/plain" id="px_heartbeat">
const meta={name:'Heartbeat'};
function render(ctx){const phase=(ctx.t*60)%120;let b;if(phase<10)b=40+phase*5;else if(phase<20)b=90-(phase-10)*5;else if(phase<30)b=40+(phase-20)*4;else if(phase<40)b=80-(phase-30)*4;else b=40;for(let i=0;i<ctx.count;i++)ctx.setHSV(i,0,90,b);}
</script>
<script type="text/plain" id="px_civic">
const meta={name:'Civic (blue)'};
function render(ctx){for(let i=0;i<ctx.count;i++)ctx.setHSV(i,220,90,80);}
</script>
<script type="text/plain" id="px_pride">
const meta={name:'Pride'};
function render(ctx){for(let i=0;i<ctx.count;i++)ctx.setHSV(i,Math.round(i/ctx.count*360),90,80);}
</script>
<script type="text/plain" id="px_gold">
const meta={name:'Gold'};
function render(ctx){for(let i=0;i<ctx.count;i++)ctx.setHSV(i,45,95,80);}
</script>
<script type="text/plain" id="px_white">
const meta={name:'White'};
function render(ctx){for(let i=0;i<ctx.count;i++)ctx.setHSV(i,0,0,80);}
</script>
<script type="text/plain" id="px_solstice">
const meta={name:'Solstice'};
function render(ctx){for(let i=0;i<ctx.count;i++){const row=Math.floor(i/ctx.cols),col=i%ctx.cols;ctx.setHSV(i,40+row*5+col*4,85,80);}}
</script>
<script type="text/plain" id="px_ocean">
const meta={name:'Ocean'};
function render(ctx){for(let i=0;i<ctx.count;i++){const row=Math.floor(i/ctx.cols),col=i%ctx.cols;ctx.setHSV(i,180+row*8+col*3,75,70);}}
</script>
<script type="text/plain" id="px_sunset">
const meta={name:'Sunset'};
function render(ctx){for(let i=0;i<ctx.count;i++){const row=Math.floor(i/ctx.cols);ctx.setHSV(i,10+row*5,90,85-row*5);}}
</script>
<div class=row><button onclick="stopAll()" style="background:#8a2d2d">■ Blackout / Stop</button></div>
<style>
.tile{background:#0c1117;border:1px solid #28313d;border-radius:10px;padding:8px;cursor:pointer;text-align:center;transition:border-color .15s,transform .1s}
.tile:hover{border-color:#3b82f6;transform:translateY(-2px)}
.tile.active{border-color:#22c55e;box-shadow:0 0 0 1px #22c55e}
.tile canvas{width:100%;height:auto;border-radius:8px;background:#04060a;display:block}
.tile .nm{margin-top:6px;font-size:13px;color:#cdd9e5}
.spdrow{display:flex;flex-direction:column;gap:4px;margin-top:6px}
.spd{display:block;width:100%;min-width:0;height:5px;-webkit-appearance:none;appearance:none;background:#28313d;border-radius:3px;outline:none}
.spd::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:13px;height:13px;border-radius:50%;background:#3b82f6;cursor:pointer}
.spd::-moz-range-thumb{width:13px;height:13px;border:0;border-radius:50%;background:#3b82f6;cursor:pointer}
.spdb{align-self:flex-end;font-size:10px;padding:2px 8px;background:#222c38;border-radius:5px;min-width:42px;color:#cdd9e5;cursor:pointer;border:0}
</style>
<script type="text/plain" id="px_matrix">
const meta={name:'Matrix',params:{rate:{type:'range',min:0.1,max:1,step:0.05,default:0.5},fade:{type:'range',min:0.75,max:0.95,step:0.01,default:0.85}}};
function render(ctx){ctx.fade(ctx.p.fade);for(let k=0;k<3;k++){if(ctx.rand()<ctx.p.rate){ctx.setHSV(ctx.randInt(0,ctx.count-1),115,100,100);}}}
</script>
<script type="text/plain" id="sky_aurora">
const meta={name:'Aurora'};
function render(ctx){for(let i=0;i<ctx.count;i++){const[x,y]=ctx.xy(i);const n=ctx.noise(x*0.35,y*0.25-ctx.t*0.4,ctx.t*0.15);ctx.setHSV(i,110+n*150,75,25+n*75);}}
</script>
<script type="text/plain" id="sky_plasma">
const meta={name:'Plasma Sky'};
function render(ctx){for(let i=0;i<ctx.count;i++){const[u,v]=ctx.uv(i);const val=Math.sin(u*6+ctx.t)+Math.sin(v*6+ctx.t*1.3)+Math.sin((u+v)*5+ctx.t*0.7)+Math.sin(Math.hypot(u-0.5,v-0.5)*10-ctx.t*2);ctx.setHSV(i,(val*45+200+ctx.t*30)%360,85,90);}}
</script>
<script type="text/plain" id="sky_lava">
const meta={name:'Lava Lamp'};
function render(ctx){for(let i=0;i<ctx.count;i++){const[x,y]=ctx.xy(i);let n=ctx.noise(x*0.45,y*0.55-ctx.t*0.6,ctx.t*0.25);n=ctx.smoothstep(0.32,0.62,n);ctx.setHSV(i,6+n*36,95,18+n*82);}}
</script>
<script type="text/plain" id="sky_galaxy">
const meta={name:'Spiral Galaxy'};
function render(ctx){for(let i=0;i<ctx.count;i++){const[r,a]=ctx.polar(i);const arm=Math.sin(a*2-r*7+ctx.t*3);ctx.setHSV(i,(a*57.3+ctx.t*30+180)%360,80,Math.max(0,arm)*(1-r*0.4)*100);}}
</script>
<script type="text/plain" id="sky_beam">
const meta={name:'Beam Sweep'};
function render(ctx){const pos=(ctx.t*2)%(ctx.cols+2)-1;for(let i=0;i<ctx.count;i++){const[x,y]=ctx.xy(i);ctx.setHSV(i,(190+pos*15)%360,80,Math.max(0,1-Math.abs(x-pos)*0.8)*100);}}
</script>
<script type="text/plain" id="sky_rbsweep">
const meta={name:'Rainbow Sweep'};
function render(ctx){for(let i=0;i<ctx.count;i++){const[x,y]=ctx.xy(i);ctx.setHSV(i,(x/ctx.cols*360+ctx.t*70)%360,90,100);}}
</script>
<script type="text/plain" id="sky_rbrise">
const meta={name:'Rising Rainbow'};
function render(ctx){for(let i=0;i<ctx.count;i++){const[x,y]=ctx.xy(i);ctx.setHSV(i,((ctx.rows-y)/ctx.rows*300-ctx.t*90)%360,90,100);}}
</script>
<script type="text/plain" id="sky_waverise">
const meta={name:'Wave Rise'};
function render(ctx){const pos=(ctx.t*2.5)%(ctx.rows+2)-1;for(let i=0;i<ctx.count;i++){const[x,y]=ctx.xy(i);ctx.setHSV(i,(ctx.t*50+x*25)%360,90,Math.max(0,1-Math.abs((ctx.rows-1-y)-pos)*0.7)*100);}}
</script>
<script type="text/plain" id="sky_fireworks">
const meta={name:'Fireworks'};
let fw=[];
function render(ctx){ctx.fade(0.78);if(ctx.rand()<0.06)fw.push({x:ctx.rand(0,ctx.cols-1),y:ctx.rand(0,ctx.rows-1),h:ctx.rand(0,360),life:1});for(let k=fw.length-1;k>=0;k--){const f=fw[k];f.life-=ctx.dt*1.5;if(f.life<=0){fw.splice(k,1);continue;}const rad=(1-f.life)*3;for(let i=0;i<ctx.count;i++){const[x,y]=ctx.xy(i);if(Math.abs(Math.hypot(x-f.x,y-f.y)-rad)<0.7)ctx.setHSV(i,f.h,90,f.life*100);}}}
</script>
<script type="text/plain" id="sky_meteor">
const meta={name:'Meteor Shower'};
let mt=[];
function render(ctx){ctx.fade(0.65);if(ctx.rand()<0.25)mt.push({x:ctx.rand(0,ctx.cols-1),y:-1,h:ctx.rand(180,260)});for(let k=mt.length-1;k>=0;k--){const m=mt[k];m.y+=ctx.dt*8;m.x+=ctx.dt*2;if(m.y>ctx.rows+1){mt.splice(k,1);continue;}const xx=Math.round(m.x),yy=Math.round(m.y);if(xx>=0&&xx<ctx.cols&&yy>=0&&yy<ctx.rows)ctx.setXY(xx,yy,m.h,70,100);}}
</script>
<script type="text/plain" id="sky_rain">
const meta={name:'Rain Fall'};
let rn=[];
function render(ctx){ctx.fade(0.5);if(ctx.rand()<0.5)rn.push({x:ctx.randInt(0,ctx.cols-1),y:0,h:ctx.rand(190,230)});for(let k=rn.length-1;k>=0;k--){const r=rn[k];r.y+=ctx.dt*6;if(r.y>=ctx.rows){rn.splice(k,1);continue;}ctx.setXY(r.x,Math.floor(r.y),r.h,80,100);}}
</script>
<script type="text/plain" id="sky_snow">
const meta={name:'Snowfall'};
let sf=[];
function render(ctx){ctx.fade(0.6);if(ctx.rand()<0.35)sf.push({x:ctx.rand(0,ctx.cols-1),y:0,vx:ctx.rand(-0.3,0.3)});for(let k=sf.length-1;k>=0;k--){const s=sf[k];s.y+=ctx.dt*2.5;s.x+=s.vx*ctx.dt;if(s.y>=ctx.rows){sf.splice(k,1);continue;}const xx=Math.round(s.x),yy=Math.floor(s.y);if(xx>=0&&xx<ctx.cols)ctx.setXY(xx,yy,0,0,100);}}
</script>
<script type="text/plain" id="sky_confetti">
const meta={name:'Confetti'};
let cf=[];
function render(ctx){ctx.fade(0.8);for(let n=0;n<2;n++)if(ctx.rand()<0.5)cf.push({i:ctx.randInt(0,ctx.count-1),h:ctx.rand(0,360),life:1});for(let k=cf.length-1;k>=0;k--){const c=cf[k];c.life-=ctx.dt*1.8;if(c.life<=0){cf.splice(k,1);continue;}ctx.setHSV(c.i,c.h,90,c.life*100);}}
</script>
<script type="text/plain" id="sky_twinkle">
const meta={name:'Twinkle Stars'};
let tw=[];
function render(ctx){if(tw.length!==ctx.count)tw=new Array(ctx.count).fill(0);for(let i=0;i<ctx.count;i++){if(ctx.rand()<0.06)tw[i]=1;tw[i]*=0.9;ctx.setHSV(i,205,22,tw[i]*100);}}
</script>
<script type="text/plain" id="sky_vu">
const meta={name:'VU Bars'};
let vb=[];
function render(ctx){if(vb.length!==ctx.cols)vb=new Array(ctx.cols).fill(0);for(let x=0;x<ctx.cols;x++){const tgt=(0.4+0.6*Math.abs(Math.sin(ctx.t*2+x*0.9)))*ctx.rows;vb[x]+=(tgt-vb[x])*0.25;for(let y=0;y<ctx.rows;y++){const lvl=ctx.rows-y;if(lvl<=vb[x])ctx.setXY(x,y,Math.max(0,120-lvl*18),90,100);else ctx.setXY(x,y,0,0,0);}}}
</script>
<script type="text/plain" id="sky_fire">
const meta={name:'Fire'};
function render(ctx){for(let i=0;i<ctx.count;i++){const[x,y]=ctx.xy(i);const heat=y/(ctx.rows-1);const f=heat*(0.55+0.45*ctx.noise(x*0.6,y*0.6,ctx.t*2.5));ctx.setHSV(i,8+f*42,100,Math.min(100,f*130));}}
</script>
<script type="text/plain" id="sky_rings">
const meta={name:'Expanding Rings'};
function render(ctx){for(let i=0;i<ctx.count;i++){const[r,a]=ctx.polar(i);ctx.setHSV(i,(r*180+ctx.t*60)%360,90,Math.max(0,Math.sin(r*9-ctx.t*5))*100);}}
</script>
<script type="text/plain" id="sky_chase">
const meta={name:'Color Chase'};
function render(ctx){ctx.fade(0.7);const head=Math.floor(ctx.t*10)%ctx.count;ctx.setHSV(head,(ctx.t*80)%360,90,100);ctx.setHSV(Math.floor(ctx.t*10+ctx.count/2)%ctx.count,(ctx.t*80+180)%360,90,100);}
</script>
<script type="text/plain" id="sky_orbit">
const meta={name:'Orbit'};
function render(ctx){ctx.fade(0.72);const cx=(ctx.cols-1)/2,cy=(ctx.rows-1)/2;const xx=Math.round(cx+Math.cos(ctx.t*2)*cx),yy=Math.round(cy+Math.sin(ctx.t*2)*cy);if(xx>=0&&xx<ctx.cols&&yy>=0&&yy<ctx.rows)ctx.setXY(xx,yy,(ctx.t*60)%360,80,100);}
</script>
<script type="text/plain" id="sky_strobe">
const meta={name:'Strobe Sky'};
function render(ctx){ctx.fill((ctx.t*50)%360,90,(Math.floor(ctx.t*7)%2)===0?100:0);}
</script>
<script type="text/plain" id="face_smiley">
const meta={name:'Smiley'};
const M=['.YYYYY.','YYYYYYY','YY.Y.YY','YYYYYYY','Y.YYY.Y','YY...YY','.YYYYY.'];
function render(ctx){for(let i=0;i<ctx.count;i++){const x=i%ctx.cols,y=(i/ctx.cols)|0;ctx.setRGB(i,0,0,0);if(M[y]&&M[y][x]==='Y')ctx.setHSV(i,50,100,100);}}
</script>
<script type="text/plain" id="face_wink">
const meta={name:'Wink'};
const M=['.YYYYY.','YYYYYYY','YY.Y..Y','YYYYYYY','Y.YYY.Y','YY...YY','.YYYYY.'];
function render(ctx){for(let i=0;i<ctx.count;i++){const x=i%ctx.cols,y=(i/ctx.cols)|0;ctx.setRGB(i,0,0,0);if(M[y]&&M[y][x]==='Y')ctx.setHSV(i,50,100,100);}}
</script>
<script type="text/plain" id="face_surprised">
const meta={name:'Surprised'};
const M=['.YYYYY.','YYYYYYY','YY.Y.YY','YYYYYYY','YYY.YYY','YY.Y.YY','.YY.YY.'];
function render(ctx){for(let i=0;i<ctx.count;i++){const x=i%ctx.cols,y=(i/ctx.cols)|0;ctx.setRGB(i,0,0,0);if(M[y]&&M[y][x]==='Y')ctx.setHSV(i,50,100,100);}}
</script>
<script type="text/plain" id="face_sad">
const meta={name:'Sad'};
const M=['.YYYYY.','YYYYYYY','YY.Y.YY','YYYYYYY','YY...YY','Y.YYY.Y','.YYYYY.'];
function render(ctx){for(let i=0;i<ctx.count;i++){const x=i%ctx.cols,y=(i/ctx.cols)|0;ctx.setRGB(i,0,0,0);if(M[y]&&M[y][x]==='Y')ctx.setHSV(i,45,100,100);}}
</script>
<script type="text/plain" id="face_blink">
const meta={name:'Blinking Smiley'};
const O=['.YYYYY.','YYYYYYY','YY.Y.YY','YYYYYYY','Y.YYY.Y','YY...YY','.YYYYY.'];
const C=['.YYYYY.','YYYYYYY','YYYYYYY','YY.Y.YY','Y.YYY.Y','YY...YY','.YYYYY.'];
function render(ctx){const blink=(ctx.t%3)>2.8;const M=blink?C:O;for(let i=0;i<ctx.count;i++){const x=i%ctx.cols,y=(i/ctx.cols)|0;ctx.setRGB(i,0,0,0);if(M[y]&&M[y][x]==='Y')ctx.setHSV(i,50,100,100);}}
</script>
<script type="text/plain" id="face_rainbow">
const meta={name:'Rainbow Smiley'};
const M=['.YYYYY.','YYYYYYY','YY.Y.YY','YYYYYYY','Y.YYY.Y','YY...YY','.YYYYY.'];
function render(ctx){const h=(ctx.t*50)%360;for(let i=0;i<ctx.count;i++){const x=i%ctx.cols,y=(i/ctx.cols)|0;ctx.setRGB(i,0,0,0);if(M[y]&&M[y][x]==='Y')ctx.setHSV(i,h,90,100);}}
</script>
<script src="/host.js"></script>
<script src="/programs.js"></script>
<div id="gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:8px;margin-top:10px"></div>
<h3 style="margin-top:26px">Sky Beams <span style="font-size:13px;color:#999">(side view — beams pointing up)</span></h3>
<div id="skygallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:8px"></div>
<div id=spmodal style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);align-items:center;justify-content:center;z-index:50">
<div style="background:#171c24;border:1px solid #28313d;border-radius:12px;padding:18px 22px;text-align:center">
<div style="margin-bottom:10px;color:#cdd9e5">Speed %</div>
<input id=spinput type=number min=1 max=1000 style="width:120px;font-size:18px;text-align:center;padding:8px;border-radius:8px;border:1px solid #444;background:#0c1117;color:#e6edf3">
<div style="margin-top:14px"><button onclick="spOk()" style="background:#1f6feb">Set</button> <button onclick="spClose()">Cancel</button></div>
</div></div>
<h3 style="margin-top:26px">Flags <span style="font-size:13px;color:#999">(2026 World Cup teams + top nations)</span></h3>
<input id=flagsearch placeholder="Search country…" oninput="filterFlags(this.value)" autocomplete=off style="width:100%;max-width:320px;padding:9px 12px;border-radius:9px;border:1px solid #28313d;background:#0c1117;color:#e6edf3;font-size:14px;margin:4px 0 10px">
<div id=flaghint style="font-size:12px;color:#777;margin-bottom:8px"></div>
<div id="flaggallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:8px"></div>
<script>
var COLS=7,ROWS=7,COUNT=49;
function buildCtx(fb,st){
  var clamp=function(v,a,b){return v<a?a:(v>b?b:v);};
  function hsv(h,s,v){h=((h%360)+360)%360;s=clamp(s,0,100)/100;v=clamp(v,0,100)/100;var c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,r,g,b;if(h<60){r=c;g=x;b=0;}else if(h<120){r=x;g=c;b=0;}else if(h<180){r=0;g=c;b=x;}else if(h<240){r=0;g=x;b=c;}else if(h<300){r=x;g=0;b=c;}else{r=c;g=0;b=x;}return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)];}
  function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;var mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;}return [h,mx?d/mx*100:0,mx*100];}
  function rnd(){st.seed=(st.seed*1664525+1013904223)>>>0;return st.seed/4294967296;}
  function vnoise(x,y,z){x=x||0;y=y||0;z=z||0;var xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi;var u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);var hh=function(a,b,c){var n=(a*374761393+b*668265263+c*2147483647)|0;n=(n^(n>>13))*1274126177;return ((n^(n>>16))>>>0)/4294967296;};var L=function(a,b,t){return a+(b-a)*t;};var x00=L(hh(xi,yi,zi),hh(xi+1,yi,zi),u),x10=L(hh(xi,yi+1,zi),hh(xi+1,yi+1,zi),u),x01=L(hh(xi,yi,zi+1),hh(xi+1,yi,zi+1),u),x11=L(hh(xi,yi+1,zi+1),hh(xi+1,yi+1,zi+1),u);return L(L(x00,x10,v),L(x01,x11,v),w);}
  function setRGB(i,r,g,b){i|=0;if(i<0||i>=COUNT)return;var o=i*3;fb[o]=clamp(r,0,255);fb[o+1]=clamp(g,0,255);fb[o+2]=clamp(b,0,255);}
  function setHSV(i,h,s,v){var c=hsv(h,s,v);setRGB(i,c[0],c[1],c[2]);}
  return {cols:COLS,rows:ROWS,count:COUNT,
    get t(){return st.t;},get dt(){return st.dt;},get frame(){return st.frame;},get bpm(){return st.bpm;},get beat(){return st.beat;},get beatPhase(){return st.beatPhase;},get p(){return st.p;},
    xy:function(i){return [i%COLS,(i/COLS)|0];},index:function(x,y){return ((y|0)*COLS)+(x|0);},
    uv:function(i){return [(i%COLS)/(COLS-1),((i/COLS)|0)/(ROWS-1)];},
    polar:function(i){var x=i%COLS,y=(i/COLS)|0,cx=(COLS-1)/2,cy=(ROWS-1)/2,dx=x-cx,dy=y-cy,mr=Math.hypot(cx,cy)||1;return [Math.hypot(dx,dy)/mr,Math.atan2(dy,dx)];},
    setRGB:setRGB,setHSV:setHSV,setXY:function(x,y,h,s,v){setHSV(((y|0)*COLS)+(x|0),h,s,v);},
    fill:function(h,s,v){for(var i=0;i<COUNT;i++)setHSV(i,h,s,v);},clear:function(){for(var i=0;i<fb.length;i++)fb[i]=0;},fade:function(k){for(var i=0;i<fb.length;i++)fb[i]*=k;},
    getRGB:function(i){var o=i*3;return [fb[o],fb[o+1],fb[o+2]];},getHSV:function(i){var o=i*3;return rgb2hsv(fb[o],fb[o+1],fb[o+2]);},
    hsv:hsv,rgb2hsv:rgb2hsv,clamp:clamp,lerp:function(a,b,t){return a+(b-a)*t;},map:function(v,a,b,c,d){return c+(d-c)*((v-a)/((b-a)||1));},
    smoothstep:function(e0,e1,x){var t=clamp((x-e0)/((e1-e0)||1),0,1);return t*t*(3-2*t);},fract:function(v){return v-Math.floor(v);},
    lerpColor:function(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];},
    rand:function(a,b){return a===undefined?rnd():(b===undefined?rnd()*a:a+rnd()*(b-a));},randInt:function(a,b){return Math.floor(a+rnd()*((b-a)+1));},noise:vnoise,
    ease:{inSine:function(t){return 1-Math.cos(t*Math.PI/2);},outSine:function(t){return Math.sin(t*Math.PI/2);},inOutSine:function(t){return -(Math.cos(Math.PI*t)-1)/2;},inQuad:function(t){return t*t;},outQuad:function(t){return 1-(1-t)*(1-t);},inOutQuad:function(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}},
    log:function(){}};
}
function drawGrid(g,fb,sz){g.fillStyle='#04060a';g.fillRect(0,0,sz,sz);var pad=sz*0.1,gx=(sz-2*pad)/(COLS-1),gy=(sz-2*pad)/(ROWS-1),r=Math.min(gx,gy)*0.36;for(var i=0;i<COUNT;i++){var x=pad+(i%COLS)*gx,y=pad+((i/COLS)|0)*gy,o=i*3,R=fb[o]|0,G=fb[o+1]|0,B=fb[o+2]|0;if(R+G+B>6){g.fillStyle='rgb('+R+','+G+','+B+')';}else{g.fillStyle='rgba(255,255,255,.05)';}g.beginPath();g.arc(x,y,r,0,7);g.fill();}}
function compile(code){var body='"use strict";'+code+';return {meta:(typeof meta!=="undefined"?meta:{}),render:(typeof render!=="undefined"?render:null),init:(typeof init!=="undefined"?init:null)};';return (new Function(body))();}
var tiles=[], SZ=96;
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.target.__t)e.target.__t.vis=e.isIntersecting;});},{rootMargin:'150px'});
var DEF_SPD={'Matrix':45,'Wave':50,'Rainbow':50,'Pac-Man':45,'Spiral':60,'Rain':70,'Hue Wave':60,'Plasma':70,'Comet':60,'Heartbeat':80,'Radial Ripple':70,
'Aurora':45,'Plasma Sky':65,'Lava Lamp':40,'Spiral Galaxy':55,'Beam Sweep':55,'Rainbow Sweep':55,'Rising Rainbow':55,'Wave Rise':60,'Fireworks':55,'Meteor Shower':60,'Rain Fall':60,'Snowfall':50,'Confetti':60,'Twinkle Stars':55,'VU Bars':70,'Fire':65,'Expanding Rings':60,'Color Chase':50,'Orbit':55,'Strobe Sky':40,'Rainbow Smiley':50,'Blinking Smiley':60};
function getSpeed(name,isProg){var v=localStorage.getItem('spd:'+name);if(v!=null)return (+v)/100;if(DEF_SPD.hasOwnProperty(name))return DEF_SPD[name]/100;return isProg?0.5:1;}
var _lsT=0;
function pushSpeed(tile,force){if(!tile.el.classList.contains('active'))return;var now=Date.now();if(force||now-_lsT>120){_lsT=now;fetch('/api/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'setSpeed',speed:tile.speed})});}}
function setTileSpeed(tile,pct){pct=Math.max(1,Math.min(300,Math.round(pct)));tile.speed=pct/100;try{localStorage.setItem('spd:'+tile.name,pct);}catch(e){}tile.btn.textContent=pct+'%';tile.slider.value=pct;pushSpeed(tile,false);}
function openSpeedModal(tile){var m=document.getElementById('spmodal');document.getElementById('spinput').value=Math.round(tile.speed*100);m.__cb=function(v){setTileSpeed(tile,v);};m.style.display='flex';document.getElementById('spinput').focus();}
function spOk(){var m=document.getElementById('spmodal');var v=Math.round(+document.getElementById('spinput').value)||100;if(m.__cb)m.__cb(v);m.style.display='none';}
function spClose(){document.getElementById('spmodal').style.display='none';}
function addTile(name,patternObj,shipCode,isProg,containerId,noSpeed){
  if(!patternObj||typeof patternObj.render!=='function')return;
  var el=document.createElement('div');el.className='tile';el.setAttribute('data-name',name);
  var head=document.createElement('div');head.style.cursor='pointer';
  var cv=document.createElement('canvas');cv.width=SZ;cv.height=SZ;head.appendChild(cv);
  var nm=document.createElement('div');nm.className='nm';nm.textContent=name;head.appendChild(nm);
  el.appendChild(head);
  var fb=new Array(COUNT*3);for(var z=0;z<fb.length;z++)fb[z]=0;
  var st={t:Math.random()*3,dt:0,frame:0,bpm:120,beat:0,beatPhase:0,seed:12345,p:{},log:function(){}};
  var ps=(patternObj.meta&&patternObj.meta.params)||{};for(var k in ps)st.p[k]=ps[k].default;
  var ctx=buildCtx(fb,st);if(patternObj.init){try{patternObj.init(ctx);}catch(e){}}
  var tile={fb:fb,st:st,ctx:ctx,pattern:patternObj,g:cv.getContext('2d'),size:SZ,vis:true,speed:noSpeed?1:getSpeed(name,isProg),el:el,name:name};
  if(!noSpeed){
    var row=document.createElement('div');row.className='spdrow';
    var sl=document.createElement('input');sl.type='range';sl.min=1;sl.max=300;sl.step=1;sl.value=Math.round(tile.speed*100);sl.className='spd';
    var bt=document.createElement('button');bt.className='spdb';bt.textContent=Math.round(tile.speed*100)+'%';
    tile.slider=sl;tile.btn=bt;
    sl.oninput=function(){setTileSpeed(tile,+sl.value);};
    sl.onchange=function(){pushSpeed(tile,true);};
    bt.onclick=function(ev){ev.stopPropagation();openSpeedModal(tile);};
    row.appendChild(sl);row.appendChild(bt);el.appendChild(row);
  }
  head.onclick=function(){var ts=document.querySelectorAll('.tile');for(var q=0;q<ts.length;q++)ts[q].classList.remove('active');el.classList.add('active');
    fetch('/api/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'loadPattern',code:shipCode(),params:{},speed:tile.speed})});};
  document.getElementById(containerId||'gallery').appendChild(el);
  el.__t=tile;io.observe(el);tiles.push(tile);
}
// hand-written patterns (embedded blocks)
var blocks=document.querySelectorAll('script[type="text/plain"]');
for(var bi=0;bi<blocks.length;bi++){(function(b){var code=b.textContent.trim();var p;try{p=compile(code);}catch(e){return;}var cont=(b.id&&b.id.indexOf('sky_')===0)?'skygallery':'gallery';addTile((p.meta&&p.meta.name)||b.id,p,function(){return code;},false,cont);})(blocks[bi]);}
// program library (host.js + programs.js) — adapter for previews, self-contained bundle for shipping
function makeProgramPattern(program){var node=null;return {meta:{name:program.name},
  init:function(c){node=Host.createNode(program.factory,{W:c.cols,H:c.rows,runs:Host.fullRuns(c.cols,c.rows),seed:305419896});},
  render:function(c){node.renderFrame(c.frame,c.dt);var f=node.fb,N=Math.min(c.count,node.ownedCount);for(var i=0;i<N;i++){var o=i*3;c.setRGB(i,f[o],f[o+1],f[o+2]);}}};}
var HOST_SRC='',PROGRAMS_SRC='';
function progBundle(name){return HOST_SRC+'\\n'+PROGRAMS_SRC+'\\nvar meta={name:'+JSON.stringify(name)+'};var __p=null;function init(c){var P=null;for(var i=0;i<Programs.length;i++){if(Programs[i].name==='+JSON.stringify(name)+'){P=Programs[i];break;}}__p=Host.createNode(P.factory,{W:c.cols,H:c.rows,runs:Host.fullRuns(c.cols,c.rows),seed:305419896});}function render(c){__p.renderFrame(c.frame,c.dt);var f=__p.fb,N=Math.min(c.count,__p.ownedCount);for(var i=0;i<N;i++){var o=i*3;c.setRGB(i,f[o],f[o+1],f[o+2]);}}';}
Promise.all([fetch('/host.js').then(function(r){return r.text();}),fetch('/programs.js').then(function(r){return r.text();})]).then(function(a){HOST_SRC=a[0];PROGRAMS_SRC=a[1];
  if(typeof Programs!=='undefined'&&typeof Host!=='undefined'){for(var i=0;i<Programs.length;i++){(function(pr){addTile(pr.name,makeProgramPattern(pr),function(){return progBundle(pr.name);},true);})(Programs[i]);}}
}).catch(function(e){console.log('program load failed',e);});
// ---- Flags: data-driven (one compact spec per country), grouped + searchable ----
var R=[0,90,80],W=[0,0,100],B=[222,90,72],L=[200,75,92],G=[140,85,68],Y=[50,100,92],K=[0,0,6],O=[25,95,90],M=[0,80,52],DG=[150,90,42];
function renderFlag(ctx,s){var cols=ctx.cols,rows=ctx.rows,cx=(cols-1)/2,cy=(rows-1)/2;for(var i=0;i<ctx.count;i++){var x=i%cols,y=(i/cols)|0,u=cols>1?x/(cols-1):0,v=rows>1?y/(rows-1):0,c,n,t=s.t;
 if(t==='v'){n=s.c.length;c=s.c[Math.min(n-1,Math.floor(x*n/cols))];}
 else if(t==='h'){n=s.c.length;c=s.c[Math.min(n-1,Math.floor(y*n/rows))];}
 else if(t==='cross'){c=(x===2||y===3)?s.x:s.f;}
 else if(t==='plus'){c=(x===((cols/2)|0)||y===((rows/2)|0))?s.x:s.f;}
 else if(t==='circle'){c=(Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy))<=(s.r||1.8))?s.o:s.f;}
 else if(t==='quad'){c=s.c[(y>cy?2:0)+(x>cx?1:0)];}
 else if(t==='diag'){c=(Math.abs(u-v)<0.2)?s.d:s.f;}
 else if(t==='saltire'){c=(Math.abs(u-v)<0.2||Math.abs(u-(1-v))<0.2)?s.d:s.f;}
 else if(t==='canton'){var st=(y%2===0)?s.s1:s.s2;if(x<=2&&y<=2)c=(s.star&&((x+y)%2===0))?s.star:s.can;else c=st;}
 else if(t==='korea'){var dk=Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy));c=(dk<=1.9)?(y<=cy?s.top:s.bot):s.f;}
 else if(t==='oz'){if(x<=2&&y<=2)c=(x===1||y===1||x===y||x===2-y)?s.fg:s.f;else c=s.f;var sp=(x===5&&y===4)||(x===4&&y===6)||(x===6&&y===5)||(x===4&&y===3)||(x===2&&y===5);if(sp)c=s.starcol||s.fg;}
 else if(t==='brazil'){var md=Math.abs(x-cx)/(cx||1)+Math.abs(y-cy)/(cy||1),dd=Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy));c=(dd<=1.3)?s.orb:(md<=1.02?s.dia:s.f);}
 else {c=s.f||[0,0,0];}
 ctx.setHSV(i,c[0],c[1],c[2]);
 if(s.e&&(Math.abs(x-cx)+Math.abs(y-cy))<=1.2)ctx.setHSV(i,s.e[0],s.e[1],s.e[2]);}}
var FLAGS=[
 {n:'USA',s:{t:'canton',s1:R,s2:W,can:B,star:W}},{n:'Canada',s:{t:'v',c:[R,W,R],e:R}},{n:'Mexico',s:{t:'v',c:[G,W,R],e:M}},
 {n:'Argentina',s:{t:'h',c:[L,W,L],e:Y}},{n:'Brazil',s:{t:'brazil',f:G,dia:Y,orb:B}},{n:'Colombia',s:{t:'h',c:[Y,Y,B,R]}},{n:'Ecuador',s:{t:'h',c:[Y,Y,B,R],e:M}},{n:'Paraguay',s:{t:'h',c:[R,W,B],e:G}},{n:'Uruguay',s:{t:'canton',s1:W,s2:L,can:Y}},
 {n:'England',s:{t:'plus',f:W,x:R}},{n:'France',s:{t:'v',c:[B,W,R]}},{n:'Germany',s:{t:'h',c:[K,R,Y]}},{n:'Spain',s:{t:'h',c:[R,Y,Y,R],e:M}},{n:'Portugal',s:{t:'v',c:[DG,R,R],e:Y}},{n:'Netherlands',s:{t:'h',c:[R,W,B]}},{n:'Belgium',s:{t:'v',c:[K,Y,R]}},{n:'Croatia',s:{t:'h',c:[R,W,B],e:R}},{n:'Switzerland',s:{t:'plus',f:R,x:W}},{n:'Austria',s:{t:'h',c:[R,W,R]}},{n:'Scotland',s:{t:'saltire',f:B,d:W}},{n:'Norway',s:{t:'cross',f:R,x:B}},{n:'Sweden',s:{t:'cross',f:B,x:Y}},{n:'Czechia',s:{t:'h',c:[W,R]}},{n:'Turkey',s:{t:'circle',f:R,o:W,r:1.6,e:R}},{n:'Bosnia',s:{t:'solid',f:B,e:Y}},
 {n:'Morocco',s:{t:'solid',f:R,e:G}},{n:'Senegal',s:{t:'v',c:[G,Y,R],e:G}},{n:'Egypt',s:{t:'h',c:[R,W,K],e:Y}},{n:'Ghana',s:{t:'h',c:[R,Y,G],e:K}},{n:'Algeria',s:{t:'v',c:[G,W],e:R}},{n:'Tunisia',s:{t:'circle',f:R,o:W,r:1.8,e:R}},{n:'Ivory Coast',s:{t:'v',c:[O,W,G]}},{n:'Cape Verde',s:{t:'h',c:[B,W,R,B]}},{n:'South Africa',s:{t:'h',c:[R,G,B]}},{n:'DR Congo',s:{t:'diag',f:L,d:R,e:Y}},
 {n:'Japan',s:{t:'circle',f:W,o:R,r:1.8}},{n:'South Korea',s:{t:'korea',f:W,top:R,bot:B}},{n:'Iran',s:{t:'h',c:[G,W,R],e:R}},{n:'Iraq',s:{t:'h',c:[R,W,K],e:G}},{n:'Saudi Arabia',s:{t:'solid',f:G,e:W}},{n:'Qatar',s:{t:'v',c:[W,M]}},{n:'Jordan',s:{t:'h',c:[K,W,G],e:R}},{n:'Uzbekistan',s:{t:'h',c:[L,W,G]}},{n:'Australia',s:{t:'oz',f:B,fg:W}},
 {n:'Curacao',s:{t:'h',c:[B,Y,B]}},{n:'Haiti',s:{t:'h',c:[B,R],e:W}},{n:'Panama',s:{t:'quad',c:[W,R,B,W]}},{n:'New Zealand',s:{t:'oz',f:B,fg:W,starcol:R}},
 {n:'Italy',s:{t:'v',c:[G,W,R]}},{n:'Poland',s:{t:'h',c:[W,R]}},{n:'Denmark',s:{t:'cross',f:R,x:W}},{n:'Finland',s:{t:'cross',f:W,x:B}},{n:'Russia',s:{t:'h',c:[W,B,R]}},{n:'Ukraine',s:{t:'h',c:[B,Y]}},{n:'China',s:{t:'solid',f:R,e:Y}},{n:'India',s:{t:'h',c:[O,W,G],e:B}},{n:'Ireland',s:{t:'v',c:[G,W,O]}},{n:'Greece',s:{t:'h',c:[B,W,B,W,B]}}
];
var RF=renderFlag.toString();
for(var fi=0;fi<FLAGS.length;fi++){(function(F){
  addTile(F.n,{meta:{name:F.n},render:(function(sp){return function(c){renderFlag(c,sp);};})(F.s)},
   (function(nm,sp){return function(){return RF+';var meta={name:'+JSON.stringify(nm)+'};var __S='+JSON.stringify(sp)+';function render(c){renderFlag(c,__S);}';};})(F.n,F.s),false,'flaggallery',true);
})(FLAGS[fi]);}
function filterFlags(q){q=(q||'').trim().toLowerCase();var fg=document.getElementById('flaggallery').children,shown=0;for(var i=0;i<fg.length;i++){var nm=(fg[i].getAttribute('data-name')||'').toLowerCase();var ok=!q||nm.indexOf(q)>=0;fg[i].style.display=ok?'':'none';if(ok)shown++;}document.getElementById('flaghint').textContent=q?(shown+' match'+(shown===1?'':'es')):'';}
var last=performance.now(),gate=0;
function loop(now){var dt=Math.min(0.05,(now-last)/1000);last=now;gate+=dt;if(gate>=1/20){for(var j=0;j<tiles.length;j++){var t=tiles[j];if(!t.vis)continue;var sdt=gate*t.speed;t.st.dt=sdt;t.st.t+=sdt;t.st.frame++;t.st.beat=t.st.t*2;t.st.beatPhase=t.st.beat-Math.floor(t.st.beat);try{t.pattern.render(t.ctx);}catch(e){}drawGrid(t.g,t.fb,t.size);}gate=0;}requestAnimationFrame(loop);}
requestAnimationFrame(loop);
function stopAll(){var ts=document.querySelectorAll('.tile');for(var q=0;q<ts.length;q++)ts[q].classList.remove('active');fetch('/api/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'stopPattern'})});}
function poll(){fetch('/api/status').then(function(r){return r.json();}).then(function(j){var s=document.getElementById('st');if(j.agent){s.className='ok';s.textContent='device: connected';}else{s.className='bad';s.textContent='device: DISCONNECTED';}}).catch(function(){});}
setInterval(poll,2000);poll();
</script>
<h3 style="margin-top:24px">Colour wheel <span style="font-size:13px;color:#999">(drag — all cannons follow live)</span></h3>
<div id=wrap style="position:relative;width:100%;max-width:460px;margin-top:6px">
<canvas id=wheel width=480 height=480 style="touch-action:none;border-radius:50%;width:100%;height:auto;display:block;cursor:crosshair"></canvas>
<div id=mk style="position:absolute;left:50%;top:50%;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 6px #000;transform:translate(-50%,-50%);pointer-events:none;display:none"></div>
</div>
<script>
async function cmd(o){try{await fetch('/api/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(o)});}catch(e){}}
(function(){var cv=document.getElementById('wheel'),wctx=cv.getContext('2d'),N=480,Rc=240,mk=document.getElementById('mk');
function hsv(h,s,v){var c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,r,g,b;if(h<60){r=c;g=x;b=0}else if(h<120){r=x;g=c;b=0}else if(h<180){r=0;g=c;b=x}else if(h<240){r=0;g=x;b=c}else if(h<300){r=x;g=0;b=c}else{r=c;g=0;b=x}return[Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)];}
var img=wctx.createImageData(N,N),d=img.data;for(var y=0;y<N;y++)for(var x=0;x<N;x++){var dx=x-Rc,dy=y-Rc,rr=Math.sqrt(dx*dx+dy*dy),i=(y*N+x)*4;if(rr<=Rc){var h=(Math.atan2(dy,dx)*180/Math.PI+360)%360,s=rr/Rc,c=hsv(h,s,1);d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;}else{d[i+3]=0;}}wctx.putImageData(img,0,0);
var last=0,down=false;function pick(e){e.preventDefault();var b=cv.getBoundingClientRect();var cx=b.width/2,cy=b.height/2,R=b.width/2;var px=(e.clientX!=null?e.clientX:e.touches[0].clientX)-b.left,py=(e.clientY!=null?e.clientY:e.touches[0].clientY)-b.top;var dx=px-cx,dy=py-cy,ang=Math.atan2(dy,dx),rr=Math.min(Math.sqrt(dx*dx+dy*dy),R);var h=(ang*180/Math.PI+360)%360,s=rr/R,c=hsv(h,s,1);var mx=cx+Math.cos(ang)*rr,my=cy+Math.sin(ang)*rr;mk.style.display='block';mk.style.left=mx+'px';mk.style.top=my+'px';mk.style.background='rgb('+c[0]+','+c[1]+','+c[2]+')';var now=Date.now();if(now-last>80){last=now;cmd({action:'live',r:c[0],g:c[1],b:c[2]});}}
cv.addEventListener('pointerdown',function(e){down=true;if(cv.setPointerCapture)cv.setPointerCapture(e.pointerId);pick(e);});
cv.addEventListener('pointermove',function(e){if(down)pick(e);});
window.addEventListener('pointerup',function(){down=false;});})();
</script>`);

const server = http.createServer(async (req,res)=>{
  const u = new URL(req.url, 'http://x');
  const ck = cookies(req);
  const authed = ck.sid && sessions.has(ck.sid);

  if(u.pathname==='/login' && req.method==='GET'){ res.setHeader('content-type','text/html'); return res.end(loginPage); }
  if(u.pathname==='/login' && req.method==='POST'){
    const p = new URLSearchParams(await body(req));
    if(p.get('pass')===PASS){
      const sid = crypto.randomBytes(18).toString('hex'); sessions.add(sid);
      res.setHeader('Set-Cookie',`sid=${sid}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`);
      res.writeHead(302,{Location:'/'}); return res.end();
    }
    res.writeHead(302,{Location:'/login?e=1'}); return res.end();
  }
  if(u.pathname==='/api/status'){ res.setHeader('content-type','application/json'); return res.end(JSON.stringify({agent: !!(agent&&agent.readyState===1), seen:agentSeen})); }
  if(u.pathname==='/host.js'){ res.setHeader('content-type','application/javascript'); return res.end(HOST_JS); }
  if(u.pathname==='/programs.js'){ res.setHeader('content-type','application/javascript'); return res.end(PROGRAMS_JS); }
  if(!authed){ res.writeHead(302,{Location:'/login'}); return res.end(); }
  if(u.pathname==='/'){ res.setHeader('content-type','text/html'); return res.end(patternsPage); }
  if(u.pathname==='/map'){ res.setHeader('content-type','text/html'); return res.end(mapPage); }
  if(u.pathname==='/patterns'){ res.setHeader('content-type','text/html'); return res.end(patternsPage); }
  if(u.pathname==='/api/command' && req.method==='POST'){
    let cmd; try{ cmd=JSON.parse(await body(req)); }catch{ res.writeHead(400); return res.end('{}'); }
    res.setHeader('content-type','application/json');
    if(agent && agent.readyState===1){ agent.send(JSON.stringify(cmd)); return res.end(JSON.stringify({ok:true})); }
    res.writeHead(503); return res.end(JSON.stringify({ok:false,error:'agent disconnected'}));
  }
  res.writeHead(404); res.end('not found');
});

const wss = new WebSocketServer({ noServer:true });
server.on('upgrade',(req,socket,head)=>{
  const u = new URL(req.url,'http://x');
  if(u.pathname!=='/agent' || u.searchParams.get('token')!==AGENT_TOKEN){ socket.destroy(); return; }
  wss.handleUpgrade(req,socket,head,(ws)=>{
    if(agent){ try{agent.close();}catch{} }
    agent = ws; agentSeen = Date.now();
    console.log('agent connected');
    ws.on('message',()=>{ agentSeen=Date.now(); });
    ws.on('pong',()=>{ agentSeen=Date.now(); });
    ws.on('close',()=>{ if(agent===ws){agent=null;} console.log('agent disconnected'); });
  });
});
setInterval(()=>{ if(agent&&agent.readyState===1){ try{agent.ping();}catch{} } },15000);
server.listen(PORT,'127.0.0.1',()=>console.log('relay listening on '+PORT));
