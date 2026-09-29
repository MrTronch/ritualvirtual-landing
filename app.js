import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';

const portal = document.querySelector('#portal');
const status = document.querySelector('#load-status');
const media = matchMedia('(prefers-reduced-motion: reduce)');
let paused = media.matches;
let visible = true;
let renderer, scene, camera, rig, spinPivot, eyes, mouth, textures, environment;
let spinTime = null;
const spinDuration = .7;
const hitTester = new THREE.Raycaster();
let renderFrame = 0, lastTime = 0, elapsed = 0;
let nextBlink = 3, blinkEnd = 0, doubleBlink = false, secondBlink = false, nextMouth = 6, mouthEnd = 0;
const pointer = new THREE.Vector2();
const random = (a,b) => a + Math.random()*(b-a);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const uniforms = { time:{value:0}, aspect:{value:1}, interaction:{value:new THREE.Vector2()} };
const backdrop = new THREE.Scene();
const backdropCamera = new THREE.Camera();
const backdropMaterial = new THREE.ShaderMaterial({
  uniforms, depthTest:false, depthWrite:false,
  vertexShader:`varying vec2 uvPos; void main(){uvPos=uv;gl_Position=vec4(position.xy,0.,1.);}`,
  fragmentShader:`precision mediump float;
    varying vec2 uvPos; uniform float time; uniform float aspect; uniform vec2 interaction;
    void main(){
      vec2 p=(uvPos-.5)*vec2(aspect,1.); p+=interaction*.025;
      float t=time*.38;
      float radius=length(p-interaction*.38);
      float ripple=sin(radius*24.-t*4.);
      p+=vec2(sin(p.y*7.+t),cos(p.x*6.-t))*.065;
      p+=normalize(p-interaction*.38+vec2(.001))*ripple*.023;
      float wave=sin(p.x*4.4+p.y*3.7+t+sin(p.y*5.-t)*.7);
      float fold=sin(p.y*6.2-p.x*2.7-t*.7+wave*.85);
      float silver=pow(.5+.5*sin(wave*2.1+fold*1.1+t*.3),12.);
      float green=pow(.5+.5*cos(wave*2.9-fold*1.7-t*.45),20.);
      vec3 base=mix(vec3(.22,.018,.78),vec3(.36,.055,1.),.5+.5*fold);
      base=mix(base,vec3(.57,.60,.66),silver*.62);
      base=mix(base,vec3(.12,.82,.32),green*.40);
      float vignette=smoothstep(.1,.95,length((uvPos-.5)*vec2(.9,1.)));
      float caustic=pow(1.-abs(sin(p.x*7.+wave*2.+t)*cos(p.y*6.+fold-t)),18.);
      float ring=pow(.5+.5*ripple,18.)*.16;
      base=mix(base,vec3(.72,.87,.80),caustic*.42+ring);
      base+=vec3(.06,.025,.08)*ripple*.35;
      base*=1.-vignette*.13;
      gl_FragColor=vec4(base,1.);
      #include <colorspace_fragment>
    }`
});
backdrop.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),backdropMaterial));

function startFrame(){if(!renderFrame && renderer && rig && visible && !document.hidden){lastTime=0;renderFrame=requestAnimationFrame(draw);}}
function setPaused(value){paused=value;pointer.set(0,0);if(textures){eyes.emissiveMap=textures.eye1;mouth.map=textures.mouth1;}updateScroll();startFrame();}
media.addEventListener('change',()=>{setPaused(media.matches);if(media.matches)video.pause();});

