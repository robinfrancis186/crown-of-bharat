import * as Rules from './rules.js';
import { GameUI } from './ui.js';
import { KingdomView } from './view.js';
import { loadSave,storeSave,decodeSave,encodeSave } from './storage.js';
import { GameAudio } from './audio.js';
import { OnlineClient } from './net.js';

let storage;try{storage=localStorage;}catch{storage=null;}
const loaded=loadSave(storage);
let state=loaded.state,storageAvailable=loaded.available;
let preferences={};try{preferences=JSON.parse(storage?.getItem('monsoon.preferences')||'{}')||{};}catch{}
let quality=['low','balanced','ultra'].includes(preferences.quality)?preferences.quality:'balanced';
let mode='home',battle=null,selectedId=null,placing=null,panel=null,selectedTroop='guard',selectedSpell=null,ready=false,settled=false,soundEnabled=preferences.sound===true;
let upgradeTarget=null,finishTarget=null,attackTab='campaign',wallStart=null,preview=null;
const portraitQuery=matchMedia('(orientation: portrait) and (max-width: 1024px)');
let portraitBlocked=portraitQuery.matches;
let fps=60,frameCount=0,fpsTime=0;
const audio=new GameAudio();audio.setEnabled(soundEnabled);
let lastHeardEvent=0;
const net=new OnlineClient(storage);
// Everything the Online panel shows. Nothing here is written into the saved kingdom.
const online={registered:net.registered,playerId:net.playerId,name:null,trophies:0,publishedAt:null,opponent:null,leaderboard:[],log:[],busy:null,error:null};
async function onlineTask(label,run){
  if(online.busy)return {ok:false,reason:'Another online request is still running.'};
  online.busy=label;online.error=null;refresh();
  try{const result=await run();if(!result.ok){online.error=result.reason;}return result;}
  finally{online.busy=null;refresh();}
}
async function refreshOnline(){
  if(!net.registered)return;
  const [board,log]=await Promise.all([net.leaderboard(20),net.defenseLog()]);
  if(board.ok)online.leaderboard=board.entries;
  if(log.ok)online.log=log.entries;
  const me=online.leaderboard.find(e=>e.player_id===net.playerId);
  if(me){online.trophies=me.trophies;online.name=me.name;}
}
const save=()=>{try{storeSave(storage,state);}catch{if(storageAvailable)ui.toast('Storage is unavailable. Export a backup in Settings to keep your progress.');storageAvailable=false;}};
const savePreferences=()=>{try{storage?.setItem('monsoon.preferences',JSON.stringify({...preferences,quality,sound:soundEnabled}));}catch{}};
function downloadSave(value,name='kingdom-backup'){
  const url=URL.createObjectURL(new Blob([encodeSave(value)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${name}-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const sound=(kind='tap',options)=>audio.play(kind,options);
// Battle events already carry a battlefield position, so combat is heard left to right.
const eventCue={hit:'hit',arrow:'arrow',cannon:'cannon',destroy:'destroy',heal:'heal',lightning:'lightning',freeze:'freeze',rage:'rage'};
function hearBattle(b){
  if(!soundEnabled||!b?.events?.length)return;
  for(const event of b.events){
    if(event.id<=lastHeardEvent)continue;
    lastHeardEvent=event.id;
    const cue=eventCue[event.type];
    if(cue)sound(cue,{pan:(event.x/Rules.GRID-.5)*1.3,intensity:event.type==='destroy'?1.3:1});
  }
}
function attempt(result,message){
  if(!result.ok){ui.toast(result.reason);return false;}
  save();sound(message?.includes('collected')?'collect':message?.includes('Upgrade')||message?.includes('improved')||message?.includes('forged')?'upgrade':'build');if(message)ui.toast(message);
  if(mode==='home')view.syncBuildings(state.buildings);refresh();return true;
}
function placementCheck(){
  if(!placing)return {ok:false};
  if(!placing.line){
    const check=Rules.canPlace(state,placing.type,placing.x,placing.z,placing.id);if(!check.ok||placing.id)return check;
    const c=Rules.CATALOG[placing.type],cap=Rules.capacity(state);
    if(cap.busy>=cap.builders)return {ok:false,reason:'All builders are busy. Wait for a project to finish.'};
    const missing=Object.entries(c.cost).filter(([key,n])=>state.resources[key]<n).map(([key,n])=>`${n-state.resources[key]} ${key}`);
    return missing.length?{ok:false,reason:`Need ${missing.join(' and ')} more.`}:check;
  }
  for(const cell of placing.line.cells){const p=Rules.canPlace(state,'wall',cell.x,cell.z);if(!p.ok)return p;}
  const n=placing.line.cells.length,cap=Rules.capacity(state);
  if(state.buildings.filter(b=>b.type==='wall').length+n>Rules.CATALOG.wall.limit)return {ok:false,reason:'This line exceeds the rampart limit.'};
  if(cap.busy>=cap.builders)return {ok:false,reason:'A free builder is needed to raise the ramparts.'};
  if(Object.entries(Rules.CATALOG.wall.cost).some(([k,v])=>state.resources[k]<v*n))return {ok:false,reason:'You need more resources for this wall line.'};
  return {ok:true};
}
function objective(){
  if(Rules.tutorialState(state))return null;
  if(preferences.hideObjective)return null;
  const cap=Rules.capacity(state),fort=state.buildings.find(b=>b.type==='fort');
  if(state.totalRaids===0&&cap.used<cap.army)return {title:'Prepare your first army',detail:'Fill your camp for free, then review your first opponent.',action:'openPanel',value:'army'};
  if(state.totalRaids>0&&fort?.level===1&&!fort.readyAt)return {title:'Grow your capital',detail:'Review the next Taj level to unlock stronger buildings.',action:'openUpgrade',value:fort.id};
  const next=Rules.RAIDS.find(r=>!state.raidStars[r.id]);
  return next?{title:`Next: ${next.name}`,detail:'Review defenses, army and rewards before attacking.',action:'startRaid',value:next.id}:{title:'Put your defenses to the test',detail:'Practice against your village. Your whole army returns.',action:'startPractice'};
}
function requestBattle(kind,id){
  if(mode!=='home')return;
  const result=Rules.previewAttack(state,kind,id);
  if(!result.ok){ui.toast(result.reason);return;}
  view.ensureBuildingModels(result.battle.buildings).catch(()=>{});preview={kind,id,battle:result.battle};clearPlacement();selectedId=null;view.setSelection(null);panel='briefing';refresh();
}
function refresh(){
  const check=placementCheck(),cap=Rules.capacity(state);
  if(view){view.inputEnabled=!panel&&!settled&&!portraitBlocked;view.setSpellAim?.(!panel&&!settled&&!portraitBlocked?Rules.SPELLS[selectedSpell]:null);}
  const collectable=state.buildings.some(b=>{const resource=Rules.CATALOG[b.type].production?.resource;return b.stored>=1&&resource&&(resource==='gems'?state.gems<999999:state.resources[resource]<cap.storage[resource]);});
  ui.render({mode,state,preview,online,tutorial:mode==='home'?Rules.tutorialState(state):null,objective:objective(),collectable,hasArmyRecipe:!!preferences.armyRecipe,catalog:Rules.CATALOG,units:Rules.UNITS,heroes:Rules.HEROES,raids:Rules.RAIDS,ranked:Rules.getRanked(state),capacity:Rules.capacity(state),selectedBuilding:state.buildings.find(b=>b.id===selectedId),placing,placementValid:check.ok,placementReason:check.reason,battle,selectedTroop,selectedSpell,spells:Rules.SPELLS,quality,panel,soundEnabled,upgradeTarget,finishTarget,attackTab,wallStart,stats:{fps:Math.round(fps)}});
}
function startPlacing(type,id){
  preview=null;panel=null;selectedId=null;wallStart=null;
  const old=state.buildings.find(b=>b.id===id);
  placing={type,x:old?.x??2,z:old?.z??2,...(id?{id}:{})};
  if(!old){outer:for(let z=4;z<23;z++)for(let x=3;x<23;x++)if(Rules.canPlace(state,type,x,z).ok){placing.x=x;placing.z=z;break outer;}}
  if(type==='wall'&&!id)updateWall(placing.x,placing.z);
  view.setSelection(null);view.setGhost(placing,placementCheck().ok);refresh();
}
function updateWall(x,z){
  const first=wallStart||{x,z};
  if(Math.abs(x-first.x)>=Math.abs(z-first.z))z=first.z;else x=first.x;
  const cells=[];for(let zz=Math.min(z,first.z);zz<=Math.max(z,first.z);zz++)for(let xx=Math.min(x,first.x);xx<=Math.max(x,first.x);xx++)cells.push({x:xx,z:zz});
  placing.x=first.x;placing.z=first.z;placing.line={locked:placing.line?.locked??false,x1:first.x,z1:first.z,x2:x,z2:z,cells,cost:Object.fromEntries(Object.entries(Rules.CATALOG.wall.cost).map(([k,v])=>[k,v*cells.length]))};
}
function clearPlacement(){placing=null;wallStart=null;view.setGhost(null);}
function returnHome(){preview=null;selectedSpell=null;mode='home';battle=null;settled=false;selectedId=null;panel=null;view.setBoard(state.buildings,'home');view.setHomeHero(state.activeHero);refresh();}
function enterBattle(result){
  if(!result.ok){ui.toast(result.reason);return;}
  preview=null;battle=result.battle;selectedSpell=null;save();mode='battle';settled=false;panel=null;clearPlacement();selectedId=null;
  selectedTroop=Object.keys(battle.reserve).find(k=>battle.reserve[k])||(battle.hero?'hero':'guard');
  lastHeardEvent=0;view.setBoard(battle.buildings,'battle');refresh();sound('hero');ui.toast('Select a warrior or hero, then tap the gold outer band to deploy.');
}
function settle(){
  if(settled)return;settled=true;
  const result=Rules.finishRaid(state,battle);save();refresh();ui.showResult(result);sound(result.victory?'victory':'defeat');
  if(result.online&&result.opponentId&&net.registered)reportOnline(result);
}
// The defender is offline, so the server moves both sides' trophies from this report.
async function reportOnline(result){
  const report=await net.reportAttack(result.opponentId,result.stars,Math.round(result.destruction));
  if(report.ok){
    result.trophyDelta=report.trophy_delta;result.trophies=report.attacker_trophies;
    online.trophies=report.attacker_trophies;online.opponent=null;
  }else result.trophyError=report.reason;
  if(ui.result)ui.showResult(result);
  refreshOnline().catch(()=>{});
}
const actions={
  selectBuilding(id){if(mode!=='home'||placing)return;selectedId=id;panel=null;view.setSelection(state.buildings.find(b=>b.id===id));sound('select');refresh();},
  selectBuild(type){if(mode==='home'&&Rules.CATALOG[type])startPlacing(type);},
  startWallLine(){if(mode==='home')startPlacing('wall');},
  cancelPlacement(){clearPlacement();refresh();},
  confirmPlacement(){
    if(!placing)return;const p=placing;
    const result=p.line?Rules.placeWallLine(state,p.line.x1,p.line.z1,p.line.x2,p.line.z2):p.id?Rules.moveBuilding(state,p.id,p.x,p.z):Rules.placeBuilding(state,p.type,p.x,p.z);
    if(attempt(result,p.line?`${p.line.cells.length} ramparts raised.`:p.id?'Building moved.':'Construction started.')){clearPlacement();selectedId=p.id??result.building?.id;view.setSelection(state.buildings.find(b=>b.id===selectedId));refresh();}
  },
  openUpgrade(id){const b=state.buildings.find(b=>b.id===id);if(b)view.preloadBuilding(b.type,b.level+1).catch(()=>{});upgradeTarget=id;panel='upgrade';refresh();},
  upgrade(id){actions.openUpgrade(id);},
  confirmUpgrade(id){if(attempt(Rules.upgradeBuilding(state,id),'Upgrade started.')){panel=null;refresh();}},
  finish(kind,id){finishTarget={kind,id};panel='finish';refresh();},
  confirmFinish(kind,id){if(!finishTarget||finishTarget.kind!==kind||finishTarget.id!==id)return;if(attempt(Rules.finishWithGems(state,kind,id),'Work completed.')){finishTarget=null;panel=kind==='research'?'research':kind==='hero'?'heroes':null;refresh();}},
  move(id){const b=state.buildings.find(b=>b.id===id);if(b)startPlacing(b.type,id);},
  followObjective(){const goal=objective();if(goal)actions[goal.action]?.(goal.value);},
  dismissObjective(){preferences.hideObjective=true;savePreferences();refresh();},
  collectAll(){const before=new Map(state.buildings.map(b=>[b.id,b.stored]));const result=Rules.collectAll(state);if(attempt(result)){for(const b of state.buildings){const resource=Rules.CATALOG[b.type].production?.resource,amount=(before.get(b.id)||0)-b.stored;if(resource&&amount>0)view.collectionFeedback(b,{[resource]:amount});}ui.toast(Object.entries(result.amounts).filter(([,n])=>n>0).map(([k,n])=>`${n} ${k}`).join(' · ')+' collected.');sound('collect');}},
  saveArmyRecipe(){preferences.armyRecipe=Rules.armyRecipe(state);savePreferences();refresh();ui.toast('Army composition saved on this device.');},
  loadArmyRecipe(){attempt(Rules.applyArmyRecipe(state,preferences.armyRecipe),'Saved army restored.');},
  clearArmy(){attempt(Rules.applyArmyRecipe(state,{}),'Army cleared. Camp space is available.');},
  collect(id){const result=Rules.collect(state,id);if(attempt(result)){view.collectionFeedback(state.buildings.find(b=>b.id===id),{[result.resource]:result.amount});ui.toast(`${result.amount} ${result.resource} collected.`);sound('collect');}},
  train(type,count=1){attempt(Rules.train(state,type,count),`${Rules.UNITS[type].name} ready.`);},
  removeTroop(type,count=1){attempt(Rules.removeTroop(state,type,count));},
  quickTrain(){attempt(Rules.quickTrain(state),'Your army is ready.');},
  research(type){attempt(Rules.researchTroop(state,type),'Research started at the Royal Workshop.');},
  upgradeHero(id){attempt(Rules.upgradeHero(state,id),'Hero training started.');},
  selectHero(id){if(attempt(Rules.selectHero(state,id))){view.setHomeHero(id);ui.toast(`${Rules.HEROES[id].name} leads your next attack.`);}},
  selectHeroDeploy(){if(battle?.hero&&!battle.hero.deployed){selectedTroop='hero';refresh();}},
  heroAbility(){if(!battle)return;if(attempt(Rules.heroAbility(battle),'Hero ability activated.'))sound('hero');},
  buyBuilder(){attempt(Rules.buyBuilder(state),'A new builder has joined your kingdom.');},
  forgeEquipment(id){
    const before=Rules.equipmentInfo(state,id);
    if(attempt(Rules.forgeEquipment(state,id)))ui.toast(before.owned?`${Rules.EQUIPMENT[id].name} improved to level ${before.nextLevel}.`:`${Rules.EQUIPMENT[id].name} forged and equipped.`);
  },
  equipItem(heroId,slotIndex,itemId){
    if(attempt(Rules.equipItem(state,heroId,slotIndex,itemId)))ui.toast(itemId?`${Rules.EQUIPMENT[itemId].name} equipped.`:'Slot emptied.');
  },
  tutorialAction(){
    const step=Rules.tutorialState(state);if(!step)return;
    if(step.acknowledge)Rules.acknowledgeTutorial(state,step.id);
    if(step.action)actions[step.action.type]?.(step.action.value);
    save();refresh();
  },
  skipTutorial(){if(attempt(Rules.skipTutorial(state)))ui.toast('Guide dismissed. Reopen it any time from the field guide.');},
  restartTutorial(){state.tutorial={acknowledged:[],skipped:false};save();panel=null;refresh();ui.toast('The guide will walk you through the next steps.');},
  openPanel(name){if(mode!=='home')return;preview=null;clearPlacement();selectedId=null;view.setSelection(null);panel=name==='map'?'attack':name;sound();refresh();},
  closePanel(){preview=null;panel=null;upgradeTarget=null;finishTarget=null;if(settled)returnHome();else refresh();},
  setAttackTab(tab){attackTab=['ranked','online'].includes(tab)?tab:'campaign';panel='attack';refresh();if(tab==='online'&&net.registered&&!online.leaderboard.length)onlineTask('Loading standings…',async()=>{await refreshOnline();return {ok:true};});},
  startRaid(id){requestBattle('campaign',id);},
  startRanked(){requestBattle('ranked');},
  startPractice(){requestBattle('practice');},
  async joinOnline(){
    const result=await onlineTask('Joining online play…',()=>net.join(state.name));
    if(!result.ok){ui.toast(result.reason);return;}
    online.registered=true;online.playerId=net.playerId;online.trophies=result.trophies;online.name=state.name;
    await onlineTask('Publishing your village…',async()=>{const published=await actions.publishVillage(true);await refreshOnline();return published;});
    ui.toast('You are online. Your village is published for other players to attack.');
  },
  async publishVillage(quiet){
    const layout=Rules.publishableLayout(state);
    if(!layout.ok){ui.toast(layout.reason);return layout;}
    const send=()=>net.publish(state.name,layout.layout,layout.tajLevel);
    const result=quiet?await send():await onlineTask('Publishing your village…',send);
    if(result.ok){online.publishedAt=result.published_at||new Date().toISOString();if(result.trophies!=null)online.trophies=result.trophies;if(!quiet)ui.toast('Your village is published. Other players can attack this layout.');}
    else if(!quiet)ui.toast(result.reason);
    return result;
  },
  async findOpponent(){
    const result=await onlineTask('Searching for a kingdom…',()=>net.findOpponent());
    if(!result.ok){ui.toast(result.reason);return;}
    online.opponent=result.opponent;refresh();
    actions.reviewOnline();
  },
  reviewOnline(){
    if(!online.opponent||mode!=='home')return;
    const result=Rules.startOnlineRaid(structuredClone(state),online.opponent);
    if(!result.ok){ui.toast(result.reason);online.error=result.reason;online.opponent=null;refresh();return;}
    view.ensureBuildingModels(result.battle.buildings).catch(()=>{});
    preview={kind:'online',id:online.opponent.player_id,battle:result.battle};
    clearPlacement();selectedId=null;view.setSelection(null);panel='briefing';refresh();
  },
  refreshOnline(){onlineTask('Refreshing standings…',async()=>{await refreshOnline();return {ok:true};});},
  leaveOnline(){net.forget();online.registered=false;online.playerId=null;online.opponent=null;online.leaderboard=[];online.log=[];online.publishedAt=null;online.trophies=0;refresh();ui.toast('This device has left online play. Your kingdom is unchanged.');},
  editArmyFromBriefing(){panel='army';refresh();},
  reviewBattle(){if(preview)requestBattle(preview.kind,preview.id);},
  confirmBattle(){if(!preview||mode!=='home')return;const p=preview;Rules.tickHome(state,Date.now());enterBattle(p.kind==='online'?Rules.startOnlineRaid(state,online.opponent):p.kind==='ranked'?Rules.startRanked(state):p.kind==='practice'?Rules.startPractice(state):Rules.createBattle(state,p.id));},
  selectTroop(type){selectedSpell=null;selectedTroop=type;sound();refresh();},
  selectSpell(id){selectedSpell=id&&Rules.SPELLS[id]&&battle?.spells[id]>0?id:null;refresh();},
  retreat(){if(battle&&!settled){panel='retreat';refresh();}},
  confirmRetreat(){if(panel==='retreat'&&battle&&!settled){panel=null;settle();}},
  cancelRetreat(){panel=null;refresh();},
  castRain(){if(battle)attempt(Rules.castRain(battle),'The monsoon restores your warriors.');},
  setCamera(action){view.cameraAction(action);},
  saveName(name){if(!name.trim()){ui.toast('Give your kingdom a name.');return;}state.name=name.trim().slice(0,28);save();refresh();ui.toast('Your kingdom has a new name.');if(net.registered)actions.publishVillage(true).catch(()=>{});},
  toggleSound(){soundEnabled=!soundEnabled;audio.setEnabled(soundEnabled);savePreferences();sound('select');refresh();},
  setQuality(value){if(!['low','balanced','ultra'].includes(value))return;quality=value;view.setQuality(quality);savePreferences();refresh();},
  exportSave(){downloadSave(state);ui.toast('Kingdom backup downloaded.');},
  importSave(){
    if(mode!=='home')return;
    const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
    input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{if(file.size>2_000_000)throw Error('Choose a backup smaller than 2 MB.');const next=decodeSave(await file.text());downloadSave(state,'kingdom-before-import');state=next;save();returnHome();ui.toast('Backup restored. Your previous kingdom was downloaded for safekeeping.');}catch(error){ui.toast(error instanceof SyntaxError?'That file is not valid JSON. Your kingdom is unchanged.':error.message);}};input.click();
  },
};
const ui=new GameUI(actions);let view,loadFailed=false;
function tapWorld(hit){
  if(!ready||panel||settled||portraitBlocked)return;
  if(mode==='battle'){
    if(selectedSpell){const result=Rules.castSpell(battle,selectedSpell,hit.x+.5,hit.z+.5);if(attempt(result,'Spell cast.'))selectedSpell=null;refresh();return;}
    const result=selectedTroop==='hero'?Rules.deployHero(battle,hit.x+.5,hit.z+.5):Rules.deploy(battle,selectedTroop,hit.x+.5,hit.z+.5);
    if(result.ok){save();sound('deploy',{pan:(hit.x/Rules.GRID-.5)*1.3});if(selectedTroop==='hero'||!battle.reserve[selectedTroop])selectedTroop=Object.keys(battle.reserve).find(k=>battle.reserve[k])||(battle.hero&&!battle.hero.deployed?'hero':null);refresh();}
    else ui.toast(result.reason);return;
  }
  if(placing){if(placing.line){const anchored=!!wallStart;if(!wallStart)wallStart={x:hit.x,z:hit.z};updateWall(hit.x,hit.z);placing.line.locked=anchored;}else{placing.x=hit.x;placing.z=hit.z;}view.setGhost(placing,placementCheck().ok);refresh();}
  else actions.selectBuilding(hit.id||null);
}
try{
  view=new KingdomView(document.getElementById('world'),tapWorld);view.setQuality(quality);
  await view.load((p,t)=>{if(!loadFailed)ui.setLoading(p,t);},state.buildings);view.setBoard(state.buildings,'home');view.setHomeHero(state.activeHero);ready=true;ui.setLoading(1,'Welcome to your kingdom');save();refresh();
  if(net.registered)refreshOnline().then(refresh).catch(()=>{});
  if(loaded.recovered)ui.toast('Recovered your kingdom from the last valid backup.');
  if(loaded.corrupt)ui.toast('The saved data was damaged. Import an exported backup in Settings.');
  if(!storageAvailable)ui.toast('Browser storage is disabled. Progress will last for this session only.');
}catch(error){loadFailed=true;console.error(error);const label=document.getElementById('loading-label');label.textContent='The valley could not load. Your saved kingdom is safe.';const retry=document.createElement('button');retry.textContent='Retry loading';retry.className='button primary loading-retry';retry.onclick=()=>location.reload();label.after(retry);throw error;}
document.getElementById('world').addEventListener('pointermove',event=>{if(portraitBlocked)return;if(selectedSpell&&!panel&&!event.buttons){const hit=view.pick(event.clientX,event.clientY);view.setSpellAim?.(Rules.SPELLS[selectedSpell],hit.x+.5,hit.z+.5);}if(placing?.line&&wallStart&&!placing.line.locked&&!event.buttons&&event.pointerType==='mouse'){const hit=view.pick(event.clientX,event.clientY);const end=placing.line;if(hit.x!==end.x2||hit.z!==end.z2){updateWall(hit.x,hit.z);view.setGhost(placing,placementCheck().ok);refresh();}}});
document.addEventListener('keydown',event=>{if(!ready||panel||portraitBlocked||/INPUT|TEXTAREA|BUTTON/.test(document.activeElement?.tagName))return;if(placing&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(event.key)){event.preventDefault();if(event.key==='Enter'){actions.confirmPlacement();return;}const p=placing.line?{x:placing.line.x2,z:placing.line.z2}:placing;const dx=Number(event.key==='ArrowRight')-Number(event.key==='ArrowLeft'),dz=Number(event.key==='ArrowDown')-Number(event.key==='ArrowUp');if(placing.line)updateWall(p.x+dx,p.z+dz);else{placing.x+=dx;placing.z+=dz;}view.setGhost(placing,placementCheck().ok);refresh();}});
let last=performance.now(),accumulator=0,uiTimer=0,homeTimer=0,saveTimer=0;
function frame(now){
  const elapsed=(now-last)/1000,dt=Math.min(elapsed,.1);last=now;frameCount++;fpsTime+=elapsed;
  if(fpsTime>=1){fps=frameCount/fpsTime;frameCount=0;fpsTime=0;}
  if(mode==='battle'&&!settled&&panel!=='retreat'&&!portraitBlocked&&!document.hidden){accumulator+=dt;while(accumulator>=1/30){Rules.tickBattle(battle,1/30);accumulator-=1/30;if(battle.status!=='active'){settle();accumulator=0;break;}}view.updateBattle(battle,dt);hearBattle(battle);}else accumulator=0;
  homeTimer+=dt;saveTimer+=dt;uiTimer+=dt;
  if(homeTimer>=.5){Rules.tickHome(state,Date.now());homeTimer=0;if(mode==='home'){view.syncBuildings(state.buildings);view.setHomeHero(state.activeHero);}}
  if(saveTimer>=5){save();saveTimer=0;}if(uiTimer>=.15){refresh();uiTimer=0;}if(!portraitBlocked&&!document.hidden)view.render(dt);requestAnimationFrame(frame);
}
for(const type of ['pointerdown','keydown'])addEventListener(type,()=>audio.resume(),{passive:true});
document.getElementById('world').addEventListener('webglcontextlost',event=>{event.preventDefault();save();ready=false;const overlay=document.getElementById('loading');overlay.hidden=false;overlay.classList.remove('loaded');document.getElementById('loading-label').textContent='Graphics paused. Your kingdom is saved; restoring the scene…';});
document.getElementById('world').addEventListener('webglcontextrestored',()=>location.reload());
portraitQuery.addEventListener('change',e=>{portraitBlocked=e.matches;last=performance.now();accumulator=0;save();refresh();});
addEventListener('kingdom-asset-error',()=>ui.toast('An upgraded building could not load. Retrying shortly; your progress is safe.'));
requestAnimationFrame(frame);addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{save();last=performance.now();});
window.kingdom={get state(){return structuredClone(state);},get battle(){return battle?structuredClone(battle):null;},get stats(){return {fps:Math.round(fps),calls:view.renderer.info.render.calls,triangles:view.renderer.info.render.triangles,mode,loaded:ready,portraitBlocked,buildingModels:Object.keys(view.models).filter(k=>Object.keys(Rules.CATALOG).some(type=>k===type||k.startsWith(type+'_'))),pendingModels:view.modelLoads.size};},screenForCell:(x,z)=>view.screenForCell(x,z)};
