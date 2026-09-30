import {Pinball,DT} from './physics.js';
import {createTable} from './table.js';
const $=id=>document.getElementById(id),format=n=>Math.floor(n).toLocaleString('en-US');
const stored=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
const persist=(key,value)=>{try{localStorage.setItem(key,String(value));}catch{/* Private browsing still allows play. */}};
let best=Number(stored('dragonkeep.best','0'))||0,soundOn=stored('dragonkeep.sound','1')==='1',audio=null,view=null,toastTimer=0,panel='intro',chargeStart=null,chargePower=0,frame=0;
const tune={bumper:[740],target:[420,630],launch:[240,420,660],ramp:[392,494,587,784],gateOpen:[330,440,660],dragonWake:[165,220,330,440],challengeWon:[523,659,784,1046],lock:[392,587],multiball:[262,330,392,523,784],jackpot:[523,659,784,1046],drain:[220,165,110],save:[660,880],skillShot:[587,784,1175],multiplier:[440,660,880]};
function unlockAudio(){try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function play(type){if(!audio||!soundOn||!tune[type])return;const now=audio.currentTime;for(const [i,freq]of tune[type].entries()){const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type==='dragonWake'?'triangle':'sine';osc.frequency.setValueAtTime(freq,now+i*.075);gain.gain.setValueAtTime(0,now+i*.075);gain.gain.linearRampToValueAtTime(.075,now+i*.075+.008);gain.gain.exponentialRampToValueAtTime(.001,now+i*.075+.2);osc.connect(gain);gain.connect(audio.destination);osc.start(now+i*.075);osc.stop(now+i*.075+.21);}}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1900);}
function event(e){play(e.type);switch(e.type){
  case 'score':if(engine.score>best){best=engine.score;persist('dragonkeep.best',best);}break;
  case 'bumper':view?.flashBumper(e.index);view?.effect(e.x,e.y);break;
  case 'target':view?.effect(e.x,e.y,0xb39ae4);break;
  case 'gateOpen':toast('城門開啟 · 點亮三座塔樓');break;
  case 'dragonWake':toast('巨龍甦醒 · 接受天空橋考驗');break;
  case 'challengeStep':toast('命中！下一條路線已點亮');break;
  case 'challengeWon':toast('考驗完成 · 龍之寶庫開放');view?.effect(0,16.5,0xf2d097);break;
  case 'challengeExpired':toast('考驗結束 · 射入城門再次挑戰');break;
  case 'multiplier':toast(`符文集齊 · 得分 ×${e.value}`);break;
  case 'ramp':toast(e.combo>1?`${e.combo} 連擊 · +${format((1000+Math.min(6,e.combo-1)*500)*engine.multiplier)}`:'天空橋 · +'+format(1000*engine.multiplier));break;
  case 'lock':toast(`寶珠已鎖定 ${e.count} / 3`);break;
  case 'multiball':toast('寶庫開啟 · 三球模式！');view?.effect(0,16.5,0xf2d097);break;
  case 'multiballEnd':toast('三球模式結束 · 再次喚醒巨龍');break;
  case 'jackpot':toast('寶庫大獎 · +'+format(5000*engine.multiplier));view?.effect(0,16.5,0xf2d097);break;
  case 'save':toast('魔法護球 · 銀球回歸');break;
  case 'skillShot':toast('技巧發射 · +'+format(2000*engine.multiplier));break;
  case 'drain':toast(e.bonus?`本球獎勵 +${format(e.bonus)}`:'下一顆球 · 再接再厲');break;
  case 'gameOver':best=Math.max(best,engine.score);persist('dragonkeep.best',best);releaseAll();showResult();break;
  case 'ready':chargeStart=null;break;
}updateHUD();}
const engine=new Pinball(event);
function updateHUD(){const q=engine.quest();$('score').textContent=format(engine.score).padStart(7,'0');$('best').textContent=format(best);$('balls').textContent=Array.from({length:3},(_,i)=>i<engine.lives?'●':'○').join(' ');$('multiplier').textContent='×'+engine.multiplier;$('quest').textContent=q.text;$('quest-progress').textContent=q.progress;$('mode').textContent=q.mode;
  const ready=engine.balls.some(b=>b.mode==='launcher');$('launch').disabled=!ready||engine.state!=='playing';$('launch-symbol').textContent=ready?'↑':'✦';$('launch-text').textContent=ready?'長按發射':engine.multiball?'三球模式':'遊戲中';$('save').textContent=ready?'長按蓄力 · 放開發射':engine.time<engine.saveUntil?`護球 ${Math.ceil(engine.saveUntil-engine.time)}s`:'守住銀球';$('pause').disabled=engine.state==='idle'||engine.state==='over';}
