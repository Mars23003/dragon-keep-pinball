import test from 'node:test';
import assert from 'node:assert/strict';
import {Pinball,DT,flipper,FLIPPER,flipperRotation} from '../physics.js';
import {Vector3,Matrix4} from '../vendor/three.core.js';
const tick=(e,s)=>{for(let i=0;i<Math.round(s/DT);i++)e.step(DT);};
const ball=(x,y,vx=0,vy=0)=>({id:200,x,y,z:.23,vx,vy,r:.23,mode:'free',age:1,stuck:0});
test('launch is gated, initial ball save and bounded skill-shot range',()=>{const e=new Pinball();assert.equal(e.launch(.7),false);e.start();assert.equal(e.balls.length,1);assert.equal(e.launch(.7),true);assert.equal(e.launch(.7),false);tick(e,1);assert.ok(e.score>=2000);assert.ok(e.balls[0].x<4.2);assert.ok(e.saveUntil>e.time);});
test('flippers transfer upward energy on press and rails reflect contacts',()=>{const e=new Pinball();e.start();const f=flipper('left',-.34);e.balls=[ball(f.x+1,f.y+.16,0,-2)];e.setInput('left',true);tick(e,.12);assert.ok(e.balls[0].vy>10);const b=ball(-4.4,8,-8,0);e.balls=[b];tick(e,.06);assert.ok(b.vx>0);assert.ok(b.x>-4.55);});
test('shields, towers, timed dragon challenge, locks and three balls form a complete loop',()=>{const e=new Pinball();e.start();e.hitTarget('shieldL');e.hitTarget('shieldR');assert.equal(e.stage,'towers');e.enterRamp(e.balls[0],'left');e.enterRamp(e.balls[0],'right');e.hitTarget('gate');assert.equal(e.stage,'challenge');e.enterRamp(e.balls[0],'right');assert.equal(e.challengeIndex,0);e.enterRamp(e.balls[0],'left');e.enterRamp(e.balls[0],'right');e.time+=1;e.hitTarget('gate');assert.equal(e.stage,'vault');for(let i=0;i<3;i++)e.lock(e.balls[0]);assert.equal(e.balls.length,3);assert.equal(e.multiball,true);assert.equal(e.lives,3);e.time=e.saveUntil+1;e.lose(e.balls[0]);assert.equal(e.lives,3);e.lose(e.balls[0]);assert.equal(e.multiball,false);assert.equal(e.stage,'shields');assert.equal(e.balls.length,1);assert.equal(e.lives,3);});
test('ball-save replaces ball, drain consumes one life, third drain ends session',()=>{const e=new Pinball();e.start();e.launch(.5);e.lose(e.balls[0]);assert.equal(e.lives,3);assert.equal(e.balls.length,1);e.time=100;for(let i=0;i<3;i++){e.saveUntil=0;e.lose(e.balls[0]);}assert.equal(e.lives,0);assert.equal(e.state,'over');assert.equal(e.balls.length,0);});
test('pause freezes physics and challenge timer; expired challenge can be retried',()=>{const e=new Pinball();e.start();e.stage='challenge';e.towers=new Set(['left','right','center']);e.challengeTime=.1;e.pause();const time=e.time;tick(e,3);assert.equal(e.time,time);e.resume();tick(e,.2);assert.equal(e.stage,'towers');assert.equal(e.towers.has('center'),false);e.hitTarget('gate');assert.equal(e.stage,'challenge');});
test('runes cap multiplier, scoring cooldown prevents duplicate contacts',()=>{const e=new Pinball();e.start();e.hitTarget('runeL');const before=e.score;e.hitTarget('runeL');assert.equal(e.score,before);for(let i=0;i<12;i++){e.time+=1;e.hitTarget('runeL');e.hitTarget('runeR');e.hitTarget('runeC');}assert.equal(e.multiplier,6);});
test('scripted ramp returns ball to same-side playfield with finite coordinates',()=>{const e=new Pinball();e.start();e.enterRamp(e.balls[0],'left');tick(e,2.08);assert.equal(e.balls[0].mode,'free');assert.ok(e.balls[0].x<0);assert.ok(e.balls[0].y<5);});
test('long fixed-step session stays finite and all non-launcher balls stay in bounds',()=>{const e=new Pinball(()=>{},()=>.37);e.start();for(let i=0;i<180*90&&e.state==='playing';i++){if(e.balls.some(b=>b.mode==='launcher'))e.launch(.75);e.setInput('left',i%143<75);e.setInput('right',i%167<83);e.step();for(const b of e.balls){assert.ok(Number.isFinite(b.x+b.y+b.vx+b.vy));assert.ok(Math.abs(b.x)<6);assert.ok(b.y<21);}}assert.ok(e.score>=0);});

