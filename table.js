import * as THREE from './vendor/three.module.js';
import {BUMPERS,TARGETS,RAILS,flipper,trackPoint} from './physics.js';
const v=(x,y,z=0)=>new THREE.Vector3(x,z,-y);
const palette={stone:0x394957,dark:0x172c36,gold:0xc99e59,wood:0x273d3e,green:0x75d9bd,purple:0xa681e8};
export function createTable(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x0d1d26);
  const camera=new THREE.OrthographicCamera(-6,6,13,-13,.1,100);camera.position.set(0,28,16);camera.lookAt(0,.4,-9.6);
  const hemi=new THREE.HemisphereLight(0xd7e9ef,0x234847,2.4);scene.add(hemi);
  const light=new THREE.DirectionalLight(0xffe1b4,3.3);light.position.set(-7,19,4);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-9,right:9,top:9,bottom:-24,near:1,far:50});light.shadow.bias=-.002;scene.add(light);
  const fill=new THREE.DirectionalLight(0x87acff,1.5);fill.position.set(10,10,-18);scene.add(fill);
  const mats=new Map();
  const mat=(color,metal=.15,rough=.62)=>{const key=[color,metal,rough].join();if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough,flatShading:true}));return mats.get(key);};
  const glow=(color)=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.65,metalness:.25,roughness:.3,flatShading:true});
  const root=new THREE.Group();scene.add(root);
  function mesh(geo,material,x,y,z,parent=root){const m=new THREE.Mesh(geo,material);m.position.copy(v(x,y,z));m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(w,h,d,x,y,z,color,parent=root){return mesh(new THREE.BoxGeometry(w,h,d),mat(color),x,y,z,parent);}
  function cyl(r1,r2,h,x,y,z,color,parent=root,n=12){return mesh(new THREE.CylinderGeometry(r1,r2,h,n),mat(color),x,y,z,parent);}
  function orb(r,x,y,z,color,parent=root){return mesh(new THREE.IcosahedronGeometry(r,1),mat(color),x,y,z,parent);}
  function beam(a,b,r,color,parent=root){const av=v(a.x,a.y,a.z),bv=v(b.x,b.y,b.z),d=bv.clone().sub(av),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),8),mat(color,.65,.28));m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;parent.add(m);return m;}
  function ring(r,x,y,z,color,width=.04,parent=root){const m=mesh(new THREE.TorusGeometry(r,width,6,40),mat(color,.6,.35),x,y,z,parent);m.rotation.x=-Math.PI/2;return m;}
  function decal(text,x,y,width,color='#d6bd86',size=64){const c=document.createElement('canvas');c.width=512;c.height=128;const cx=c.getContext('2d');cx.font=`${size}px Georgia, serif`;cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle=color;cx.fillText(text,256,64);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}),x,y,.028);m.rotation.x=-Math.PI/2;return m;}
  // The engraved playing surface is local, procedural, and readable at phone size.
  const texCanvas=document.createElement('canvas');texCanvas.width=640;texCanvas.height=1280;
  const ctx=texCanvas.getContext('2d');const g=ctx.createLinearGradient(0,0,640,1280);g.addColorStop(0,'#29434b');g.addColorStop(.45,'#18323a');g.addColorStop(1,'#123132');ctx.fillStyle=g;ctx.fillRect(0,0,640,1280);
  ctx.strokeStyle='#9cb79a12';ctx.lineWidth=1;for(let i=0;i<640;i+=32){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,1280);ctx.stroke();}for(let i=0;i<1280;i+=32){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(640,i);ctx.stroke();}
  ctx.strokeStyle='#ad976547';ctx.lineWidth=3;ctx.strokeRect(22,26,596,1228);ctx.strokeRect(34,38,572,1204);
  for(const [x,y,r] of [[320,360,178],[320,650,140],[320,990,80]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3;ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}ctx.closePath();ctx.stroke();}
  ctx.strokeStyle='#7aceb725';ctx.lineWidth=5;for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(320+sign*95,1100);ctx.bezierCurveTo(320+sign*240,840,320+sign*260,500,320+sign*200,220);ctx.stroke();}
  const texture=new THREE.CanvasTexture(texCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  box(10.6,.55,20.8,.1,9.5,-.4,0x263630);box(10.9,.18,21.1,.1,9.5,-.67,0x785d3b);
  const board=mesh(new THREE.PlaneGeometry(10.05,20.15),new THREE.MeshStandardMaterial({map:texture,roughness:.66,metalness:.2}),.1,9.5,0);board.rotation.x=-Math.PI/2;
  // Rounded side rails and fasteners.
  for(const x of [-5.05,5.25]){beam({x,y:-.35,z:.15},{x,y:19.35,z:.15},.12,palette.gold);for(let y=1;y<19;y+=2.2){cyl(.075,.075,.055,x,y,.29,palette.gold);}}
  for(const s of RAILS){beam({x:s[0],y:s[1],z:.19},{x:s[2],y:s[3],z:.19},.09,palette.gold);}
  beam({x:4.43,y:0,z:.22},{x:4.43,y:17,z:.22},.07,0x849791);
  beam({x:5.08,y:0,z:.22},{x:5.08,y:18.6,z:.22},.07,palette.gold);
  decal('DRAGON KEEP',-.2,1.1,3.5,'#c0a371',41);decal('✦',-.15,8.25,1.5,'#639e87',74);
  decal('SKY BRIDGE',-3.5,8.9,1.3,'#a9d2b9',36);decal('SKY BRIDGE',3.35,8.9,1.3,'#a9d2b9',36);
  // Slingshot shields are curved, decorated assemblies rather than loose blocks.
  for(const sign of [-1,1]){const centerX=sign<0?-3.25:2.85;const shape=new THREE.Shape();shape.moveTo(-.5,.5);shape.quadraticCurveTo(0,.9,.65,.1);shape.lineTo(.3,-.65);shape.quadraticCurveTo(-.55,-.45,-.5,.5);const shield=mesh(new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.05,bevelThickness:.05}),mat(0x406867,.45,.5),centerX,4.65,.14);shield.rotation.x=-Math.PI/2;shield.rotation.z=sign<0?.28:-.28;ring(.2,centerX,4.65,.4,palette.gold);}
  const crystals=[];
  BUMPERS.forEach((c,i)=>{cyl(c.r+.18,c.r+.25,.18,c.x,c.y,.12,palette.gold);cyl(c.r,c.r,.28,c.x,c.y,.32,palette.dark);ring(c.r+.06,c.x,c.y,.5,palette.green,.045);const m=mesh(new THREE.IcosahedronGeometry(c.r*.77,0),glow(i===2?palette.purple:palette.green),c.x,c.y,.83);m.scale.y=1.5;crystals.push(m);});
  const targets={};
  TARGETS.filter(t=>t.id!=='gate').forEach(t=>{cyl(t.r+.13,t.r+.18,.14,t.x,t.y,.12,palette.gold);if(t.id.startsWith('shield')){const s=new THREE.Shape();s.moveTo(-.37,.6);s.lineTo(.37,.6);s.lineTo(.32,-.1);s.quadraticCurveTo(0,-.6,-.32,-.1);s.closePath();const m=mesh(new THREE.ExtrudeGeometry(s,{depth:.1,bevelEnabled:true,bevelSize:.035,bevelThickness:.03,bevelSegments:1}),glow(0x5b7c96),t.x,t.y,.72);targets[t.id]=m;orb(.12,t.x,t.y-.14,.76,palette.gold);}else{const m=mesh(new THREE.OctahedronGeometry(.27),glow(palette.purple),t.x,t.y,.47);targets[t.id]=m;ring(.38,t.x,t.y,.29,palette.purple);}});
  // Two raised metal tracks; supports show the elevation and the silver ball stays visible.
  const tracks=[];
  for(const side of ['left','right']){
    const points=[];for(let i=0;i<=72;i++)points.push(trackPoint(side,i/72));
    for(const off of [-.24,.24]){const curve=new THREE.CatmullRomCurve3(points.map(p=>v(p.x+off,p.y,p.z-.06)));const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,110,.055,6,false),mat(palette.gold,.7,.24));root.add(tube);tracks.push(tube);}
    const floorCurve=new THREE.CatmullRomCurve3(points.map(p=>v(p.x,p.y,p.z-.21)));root.add(new THREE.Mesh(new THREE.TubeGeometry(floorCurve,100,.13,6,false),mat(0x39595f,.45,.38)));
    for(const t of [.14,.32,.52,.72]){const p=trackPoint(side,t);beam({x:p.x,y:p.y,z:0},{x:p.x,y:p.y,z:p.z-.18},.075,0x626d69);cyl(.18,.23,.08,p.x,p.y,.05,palette.gold);}
  }
  const towers=[],flames=[];
  function tower(x,y,scale=1){const group=new THREE.Group();group.position.copy(v(x,y,0));root.add(group);const r=.59*scale,h=2.4*scale;cyl(r,r*1.2,h,0,0,h/2,palette.stone,group);for(let j=0;j<5;j++){ring(r+.025,0,0,.22+j*.45*scale,0x78817b,.027,group);}
    cyl(r*1.2,r*1.1,.21,0,0,h,palette.gold,group);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(.23,.4,.22,Math.cos(a)*r,Math.sin(a)*r,h+.18,0x546773,group);}
    cyl(0,r*1.27,1.1*scale,0,0,h+.78*scale,0x456f72,group);orb(.13,0,0,h+1.4*scale,palette.gold,group);
    const jewel=mesh(new THREE.OctahedronGeometry(.24),glow(0x3e6563),0,-r-.03,h*.66,group);towers.push(jewel);
    // A small pennant at each tower roof.
    beam({x:.3,y:.07,z:h+1},{x:.3,y:.07,z:h+2},.035,palette.gold,group);
    const flagShape=new THREE.Shape();flagShape.moveTo(0,0);flagShape.lineTo(.65,-.22);flagShape.lineTo(0,-.44);const flag=mesh(new THREE.ShapeGeometry(flagShape),new THREE.MeshStandardMaterial({color:0x9a5163,side:THREE.DoubleSide}),.32,.07,h+1.93,group);return group;}
  tower(-3.1,18.4,.93);tower(3.05,18.4,.93);tower(0,18.7,1.22);
  // Gatehouse with an actual arched opening.
  const arch=new THREE.Shape();arch.moveTo(-1.23,0);arch.lineTo(-1.23,1.7);arch.absarc(0,1.7,1.23,Math.PI,0,true);arch.lineTo(1.23,0);arch.closePath();const hole=new THREE.Path();hole.moveTo(-.71,0);hole.lineTo(.71,0);hole.lineTo(.71,1.5);hole.absarc(0,1.5,.71,0,Math.PI,false);hole.closePath();arch.holes.push(hole);
  const gateway=mesh(new THREE.ExtrudeGeometry(arch,{depth:.55,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.04,bevelThickness:.04}),mat(0x4e6370),0,17.1,0);gateway.position.z=-17.1;
  const gateGlow=mesh(new THREE.PlaneGeometry(1.25,2.1),new THREE.MeshBasicMaterial({color:0x91dac4,transparent:true,opacity:.1,side:THREE.DoubleSide}),0,17.15,1.05);
  const portcullis=new THREE.Group();portcullis.position.copy(v(0,16.95,.3));root.add(portcullis);for(let i=-2;i<=2;i++)beam({x:i*.23,y:0,z:0},{x:i*.23,y:0,z:1.9},.035,palette.gold,portcullis);for(const z of [.35,1,1.6])beam({x:-.58,y:0,z},{x:.58,y:0,z},.035,palette.gold,portcullis);
  for(const x of [-1.6,1.6]){cyl(.14,.2,.65,x,16.75,.33,palette.gold);const f=mesh(new THREE.IcosahedronGeometry(.16,0),glow(0xffac50),x,16.75,.78);f.scale.y=1.9;flames.push(f);}
  // A sculpted dragon: long curved neck, a horned muzzle, articulated wings and tail.
  const dragon=new THREE.Group();dragon.position.copy(v(0,18.3,3.6));root.add(dragon);
  const dragonMat=mat(0x755982,.3,.48),belly=mat(0xc3ab83,.2,.65);
  const body=mesh(new THREE.SphereGeometry(.66,12,8),dragonMat,0,0,0,dragon);body.scale.set(1.05,.85,1.6);
  const neckCurve=new THREE.CatmullRomCurve3([v(0,-.5,.05),v(0,-.85,.45),v(0,-1.3,.77),v(0,-1.75,.66)]);dragon.add(new THREE.Mesh(new THREE.TubeGeometry(neckCurve,18,.24,8,false),dragonMat));
  const head=mesh(new THREE.SphereGeometry(.37,12,8),dragonMat,0,-1.85,.67,dragon);head.scale.set(1.2,.8,1.4);
  const muzzle=mesh(new THREE.SphereGeometry(.27,10,6),belly,0,-2.2,.51,dragon);muzzle.scale.set(1.15,.65,1.55);
  const eyes=[];for(const sign of [-1,1]){const eye=mesh(new THREE.SphereGeometry(.065,8,6),glow(0x90dfb9),sign*.29,-1.99,.81,dragon);eyes.push(eye);beam({x:sign*.25,y:-1.62,z:.9},{x:sign*.43,y:-1.43,z:1.5},.065,palette.gold,dragon);orb(.075,sign*.16,-2.41,.56,0x243638,dragon);beam({x:sign*.42,y:-.4,z:-.15},{x:sign*.64,y:-.88,z:-.25},.14,0x755982,dragon);for(let j=0;j<3;j++)beam({x:sign*.64+j*.06,y:-.88,z:-.25},{x:sign*.66+j*.06,y:-1.06,z:-.21},.035,palette.gold,dragon);}
  const wings=[];for(const sign of [-1,1]){const wing=new THREE.Group();wing.position.set(sign*.42,.25,-.1);dragon.add(wing);const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(sign*.5,1.12);shape.lineTo(sign*2.16,1.05);shape.quadraticCurveTo(sign*1.65,.35,sign*1.6,-.37);shape.quadraticCurveTo(sign*.9,-.05,sign*.8,-.6);shape.lineTo(0,0);const m=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:0x648f89,side:THREE.DoubleSide,metalness:.15,roughness:.65}));wing.add(m);const vein=(a,b)=>{const d=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(.033,.055,d.length(),7),dragonMat);m.position.copy(a.clone().add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());wing.add(m);};for(const tip of [[sign*.5,1.12,0],[sign*2.16,1.05,0],[sign*1.6,-.37,0],[sign*.8,-.6,0]])vein(new THREE.Vector3(0,0,0),new THREE.Vector3(...tip));wing.rotation.x=-.65;wings.push(wing);}
  const tailPoints=[v(0,.6,0),v(.55,1.05,-.15),v(1.15,1.6,.05),v(.7,2.1,.3),v(.1,2.4,.6)];dragon.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailPoints),18,.13,7,false),dragonMat));for(let i=0;i<5;i++)cyl(0,.105,.26,0,.3-i*.23,.55+i*.02,palette.gold,dragon,5);
  // Hinged flippers share exactly the same dimensions as the physics capsules.
  const paddles={};for(const side of ['left','right']){const dir=side==='left'?1:-1,f=flipper(side,-.34),pivot=new THREE.Group();pivot.position.copy(v(f.x,f.y,.24));root.add(pivot);const curve=new THREE.LineCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(dir*2.25,0,0));const paddle=new THREE.Mesh(new THREE.TubeGeometry(curve,1,.17,12,false),mat(0xead5a5,.4,.35));pivot.add(paddle);orb(.17,0,0,0,0xead5a5,pivot);orb(.17,dir*2.25,0,0,0xead5a5,pivot);const stripe=new THREE.Mesh(new THREE.BoxGeometry(1.8,.025,.065),mat(0x637b70));stripe.position.set(dir*1.12,.17,0);pivot.add(stripe);cyl(.22,.22,.25,f.x,f.y,.25,palette.gold);paddles[side]=pivot;}
  const ballMeshes=new Map(),particleGroups=[],flashes=[];
  const ballGeo=new THREE.SphereGeometry(.23,20,12),ballMat=new THREE.MeshStandardMaterial({color:0xf5f7ff,metalness:.75,roughness:.13});
  const shadowTexCanvas=document.createElement('canvas');shadowTexCanvas.width=64;shadowTexCanvas.height=64;const sx=shadowTexCanvas.getContext('2d'),sg=sx.createRadialGradient(32,32,0,32,32,32);sg.addColorStop(0,'#0009');sg.addColorStop(1,'#0000');sx.fillStyle=sg;sx.fillRect(0,0,64,64);const shadowTex=new THREE.CanvasTexture(shadowTexCanvas);
  function effect(x,y,color=palette.green){const group=new THREE.Group();group.position.copy(v(x,y,.5));for(let i=0;i<9;i++){const a=i/9*Math.PI*2,m=new THREE.Mesh(new THREE.OctahedronGeometry(.05),new THREE.MeshBasicMaterial({color,transparent:true}));m.userData.velocity=new THREE.Vector3(Math.cos(a)*2,1+Math.sin(i)*.7,Math.sin(a)*2);group.add(m);}root.add(group);particleGroups.push({group,age:0});}
  let gateHeight=.3,awake=0,lastNow=0;
  function animate(engine,now){const elapsed=Math.min(.04,now-lastNow||.016);lastNow=now;
    const present=new Set(engine.balls.map(b=>b.id));for(const [id,obj]of ballMeshes)if(!present.has(id)){root.remove(obj.mesh,obj.shadow);ballMeshes.delete(id);}
    for(const b of engine.balls){let obj=ballMeshes.get(b.id);if(!obj){const m=new THREE.Mesh(ballGeo,ballMat);m.castShadow=true;root.add(m);const sh=new THREE.Mesh(new THREE.PlaneGeometry(.8,.8),new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));sh.rotation.x=-Math.PI/2;root.add(sh);obj={mesh:m,shadow:sh};ballMeshes.set(b.id,obj);}obj.mesh.position.copy(v(b.x,b.y,b.z));obj.mesh.rotation.x+=b.vy*elapsed;obj.mesh.rotation.z-=b.vx*elapsed;obj.shadow.position.copy(v(b.x,b.y,.02));obj.shadow.material.opacity=Math.max(.1,1-b.z*.32);}
    for(const side of ['left','right'])paddles[side].rotation.y=-engine.angles[side]*(side==='left'?1:-1);
    crystals.forEach((m,i)=>{m.rotation.y=now*.5+i;m.position.y=.86+Math.sin(now*1.5+i)*.045;});
    flames.forEach((m,i)=>m.scale.y=1.7+Math.sin(now*9+i)*.25);
    const towerOrder=['left','right','center'];towers.forEach((m,i)=>{const lit=engine.towers.has(towerOrder[i]);m.material.emissive.setHex(lit?palette.green:0x173534);m.material.color.setHex(lit?palette.green:0x426364);});
    for(const [id,m]of Object.entries(targets)){const lit=id.startsWith('shield')?engine.shields.has(id):engine.runes.has(id);m.material.emissiveIntensity=lit?1.2:.2;}
    gateHeight+=( (engine.stage==='shields'?.3:1.7)-gateHeight)*Math.min(1,elapsed*3);portcullis.position.y=gateHeight;gateGlow.material.opacity=engine.stage==='shields'?.06:.38+Math.sin(now*3)*.08;
    awake+=( (engine.stage==='challenge'||engine.stage==='vault'||engine.multiball?1:0)-awake)*elapsed*2;
    dragon.position.y=3.7+Math.sin(now*1.6)*.035+awake*.16;dragon.rotation.x=awake*.1;
    wings.forEach((w,i)=>w.rotation.y=(i===0?-1:1)*(.26+awake*(.55+Math.sin(now*3)*.16)));eyes.forEach(e=>e.material.emissiveIntensity=.25+awake*1.5);
    for(let i=particleGroups.length-1;i>=0;i--){const p=particleGroups[i];p.age+=elapsed;for(const m of p.group.children){m.position.addScaledVector(m.userData.velocity,elapsed);m.material.opacity=Math.max(0,1-p.age/.7);}if(p.age>.7){root.remove(p.group);for(const m of p.group.children){m.geometry.dispose();m.material.dispose();}particleGroups.splice(i,1);}}
    for(let i=flashes.length-1;i>=0;i--){const f=flashes[i];f.time-=elapsed;f.mesh.material.emissiveIntensity=Math.max(.65,f.time*5);if(f.time<=0)flashes.splice(i,1);}
    renderer.render(scene,camera);
  }
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);const top=h<330?58:89,bottom=26,usable=Math.max(100,h-top-bottom);renderer.setViewport(0,bottom,w,usable);const aspect=w/usable;const height=Math.max(21.2,11.2/aspect);camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();}
  return {renderer,scene,camera,resize,animate,effect,flashBumper(index){flashes.push({mesh:crystals[index],time:.5});},dragon};
}