async function setup(){
  try{
    renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#cat-canvas'),alpha:false,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=.95;
    renderer.autoClear=false;
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(32,1,.01,100);
    const pmrem=new THREE.PMREMGenerator(renderer);
    const room=new RoomEnvironment();
    environment=pmrem.fromScene(room,.04);
    scene.environment=environment.texture;
    scene.environmentIntensity=.7;
    room.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff,0x70518c,1.2));
    const key=new THREE.DirectionalLight(0xffffff,1.7);key.position.set(-3,4,5);scene.add(key);
    const fill=new THREE.DirectionalLight(0xc2ffc9,.7);fill.position.set(3,1,2);scene.add(fill);
    const loader=new THREE.TextureLoader();
    const texture=async name=>{const t=await loader.loadAsync(`./texturas psicogato/${name}.png`);t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);return t;};
    const [gltf,eye1,eye2,mouth1,mouth2]=await Promise.all([new GLTFLoader().loadAsync('./psicogato head.glb'),texture('ojo-1'),texture('ojo-2'),texture('boca-1'),texture('boca-2')]);
    textures={eye1,eye2,mouth1,mouth2};
    const model=gltf.scene;
    model.traverse(child=>{if(!child.isMesh)return;const mats=Array.isArray(child.material)?child.material:[child.material];for(const m of mats){if(m.name==='ojos'){eyes=m;m.emissiveMap=eye1;m.emissiveIntensity=1;m.toneMapped=false;}if(m.name==='piel'){mouth=m;m.map=mouth1;}m.needsUpdate=true;}});
    if(!eyes||!mouth)throw new Error('No se encontraron los materiales ojos/piel.');
    const bounds=new THREE.Box3().setFromObject(model);
    const center=bounds.getCenter(new THREE.Vector3()), size=bounds.getSize(new THREE.Vector3());
    model.position.sub(center);model.scale.setScalar(2.65/Math.max(size.x,size.y));model.position.multiplyScalar(model.scale.x);
    rig=new THREE.Group();spinPivot=new THREE.Group();spinPivot.add(model);rig.add(spinPivot);rig.scale.setScalar(.86);scene.add(rig);
    function resize(){
      const w=portal.clientWidth,h=portal.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;
      camera.position.set(0,0,Math.max(3.75,1.325/(Math.tan(THREE.MathUtils.degToRad(16))*Math.min(camera.aspect,1)))*1.21);
      camera.lookAt(0,0,0);camera.updateProjectionMatrix();uniforms.aspect.value=w/h;startFrame();
    }
    new ResizeObserver(resize).observe(portal);resize();
    status.hidden=true;portal.classList.add('ready');
    portal.dataset.model='ready';startFrame();
  }catch(error){console.error('Psicogato:',error);status.textContent='EL PSICOGATO NO PUDO DESPERTAR. RECARGA PARA VOLVER A INTENTAR.';portal.dataset.model='error';}
}

function draw(now){
  renderFrame=0;
  if(!visible||document.hidden)return;
  const dt=lastTime?Math.min((now-lastTime)/1000,.05):0;lastTime=now;
  if(!paused){
    elapsed+=dt;uniforms.time.value=elapsed;
    const easing=1-Math.exp(-dt*5);
    rig.rotation.y=THREE.MathUtils.lerp(rig.rotation.y,pointer.x*.27,easing);
    rig.rotation.x=THREE.MathUtils.lerp(rig.rotation.x,-pointer.y*.16,easing);
    rig.rotation.z=THREE.MathUtils.lerp(rig.rotation.z,-pointer.x*.025,easing);
    rig.position.y=Math.sin(elapsed*.85)*.035;
    uniforms.interaction.value.lerp(pointer,easing);
    if(elapsed>=nextBlink){eyes.emissiveMap=textures.eye2;blinkEnd=elapsed+random(.10,.16);nextBlink=Infinity;doubleBlink=!secondBlink&&Math.random()<.19;secondBlink=false;}
    if(blinkEnd && elapsed>=blinkEnd){eyes.emissiveMap=textures.eye1;blinkEnd=0;nextBlink=elapsed+(doubleBlink?.17:random(2.5,6));secondBlink=doubleBlink;doubleBlink=false;}
    if(elapsed>=nextMouth){mouth.map=textures.mouth2;mouthEnd=elapsed+random(.22,.5);nextMouth=Infinity;}
    if(mouthEnd && elapsed>=mouthEnd){mouth.map=textures.mouth1;mouthEnd=0;nextMouth=elapsed+random(4,9);}
  }
  if(spinTime!==null){
    spinTime+=dt;
    const progress=Math.min(spinTime/spinDuration,1);
    const ease=progress<.5?4*progress*progress*progress:1-Math.pow(-2*progress+2,3)/2;
    spinPivot.rotation.y=paused?0:Math.PI*2*ease;
    eyes.emissiveMap=textures.eye2;
    if(progress===1){
      spinPivot.rotation.y=0;spinTime=null;eyes.emissiveMap=textures.eye1;
      blinkEnd=0;secondBlink=false;doubleBlink=false;nextBlink=elapsed+random(2.5,6);
      portal.dataset.interaction='idle';
    }
  }
  renderer.clear();renderer.render(backdrop,backdropCamera);renderer.clearDepth();renderer.render(scene,camera);
  if(!paused||spinTime!==null)renderFrame=requestAnimationFrame(draw);
}
// One pointer path handles mouse and touch without firing twice on synthetic dblclick.
let press=null,previousTap=null;
function hitsCat(event){
  if(!rig)return false;
  const r=portal.getBoundingClientRect();
  hitTester.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2),camera);
  scene.updateMatrixWorld(true);
  return hitTester.intersectObject(rig,true).length>0;
}
portal.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  press={id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now()};
},{passive:true});
portal.addEventListener('pointercancel',()=>{press=null;previousTap=null;});
portal.addEventListener('pointerup',event=>{
  const now=performance.now(),down=press;press=null;
  if(!down||down.id!==event.pointerId||now-down.time>350||Math.hypot(event.clientX-down.x,event.clientY-down.y)>12||!hitsCat(event)){previousTap=null;return;}
  if(previousTap&&now-previousTap.time<330&&Math.hypot(event.clientX-previousTap.x,event.clientY-previousTap.y)<32){
    previousTap=null;
    if(spinTime!==null)return;
    spinTime=0;eyes.emissiveMap=textures.eye2;portal.dataset.interaction='spinning';startFrame();
  }else previousTap={x:event.clientX,y:event.clientY,time:now};
},{passive:true});
window.addEventListener('pointermove',event=>{if(paused)return;const r=portal.getBoundingClientRect();pointer.set(clamp((event.clientX-r.left)/r.width*2-1,-1,1),clamp(1-(event.clientY-r.top)/r.height*2,-1,1));},{passive:true});
window.addEventListener('pointerup',event=>{if(event.pointerType==='touch')pointer.set(0,0);},{passive:true});
document.documentElement.addEventListener('pointerleave',()=>pointer.set(0,0));
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)startFrame();},{rootMargin:'80px'}).observe(portal);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)startFrame();else video.pause();});
document.querySelector('#cat-canvas').addEventListener('webglcontextlost',event=>{event.preventDefault();status.hidden=false;status.textContent='RECARGA PARA VOLVER A VER AL PSICOGATO.';});

