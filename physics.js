// Fixed-step planar contact physics; elevated tracks use explicit 3D paths.
export const DT = 1 / 180;
export const BUMPERS = [{x:-1.55,y:12.2,r:.65},{x:1.55,y:12.2,r:.65},{x:0,y:13.75,r:.7}];
export const TARGETS = [{id:'shieldL',x:-2.65,y:15.8,r:.48},{id:'shieldR',x:2.65,y:15.8,r:.48},{id:'gate',x:0,y:16.5,r:.62},{id:'runeL',x:-3.45,y:7.1,r:.36},{id:'runeR',x:3.1,y:7.1,r:.36},{id:'runeC',x:0,y:9.5,r:.37}];
export const RAILS = [[-4.55,0,-4.55,18.3],[4.15,0,4.15,18.3],[-4.55,18.3,-3.5,19],[-3.5,19,3.1,19],[3.1,19,4.15,18.3],[-4.5,5.4,-2.75,2.35],[4.1,5.4,2.55,2.35],[-3.8,5.5,-2.2,4.7],[-2.2,4.7,-2.65,3.4],[3.4,5.5,1.8,4.7],[1.8,4.7,2.25,3.4]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function flipper(side,angle){const dir=side==='left'?1:-1;const x=side==='left'?-2.65:2.25;return {x,y:2.3,tx:x+dir*2.25*Math.cos(angle),ty:2.3+2.25*Math.sin(angle),dir};}
export function trackPoint(side,t){
  // Smooth elevated route, with a clearly visible return to the playfield.
  const sign=side==='left'?-1:1;
  const nodes=[{x:sign*3.5,y:10.0,z:.23},{x:sign*3.65,y:15,z:1.6},{x:sign*2.75,y:18,z:2.0},{x:sign*1.1,y:16.8,z:2.1},{x:sign*2.8,y:12.8,z:1.5},{x:sign*3.45,y:8,z:.9},{x:sign*2.4,y:4.7,z:.24}];
  const p=clamp(t,0,1)*(nodes.length-1),i=Math.min(nodes.length-2,Math.floor(p)),f=p-i;
  const a=nodes[i],b=nodes[i+1];return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f};
}
export class Pinball {
  constructor(onEvent=()=>{},random=Math.random){this.onEvent=onEvent;this.random=random;this.state='idle';this.balls=[];this.time=0;this.inputs={left:false,right:false};this.angles={left:-.34,right:-.34};this.angular={left:0,right:0};this.reset();this.state='idle';}
  emit(type,data={}){this.onEvent({type,...data});}
  reset(){this.score=0;this.lives=3;this.multiplier=1;this.bonus=0;this.shields=new Set();this.towers=new Set();this.runes=new Set();this.stage='shields';this.challengeIndex=0;this.challengeTime=0;this.locks=0;this.combo=0;this.comboTime=-100;this.bestCombo=0;this.rampCount=0;this.challengeWins=0;this.multiball=false;this.saveUntil=0;this.time=0;this.balls=[];this.cooldowns={};this.angles={left:-.34,right:-.34};this.inputs={left:false,right:false};this.nextId=1;}
  start(){this.reset();this.state='playing';this.spawnLauncher();this.emit('start');this.emit('quest');}
  spawnLauncher(){this.balls.push({id:this.nextId++,x:4.76,y:1.05,z:.23,vx:0,vy:0,r:.23,mode:'launcher',age:0,stuck:0});this.emit('ready');}
  launch(power){const b=this.balls.find(b=>b.mode==='launcher');if(!b||this.state!=='playing')return false;power=clamp(power,.1,1);b.mode='launch';b.launchPower=power;b.age=0;b.vy=18+10*power;this.saveUntil=this.time+9;this.emit('launch',{power});return true;}
  points(base,label){const amount=Math.round(base*this.multiplier);this.score+=amount;this.bonus+=Math.round(base*.05);this.emit('score',{amount,label});}
  setInput(side,value){if(side in this.inputs)this.inputs[side]=value;}
  pause(){if(this.state==='playing'){this.state='paused';this.inputs={left:false,right:false};this.emit('pause');}}
  resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
  quest(){
    if(this.multiball)return {text:'寶庫已開 · 射入城門奪取大獎',progress:`${this.balls.length} 球`,mode:'龍之寶庫'};
    if(this.stage==='shields')return {text:'擊中左右盾牌 · 開啟城門',progress:`${this.shields.size} / 2`,mode:'龍堡甦醒'};
    if(this.stage==='towers')return {text:'完成左右軌道與城門 · 點亮塔樓',progress:`${this.towers.size} / 3`,mode:'點亮塔樓'};
    if(this.stage==='challenge')return {text:['龍的考驗 · 完成左側天空橋','龍的考驗 · 完成右側天空橋','龍的考驗 · 射入中央城門'][this.challengeIndex],progress:`${Math.ceil(this.challengeTime)} 秒`,mode:'龍的考驗'};
    return {text:'射入中央城門 · 鎖入三顆寶珠',progress:`${this.locks} / 3`,mode:'龍之寶庫'};
  }
  hitTarget(id){
    if((this.cooldowns[id]??-100)+.65>this.time)return;this.cooldowns[id]=this.time;
    if(id.startsWith('shield')){this.points(350,'盾牌');if(this.stage==='shields'){this.shields.add(id);if(this.shields.size===2){this.stage='towers';this.emit('gateOpen');}this.emit('quest');}return;}
    if(id.startsWith('rune')){this.points(250,'符文');this.runes.add(id);if(this.runes.size===3){this.runes.clear();this.multiplier=Math.min(6,this.multiplier+1);this.points(1500,'符文集齊');this.emit('multiplier',{value:this.multiplier});}return;}
    if(id==='gate'){
      this.points(this.multiball?5000:800,this.multiball?'寶庫大獎':'城堡入口');
      if(this.multiball){this.emit('jackpot');return;}
      if(this.stage==='towers'){this.towers.add('center');this.checkTowers();}
      else if(this.stage==='challenge')this.challengeHit('center');
      this.emit('quest');
    }
  }
  checkTowers(){if(this.towers.size===3){this.stage='challenge';this.challengeIndex=0;this.challengeTime=35;this.emit('dragonWake');}this.emit('quest');}
  challengeHit(route){if(this.stage!=='challenge'||route!==['left','right','center'][this.challengeIndex])return;this.challengeIndex++;this.points(2000,'龍的考驗');if(this.challengeIndex===3){this.stage='vault';this.challengeWins++;this.emit('challengeWon');}else{this.challengeTime+=8;this.emit('challengeStep');}this.emit('quest');}
  enterRamp(b,side){b.mode='track';b.side=side;b.age=0;this.rampCount++;this.combo=this.time-this.comboTime<8?this.combo+1:1;this.comboTime=this.time;this.bestCombo=Math.max(this.bestCombo,this.combo);this.points(1000+Math.min(6,this.combo-1)*500,'天空橋');this.emit('ramp',{side,combo:this.combo});if(this.stage==='towers'){this.towers.add(side);this.checkTowers();}else this.challengeHit(side);}
  lock(b){this.balls=this.balls.filter(ball=>ball!==b);this.locks++;this.points(1000,'寶珠鎖定');this.emit('lock',{count:this.locks});if(this.locks===3){this.multiball=true;this.saveUntil=this.time+12;for(let i=0;i<3;i++)this.balls.push({id:this.nextId++,x:(i-1)*1.5,y:15.6,z:.23,vx:(i-1)*3,vy:-5-i,r:.23,mode:'free',age:0,stuck:0});this.emit('multiball');}else this.spawnLauncher();this.emit('quest');}
  lose(b){this.balls=this.balls.filter(ball=>ball!==b);if(this.time<this.saveUntil){this.balls.push({id:this.nextId++,x:3.15,y:16.2,z:.23,vx:-5,vy:-4,r:.23,mode:'free',age:0,stuck:0});this.emit('save');return;}
    if(this.multiball&&this.balls.length){if(this.balls.length===1){this.multiball=false;this.stage='shields';this.shields.clear();this.towers.clear();this.locks=0;this.emit('multiballEnd');}this.emit('quest');return;}
    if(this.balls.length)return;
    this.lives--;const bonus=this.bonus*this.multiplier;this.score+=bonus;this.bonus=0;this.emit('drain',{bonus});if(this.lives<=0){this.state='over';this.inputs={left:false,right:false};this.emit('gameOver');}else this.spawnLauncher();
  }
  contactCircle(b,c,boost=0){const dx=b.x-c.x,dy=b.y-c.y,d=Math.hypot(dx,dy),min=b.r+c.r;if(d>=min)return false;const nx=d>1e-6?dx/d:0,ny=d>1e-6?dy/d:-1;b.x=c.x+nx*(min+.001);b.y=c.y+ny*(min+.001);const vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=1.82*vn*nx;b.vy-=1.82*vn*ny;}if(boost){b.vx+=nx*boost;b.vy+=ny*boost;}return true;}
  contactSegment(b,x1,y1,x2,y2,r=.09,surface=null){const sx=x2-x1,sy=y2-y1,l2=sx*sx+sy*sy,t=clamp(((b.x-x1)*sx+(b.y-y1)*sy)/l2,0,1),px=x1+sx*t,py=y1+sy*t,dx=b.x-px,dy=b.y-py,d=Math.hypot(dx,dy);if(d>=b.r+r)return false;let nx,ny;if(d>1e-6){nx=dx/d;ny=dy/d;}else{const l=Math.sqrt(l2);nx=-sy/l;ny=sx/l;}b.x=px+nx*(b.r+r+.001);b.y=py+ny*(b.r+r+.001);let svx=0,svy=0;if(surface){svx=-surface.w*(py-y1);svy=surface.w*(px-x1);}const vn=(b.vx-svx)*nx+(b.vy-svy)*ny;if(vn<0){const impulse=-(surface?1.62:1.75)*vn;b.vx+=impulse*nx;b.vy+=impulse*ny;if(surface&&surface.active&&surface.w*surface.dir>.1&&ny>0){b.vy=Math.max(b.vy,13+10*t);b.vx+=(surface.dir)*3*t;this.emit('flipperHit');}}return true;}
  step(dt=DT){if(this.state!=='playing')return;this.time+=dt;if(this.stage==='challenge'){this.challengeTime-=dt;if(this.challengeTime<=0){this.stage='towers';this.towers.delete('center');this.emit('challengeExpired');this.emit('quest');}}
    for(const side of ['left','right']){const target=this.inputs[side] ? .56 : -.34,old=this.angles[side];this.angles[side]+=clamp(target-old,-16*dt,16*dt);this.angular[side]=(this.angles[side]-old)/dt;}
    for(const b of [...this.balls]){
      b.age+=dt;if(b.mode==='launcher')continue;
      if(b.mode==='launch'){b.y+=b.vy*dt;if(b.y>=18){b.mode='free';b.x=3.25;b.y=17.85;b.vx=-9;b.vy=-2;if(b.launchPower>=.63&&b.launchPower<=.84){this.points(2000,'技巧發射');this.emit('skillShot');}}continue;}
      if(b.mode==='track'){const p=trackPoint(b.side,b.age/2.05);Object.assign(b,p);if(b.age>=2.05){b.mode='free';b.z=.23;b.vx=b.side==='left'?2.7:-2.7;b.vy=-6;b.age=0;}continue;}
      b.vy-=7.8*dt;b.vx*=Math.exp(-.028*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;
      if(b.y<-.55){this.lose(b);continue;}
      // Catch the mouths of elevated rails only on deliberate upward shots.
      if(b.age>.45&&b.vy>5&&b.y>9.7&&b.y<10.65&&(b.x<-3.08||b.x>3.05)){this.enterRamp(b,b.x<0?'left':'right');continue;}
      for(const s of RAILS)this.contactSegment(b,...s);
      for(let i=0;i<BUMPERS.length;i++){const c=BUMPERS[i];if(this.contactCircle(b,c,2.9)&&this.time>(this.cooldowns['b'+i]??0)+.16){this.cooldowns['b'+i]=this.time;this.points(100,'魔法水晶');this.emit('bumper',{index:i,x:c.x,y:c.y});}}
      for(const c of TARGETS){if(c.id==='gate'&&b.y>15.4&&Math.abs(b.x)<.72&&b.vy>0&&this.stage==='vault'&&!this.multiball){this.lock(b);break;}if(this.contactCircle(b,c,1)){this.hitTarget(c.id);this.emit('target',{id:c.id,x:c.x,y:c.y});}}
      if(!this.balls.includes(b))continue;
      for(const side of ['left','right']){const f=flipper(side,this.angles[side]);this.contactSegment(b,f.x,f.y,f.tx,f.ty,.17,{w:this.angular[side]*f.dir,dir:f.dir,active:this.inputs[side]});}
      const v=Math.hypot(b.vx,b.vy);if(v>32){b.vx*=32/v;b.vy*=32/v;}if(v<.45&&b.y>3){b.stuck+=dt;if(b.stuck>3){b.vx+=(this.random()-.5)*3;b.vy-=1.6;b.stuck=0;}}else b.stuck=0;
    }
  }
}
