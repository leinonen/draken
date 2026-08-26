// GLSL sources.
export const spriteVS = `#version 300 es
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aPosSize;
layout(location=2) in vec4 aUV;
layout(location=3) in vec4 aColor;
layout(location=4) in vec2 aRotMode;
uniform vec2 uRes;
out vec2 vUV; out vec4 vColor; flat out float vMode;
void main(){
  float c=cos(aRotMode.x), s=sin(aRotMode.x);
  vec2 p=aCorner*aPosSize.zw;
  p=vec2(p.x*c-p.y*s, p.x*s+p.y*c)+aPosSize.xy;
  vec2 ndc=(p/uRes)*2.0-1.0; ndc.y=-ndc.y;
  gl_Position=vec4(ndc,0.0,1.0);
  vUV=mix(aUV.xy,aUV.zw,aCorner+0.5);
  vColor=aColor; vMode=aRotMode.y;
}`;

export const spriteFS = `#version 300 es
precision mediump float;
in vec2 vUV; in vec4 vColor; flat in float vMode;
uniform sampler2D uTex; out vec4 o;
void main(){
  vec4 t=texture(uTex,vUV);
  if(vMode>0.5) o=vec4(vColor.rgb, t.a*vColor.a); else o=t*vColor;
  if(o.a<0.01) discard;
}`;

export const fsVS = `#version 300 es
layout(location=0) in vec2 aCorner;
out vec2 vUV;
void main(){ vUV=aCorner+0.5; gl_Position=vec4(aCorner*2.0,0.0,1.0); }`;

export const waterFS = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o;
uniform float uTime, uScroll; uniform vec2 uRes;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec2 p=vec2(vUV.x*uRes.x, vUV.y*uRes.y+uScroll);
  float n=noise(p*0.045+vec2(uTime*0.25,0.0))*0.55 + noise(p*0.11+vec2(0.0,-uTime*0.6))*0.3 + noise(p*0.25+vec2(uTime*0.9,uTime*0.4))*0.15;
  vec3 deep=vec3(0.04,0.14,0.30), light=vec3(0.13,0.40,0.56);
  vec3 c=mix(deep,light,n);
  float glint=pow(noise(p*0.3+vec2(uTime*1.7,uTime*0.8)),16.0)*1.2;
  float band=smoothstep(0.35,0.0,abs(vUV.x-0.62-0.1*sin(uTime*0.13)));
  c+=glint*(0.25+0.75*band);
  c=floor(c*14.0)/14.0;
  o=vec4(c,1.0);
}`;

export const brightFS = `#version 300 es
precision mediump float;
in vec2 vUV; out vec4 o; uniform sampler2D uTex;
void main(){ vec3 c=texture(uTex,vUV).rgb; float l=dot(c,vec3(0.3,0.59,0.11)); o=vec4(c*smoothstep(0.62,0.95,l),1.0); }`;

export const blurFS = `#version 300 es
precision mediump float;
in vec2 vUV; out vec4 o; uniform sampler2D uTex; uniform vec2 uDir;
void main(){
  float w[5]=float[](0.227,0.194,0.121,0.054,0.016);
  vec3 c=texture(uTex,vUV).rgb*w[0];
  for(int i=1;i<5;i++){ c+=texture(uTex,vUV+uDir*float(i)).rgb*w[i]; c+=texture(uTex,vUV-uDir*float(i)).rgb*w[i]; }
  o=vec4(c,1.0);
}`;

export const compFS = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o;
uniform sampler2D uScene, uBloom; uniform vec2 uShake, uSceneRes; uniform float uTime, uChroma, uFlash;
void main(){
  vec2 uv=vUV+uShake/uSceneRes;
  vec2 cc=uv-0.5; float d=dot(cc,cc); uv+=cc*d*0.05;
  if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){ o=vec4(0.0,0.0,0.0,1.0); return; }
  float ca=(0.0012+uChroma*0.007)*(0.3+d*2.5);
  vec3 c;
  c.r=texture(uScene,uv+vec2(ca,0.0)).r; c.g=texture(uScene,uv).g; c.b=texture(uScene,uv-vec2(ca,0.0)).b;
  c+=texture(uBloom,uv).rgb*0.9;
  c*=0.84+0.16*(0.5+0.5*sin(uv.y*uSceneRes.y*6.2831853));
  c*=1.0-d*0.8;
  c=mix(c,vec3(1.0),uFlash);
  c+=(fract(sin(dot(uv+fract(uTime),vec2(12.9898,78.233)))*43758.5453)-0.5)*0.035;
  o=vec4(c,1.0);
}`;

export const terrainFS = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o;
uniform sampler2D uHeight; uniform float uTime, uScroll, uTexRows; uniform vec2 uRes;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec2 wp=vec2(vUV.x*uRes.x, vUV.y*uRes.y+uScroll);
  vec2 hv=texture(uHeight, vec2(wp.x/uRes.x, wp.y/(uTexRows*4.0))).rg;
  float h=hv.r, v=hv.g;
  vec2 q=floor(wp/2.0);
  float gr=hash(q)-0.5;
  float big=noise(wp*0.06);
  vec3 col; float a;
  if(h<0.5){
    float sh=smoothstep(0.38,0.5,h);
    col=vec3(0.22,0.58,0.58);
    a=sh*0.65;
    float band=smoothstep(0.465,0.5,h);
    float foam=band*(0.55+0.45*sin(uTime*2.2+h*90.0+big*7.0));
    foam*=step(0.3,hash(q+floor(uTime*3.0)));
    col=mix(col,vec3(0.96,0.98,1.0),foam);
    a=max(a,foam*0.85);
  } else {
    vec3 sand=vec3(0.78,0.70,0.48), granite=vec3(0.56,0.57,0.54), grass=vec3(0.43,0.60,0.30),
         forest=vec3(0.19,0.36,0.17), rock=vec3(0.51,0.52,0.48);
    col=mix(granite,sand,smoothstep(0.42,0.58,v));
    col=mix(col,grass,smoothstep(0.528,0.545,h));
    float fh=h+(big-0.5)*0.03;
    col=mix(col,forest,smoothstep(0.60,0.62,fh));
    col=mix(col,rock,smoothstep(0.76,0.79,h+(big-0.5)*0.03));
    col*=1.0+gr*0.14;
    float blot=noise(wp*0.13)-0.5;
    col*=1.0+blot*0.3*smoothstep(0.58,0.62,fh);
    float tree=step(0.78,hash(floor(wp/3.0)))*smoothstep(0.60,0.62,fh);
    col=mix(col,vec3(0.10,0.22,0.10),tree*0.8);
    float crack=step(0.93,noise(wp*0.5))*smoothstep(0.76,0.79,h);
    col=mix(col,vec3(0.32,0.33,0.30),crack);
    col*=mix(0.5,1.0,smoothstep(0.5,0.512,h));
    col=floor(col*28.0)/28.0;
    a=1.0;
  }
  o=vec4(col,a);
}`;