const video=document.querySelector('#ritual-video');
const reel=document.querySelector('#reel');
let manuallyPaused=false,videoVisible=false;
function loadVideo(){if(!video.getAttribute('src')){video.src=video.dataset.src;video.load();}}
async function playVideo(){loadVideo();try{await video.play();}catch{reel.classList.remove('playing');}}
new IntersectionObserver(([entry],observer)=>{if(entry.isIntersecting){loadVideo();observer.disconnect();}},{rootMargin:'400px'}).observe(reel);
new IntersectionObserver(([entry])=>{videoVisible=entry.isIntersecting;if(videoVisible&&!media.matches&&!manuallyPaused&&!document.hidden)playVideo();else video.pause();},{threshold:.3}).observe(reel);
function toggleVideo(){if(video.paused){manuallyPaused=false;playVideo();}else{manuallyPaused=true;video.pause();}}
video.addEventListener('click',toggleVideo);
video.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();toggleVideo();}});
function updateVideoState(){reel.classList.toggle('playing',!video.paused);video.setAttribute('aria-pressed',String(!video.paused));video.setAttribute('aria-label',video.paused?'Reproducir video de Ritual Virtual':'Pausar video de Ritual Virtual');}
video.addEventListener('play',updateVideoState);
video.addEventListener('pause',updateVideoState);
video.addEventListener('error',()=>{document.querySelector('#video-error').hidden=false;});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&videoVisible&&!media.matches&&!manuallyPaused)playVideo();});

const stage=document.querySelector('#reel-stage');
const fabric=document.querySelector('#fabric-path');
let scrollFrame=0;
function updateScroll(){
  scrollFrame=0;
  document.querySelector('.masthead').classList.toggle('scrolled',scrollY>24);
  const rect=stage.getBoundingClientRect();
  const progress=clamp((innerHeight-rect.top)/(innerHeight+rect.height),0,1);
  const bend=paused?0:Math.sin(progress*Math.PI*2)*.019;
  const inset=Math.abs(bend)*.9;
  // Only the perimeter bends; the video remains a native hardware-decoded element.
  fabric.setAttribute('d',`M .065,${inset} C .32,${inset+bend} .68,${inset-bend} .935,${inset} Q .995,${inset} .995,.045 C ${.995-bend},.34 ${.995+bend},.66 .995,.955 Q .995,${1-inset} .935,${1-inset} C .68,${1-inset-bend} .32,${1-inset+bend} .065,${1-inset} Q .005,${1-inset} .005,.955 C ${.005+bend},.66 ${.005-bend},.34 .005,.045 Q .005,${inset} .065,${inset} Z`);
  reel.style.transform=paused?'none':`translateY(${(1-progress)*22}px) rotateX(${(progress-.5)*-5}deg) rotateZ(${(progress-.5)*1.3}deg) scale(${.94+Math.sin(progress*Math.PI)*.06})`;
}
function queueScroll(){if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);}
window.addEventListener('scroll',queueScroll,{passive:true});window.addEventListener('resize',queueScroll);updateScroll();
// Reveal only after the observer is ready; content stays readable without JavaScript.
const revealObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('revealed');revealObserver.unobserve(entry.target);}}},{threshold:.12,rootMargin:'0px 0px -24px 0px'});
document.querySelectorAll('[data-reveal]').forEach(element=>{if(!media.matches){element.classList.add('reveal-ready');revealObserver.observe(element);}});
setup();