function soundButton(){$('sound').textContent=soundOn?'♫':'♪';$('sound').style.opacity=soundOn?'1':'.5';$('sound').setAttribute('aria-label',soundOn?'關閉音效':'開啟音效');}
soundButton();$('sound').addEventListener('click',()=>{unlockAudio();soundOn=!soundOn;persist('dragonkeep.sound',soundOn?'1':'0');soundButton();if(soundOn)play('target');});
const pointers={left:new Set(),right:new Set()},keys={left:false,right:false};
function refreshInput(side){const down=pointers[side].size>0||keys[side];engine.setInput(side,down);$(side).classList.toggle('pressed',down);}
for(const side of ['left','right']){const btn=$(side);btn.addEventListener('pointerdown',e=>{e.preventDefault();if(engine.state!=='playing')return;unlockAudio();btn.setPointerCapture(e.pointerId);pointers[side].add(e.pointerId);refreshInput(side);});for(const name of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(name,e=>{pointers[side].delete(e.pointerId);refreshInput(side);});}
function beginCharge(){if(engine.state!=='playing'||!engine.balls.some(b=>b.mode==='launcher')||chargeStart!==null)return;unlockAudio();chargeStart=performance.now();$('charge').classList.add('active');$('launch').classList.add('pressed');}
function endCharge(cancel=false){if(chargeStart===null)return;const power=Math.min(1,Math.max(.12,(performance.now()-chargeStart)/1200));chargeStart=null;$('charge').classList.remove('active');$('launch').classList.remove('pressed');if(!cancel)engine.launch(power);updateHUD();}
$('launch').addEventListener('pointerdown',e=>{e.preventDefault();$('launch').setPointerCapture(e.pointerId);beginCharge();});$('launch').addEventListener('pointerup',()=>endCharge());$('launch').addEventListener('pointercancel',()=>endCharge(true));$('launch').addEventListener('lostpointercapture',()=>endCharge(true));
function releaseAll(){for(const s of ['left','right']){pointers[s].clear();keys[s]=false;refreshInput(s);}endCharge(true);}
document.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Space','KeyA','KeyD','KeyP','Escape'].includes(e.code))e.preventDefault();if(e.repeat)return;const side=['KeyA','ArrowLeft'].includes(e.code)?'left':['KeyD','ArrowRight'].includes(e.code)?'right':null;if(side&&engine.state==='playing'){keys[side]=true;refreshInput(side);unlockAudio();}if(e.code==='Space')beginCharge();if(['KeyP','Escape'].includes(e.code)){if(engine.state==='playing')showPause();else if(engine.state==='paused'&&panel==='pause')resume();}});
document.addEventListener('keyup',e=>{const side=['KeyA','ArrowLeft'].includes(e.code)?'left':['KeyD','ArrowRight'].includes(e.code)?'right':null;if(side){keys[side]=false;refreshInput(side);}if(e.code==='Space')endCharge();});
function modal(kicker,title,subtitle,html,primary,secondary=''){$('modal-kicker').textContent=kicker;$('modal-title').textContent=title;$('modal-subtitle').textContent=subtitle;$('modal-content').innerHTML=html;$('primary').textContent=primary;$('secondary').textContent=secondary;$('secondary').hidden=!secondary;$('overlay').classList.remove('hidden');}
function start(){releaseAll();unlockAudio();engine.start();panel='';$('overlay').classList.add('hidden');play('gateOpen');updateHUD();}
function resume(){releaseAll();engine.resume();panel='';$('overlay').classList.add('hidden');updateHUD();}
function showPause(){if(engine.state!=='playing')return;releaseAll();engine.pause();panel='pause';modal('TAKE A BREATH','城堡暫歇','銀球正在等待你的歸來。',`<div class="result-score">${format(engine.score)}</div><p>回來後接續目前的球與任務。</p>`,'繼續挑戰','重新開始');}
function showResult(){panel='result';modal('THE ADVENTURE CONTINUES',engine.score>=best&&engine.score>0?'個人最佳！':'本次冒險結束','下一次，讓巨龍記住你的名字。',`<div class="result-score">${format(engine.score)}</div><p>個人最高分 ${format(best)}</p><div class="result-grid"><span>天空橋<strong>${engine.rampCount}</strong></span><span>最佳連擊<strong>${engine.bestCombo}</strong></span><span>龍的考驗<strong>${engine.challengeWins}</strong></span></div>`,'再挑戰一次');}
let helpReturn='intro';
function showIntro(){panel='intro';modal('A FANTASY PINBALL ADVENTURE','龍堡彈珠台','一顆銀球，一座甦醒的城堡。','<div class="intro-route"><span>開城門</span><i>→</i><span>喚醒龍</span><i>→</i><span>奪寶庫</span></div><p class="instruction">長按中央按鈕蓄力，放開發射。<br>左右拇指控制擋板，守住每一顆球。</p><div class="game-meta"><span>3 顆球</span><span>技巧連擊</span><span>三球模式</span></div>','進入城堡 →');}
$('help').addEventListener('click',()=>{helpReturn=engine.state==='playing'?'playing':panel;if(engine.state==='playing'){releaseAll();engine.pause();}panel='help';modal('HOW TO PLAY','城堡指南','選好路線，再出手。',`<ol class="help-list"><li><b>發射：</b>長按中央按鈕蓄力，放開發射。約七成力道可取得技巧發射獎勵。</li><li><b>擋板：</b>左右按鈕可同時按住。電腦使用 A／D 或方向鍵，空白鍵發射。</li><li><b>甦醒：</b>打中左右盾牌，再完成左右天空橋與中央城門，喚醒巨龍。</li><li><b>考驗：</b>依序完成左軌道、右軌道、中央城門。命中後會增加時間。</li><li><b>寶庫：</b>射入城門鎖定三顆球，釋放三球模式。再射入城門取得大獎。</li><li><b>加分：</b>集齊三枚紫色符文提高倍率，8 秒內連續完成軌道可連擊。每局 3 球，發射後有短暫護球。</li></ol>`,'了解，返回');});
$('primary').addEventListener('click',()=>{if(panel==='pause')resume();else if(panel==='help'){if(helpReturn==='playing')resume();else if(helpReturn==='pause'){engine.resume();showPause();}else if(helpReturn==='result')showResult();else showIntro();}else start();});
$('secondary').addEventListener('click',start);$('pause').addEventListener('click',showPause);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&engine.state==='playing')showPause();});window.addEventListener('blur',()=>{if(engine.state==='playing')showPause();else releaseAll();});
// Rendering and simulation are independent: frame rate never changes collision timing.
let last=0,accumulator=0;
function loop(nowMs){const now=nowMs/1000,delta=Math.min(.1,Math.max(0,now-last));last=now;if(engine.state==='playing'){accumulator+=delta;while(accumulator>=DT){engine.step(DT);accumulator-=DT;if(engine.state!=='playing'){accumulator=0;break;}}}else accumulator=0;
  if(chargeStart!==null){chargePower=Math.min(1,(nowMs-chargeStart)/1200);$('charge-fill').style.width=chargePower*100+'%';}
  if(frame++%6===0)updateHUD();view?.animate(engine,now);requestAnimationFrame(loop);
}
try{view=createTable($('table'));view.resize();new ResizeObserver(()=>view.resize()).observe($('arena'));$('loading').remove();requestAnimationFrame(loop);updateHUD();}catch(err){console.error(err);$('loading').innerHTML='<div class="error">無法啟動 3D 畫面。<br>請使用支援 WebGL 2 的新版 Safari、Chrome 或 Edge，並確認硬體加速已開啟。<br><a href="./">重新載入</a></div>';$('primary').disabled=true;$('modal-subtitle').textContent='這個裝置目前無法啟動 3D 畫面。';}
if(new URLSearchParams(location.search).get('debug')==='1')window.__pinball={engine,view};
