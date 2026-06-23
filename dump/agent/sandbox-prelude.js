// ===========================================================================
// Runs INSIDE the QuickJS sandbox. Defines the pattern API (ctx) + bootstrap.
// Identical API to the simulator's buildCtx — patterns port unchanged.
// Only var/function at top level (so globals persist across evalCode calls).
// ===========================================================================
var COLS=7, ROWS=7, COUNT=COLS*ROWS;

function buildCtx(fb, st){
  var clamp=function(v,a,b){return v<a?a:(v>b?b:v);};
  function hsv(h,s,v){
    h=((h%360)+360)%360; s=clamp(s,0,100)/100; v=clamp(v,0,100)/100;
    var c=v*s, x=c*(1-Math.abs((h/60)%2-1)), m=v-c, r,g,b;
    if(h<60){r=c;g=x;b=0;}else if(h<120){r=x;g=c;b=0;}else if(h<180){r=0;g=c;b=x;}
    else if(h<240){r=0;g=x;b=c;}else if(h<300){r=x;g=0;b=c;}else{r=c;g=0;b=x;}
    return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)];
  }
  function rgb2hsv(r,g,b){ r/=255;g/=255;b/=255; var mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0;
    if(d){ if(mx===r)h=((g-b)/d)%6; else if(mx===g)h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; if(h<0)h+=360; }
    return [h, mx?d/mx*100:0, mx*100]; }
  function rnd(){ st.seed=(st.seed*1664525+1013904223)>>>0; return st.seed/4294967296; }
  function vnoise(x,y,z){ x=x||0;y=y||0;z=z||0;
    var xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi;
    var u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
    var h=function(a,b,c){var n=(a*374761393+b*668265263+c*2147483647)|0;n=(n^(n>>13))*1274126177;return ((n^(n>>16))>>>0)/4294967296;};
    var L=function(a,b,t){return a+(b-a)*t;};
    var x00=L(h(xi,yi,zi),h(xi+1,yi,zi),u), x10=L(h(xi,yi+1,zi),h(xi+1,yi+1,zi),u);
    var x01=L(h(xi,yi,zi+1),h(xi+1,yi,zi+1),u), x11=L(h(xi,yi+1,zi+1),h(xi+1,yi+1,zi+1),u);
    return L(L(x00,x10,v),L(x01,x11,v),w); }
  function setRGB(i,r,g,b){ i|=0; if(i<0||i>=COUNT)return; var o=i*3; fb[o]=clamp(r,0,255);fb[o+1]=clamp(g,0,255);fb[o+2]=clamp(b,0,255); }
  function setHSV(i,h,s,v){ var c=hsv(h,s,v); setRGB(i,c[0],c[1],c[2]); }
  return {
    cols:COLS, rows:ROWS, count:COUNT,
    get t(){return st.t;}, get dt(){return st.dt;}, get frame(){return st.frame;},
    get bpm(){return st.bpm;}, get beat(){return st.beat;}, get beatPhase(){return st.beatPhase;},
    get p(){return st.p;},
    xy:function(i){return [i%COLS,(i/COLS)|0];},
    index:function(x,y){return ((y|0)*COLS)+(x|0);},
    uv:function(i){return [(i%COLS)/(COLS-1),((i/COLS)|0)/(ROWS-1)];},
    polar:function(i){var x=i%COLS,y=(i/COLS)|0,cx=(COLS-1)/2,cy=(ROWS-1)/2,dx=x-cx,dy=y-cy,mr=Math.hypot(cx,cy)||1;return [Math.hypot(dx,dy)/mr,Math.atan2(dy,dx)];},
    setRGB:setRGB, setHSV:setHSV,
    setXY:function(x,y,h,s,v){setHSV(((y|0)*COLS)+(x|0),h,s,v);},
    fill:function(h,s,v){for(var i=0;i<COUNT;i++)setHSV(i,h,s,v);},
    clear:function(){for(var i=0;i<fb.length;i++)fb[i]=0;},
    fade:function(k){for(var i=0;i<fb.length;i++)fb[i]*=k;},
    getRGB:function(i){var o=i*3;return [fb[o],fb[o+1],fb[o+2]];},
    getHSV:function(i){var o=i*3;return rgb2hsv(fb[o],fb[o+1],fb[o+2]);},
    hsv:hsv, rgb2hsv:rgb2hsv, clamp:clamp,
    lerp:function(a,b,t){return a+(b-a)*t;},
    map:function(v,a,b,c,d){return c+(d-c)*((v-a)/((b-a)||1));},
    smoothstep:function(e0,e1,x){var t=clamp((x-e0)/((e1-e0)||1),0,1);return t*t*(3-2*t);},
    fract:function(v){return v-Math.floor(v);},
    lerpColor:function(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];},
    rand:function(a,b){return a===undefined?rnd():(b===undefined?rnd()*a:a+rnd()*(b-a));},
    randInt:function(a,b){return Math.floor(a+rnd()*((b-a)+1));},
    noise:vnoise,
    ease:{inSine:function(t){return 1-Math.cos(t*Math.PI/2);},outSine:function(t){return Math.sin(t*Math.PI/2);},inOutSine:function(t){return -(Math.cos(Math.PI*t)-1)/2;},inQuad:function(t){return t*t;},outQuad:function(t){return 1-(1-t)*(1-t);},inOutQuad:function(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}},
    log:function(){ st.log(Array.prototype.slice.call(arguments).map(String).join(' ')); }
  };
}

var __fb=[]; for(var __i=0;__i<COUNT*3;__i++) __fb.push(0);
var __st={t:0,dt:0,frame:0,bpm:120,beat:0,beatPhase:0,seed:12345,p:{},log:function(m){__log(m);}};
var __ctx=buildCtx(__fb,__st);
var __pattern=null;
function __setTime(t,dt,frame,bpm){ __st.t=t;__st.dt=dt;__st.frame=frame;__st.bpm=bpm;__st.beat=t*bpm/60;__st.beatPhase=__st.beat-Math.floor(__st.beat); }
function __setParams(json){ __st.p=JSON.parse(json); }
function __resetState(){ __st.t=0;__st.frame=0;__st.seed=12345; for(var i=0;i<__fb.length;i++)__fb[i]=0; }
function __runInit(){ if(__pattern&&__pattern.init)__pattern.init(__ctx); }
function __runRender(){ if(__pattern&&__pattern.render){ var r=__pattern.render(__ctx); return r===false?0:1; } return 1; }
function __runParam(name,val){ if(__pattern&&__pattern.onParam)__pattern.onParam(name,val,__ctx); }
function __fbJSON(){ return JSON.stringify(__fb); }