test('rendered flipper tips coincide with collision tips at rest, during stroke and raised',()=>{
  for(const side of ['left','right'])for(const angle of [FLIPPER.rest,0,FLIPPER.raised]){
    const f=flipper(side,angle);
    const tip=new Vector3(f.dir*FLIPPER.length,0,0).applyMatrix4(new Matrix4().makeRotationY(flipperRotation(side,angle)));
    assert.ok(Math.abs(f.x+tip.x-f.tx)<1e-10);
    assert.ok(Math.abs(f.y-tip.z-f.ty)<1e-10);
    assert.equal(f.ty>f.y,angle>0);
  }
});
test('press raises both tips, holding stops angular motion, release returns them and restart clears motion',()=>{
  const e=new Pinball();e.start();e.balls=[];
  for(const side of ['left','right'])e.setInput(side,true);
  tick(e,.12);
  for(const side of ['left','right']){
    assert.equal(e.angles[side],FLIPPER.raised);
    assert.equal(e.angular[side],0);
    assert.ok(flipper(side,e.angles[side]).ty>2.3);
    e.setInput(side,false);
  }
  tick(e,.18);
  for(const side of ['left','right'])assert.equal(e.angles[side],FLIPPER.rest);
  e.setInput('left',true);e.step();assert.ok(e.angular.left>0);e.start();
  assert.deepEqual(e.angular,{left:0,right:0});
});
test('held flipper only rebounds incoming ball and does not inject energy into separating contact',()=>{
  const e=new Pinball();const f=flipper('left',FLIPPER.raised),nx=-Math.sin(FLIPPER.raised),ny=Math.cos(FLIPPER.raised);
  const b=ball(f.x+(f.tx-f.x)*.7+nx*.39,f.y+(f.ty-f.y)*.7+ny*.39,-nx*3,-ny*3);
  const speed=Math.hypot(b.vx,b.vy);
  assert.equal(e.contactSegment(b,f.x,f.y,f.tx,f.ty,FLIPPER.radius,{w:0,dir:1,active:true}),true);
  assert.ok(Math.hypot(b.vx,b.vy)<=speed);
  assert.ok(b.vx*nx+b.vy*ny>0);
  b.x=f.x+(f.tx-f.x)*.7+nx*.39;b.y=f.y+(f.ty-f.y)*.7+ny*.39;b.vx=nx*2;b.vy=ny*2;
  e.contactSegment(b,f.x,f.y,f.tx,f.ty,FLIPPER.radius,{w:0,dir:1,active:true});
  assert.ok(Math.abs(b.vx-nx*2)<1e-10);assert.ok(Math.abs(b.vy-ny*2)<1e-10);
});
test('moving flippers produce mirrored shots and tip contact hits harder than near the hinge',()=>{
  const shots=[];
  for(const side of ['left','right']){
    const e=new Pinball();const f=flipper(side,0),b=ball(f.x+f.dir*FLIPPER.length*.7,f.y+.39,0,-3);
    e.contactSegment(b,f.x,f.y,f.tx,f.ty,FLIPPER.radius,{w:FLIPPER.riseSpeed*f.dir,dir:f.dir,active:true});
    assert.ok(b.vy>10);shots.push(b);
  }
  assert.ok(Math.abs(shots[0].vy-shots[1].vy)<1e-10);assert.ok(Math.abs(shots[0].vx+shots[1].vx)<1e-10);
  const e=new Pinball(),f=flipper('left',0),b=ball(f.x+FLIPPER.length*.15,f.y+.39,0,-3);
  e.contactSegment(b,f.x,f.y,f.tx,f.ty,FLIPPER.radius,{w:FLIPPER.riseSpeed,dir:1,active:true});
  assert.ok(b.vy<shots[0].vy);
});
