// Run with Playwright CLI run-code in a disposable named browser.
// Fixtures are scoped to that browser's localStorage; no application debug writes.
async page => {
  const base='http://localhost:5191/monsoon-kingdoms/', out='/Volumes/T7/ra.one the game/monsoon-kingdoms/output/playwright/';
  const report={passed:false,checks:[],loads:{},viewports:[],errors:[],failedRequests:[]};let stage='setup',requests=[];
  const check=(ok,message)=>{if(!ok)throw Error(message);report.checks.push(message);};
  const shot=name=>page.screenshot({path:out+`runtime-landscape-${name}.png`,animations:'disabled'});
  page.on('pageerror',e=>report.errors.push({stage,message:e.message}));
  page.on('console',m=>{if(m.type()==='error')report.errors.push({stage,message:m.text()});});
  page.on('request',r=>{const path=r.url().replace(/^https?:\/\/[^/]+/,'').split('?')[0];if(path.endsWith('.glb'))requests.push(path);});
  page.on('requestfailed',r=>report.failedRequests.push({stage,url:r.url(),reason:r.failure()?.errorText}));
  page.on('response',r=>{if(r.status()>=400)report.failedRequests.push({stage,url:r.url(),status:r.status()});});
  await page.route('**/*',route=>route.continue());
  await page.addInitScript(()=>{const fixture=sessionStorage.getItem('landscape-qa-pending');if(fixture){for(const k of ['monsoon.kingdoms.v1','monsoon.kingdoms.v1.backup','monsoon.preferences'])localStorage.removeItem(k);if(fixture!=='NEW')localStorage.setItem('monsoon.kingdoms.v1',fixture);sessionStorage.removeItem('landscape-qa-pending');}});
  const ready=async()=>{await page.waitForFunction(()=>window.kingdom?.stats.loaded&&window.kingdom.stats.pendingModels===0,{},{timeout:60000});await page.locator('#loading').waitFor({state:'hidden',timeout:60000});};
  const reloadFixture=async fixture=>{await page.evaluate(f=>sessionStorage.setItem('landscape-qa-pending',f),fixture||'NEW');requests=[];await page.reload();await ready();};
  const close=()=>page.locator('.panel-close').click();
  const state=()=>page.evaluate(()=>window.kingdom.state);
  const chooseBuilding=async type=>{
    await page.locator('#camera-tools [data-value="reset"]').click();
    const point=await page.evaluate(t=>{const b=window.kingdom.state.buildings.find(b=>b.type===t);return window.kingdom.screenForCell(b.x+b.w/2,b.z+b.h/2);},type);
    await page.mouse.click(point.x,point.y);
    await page.locator('#context-actions [data-action="openUpgrade"]').first().click();
  };
  try {
    await page.setViewportSize({width:932,height:430});await page.goto(base);await ready();
    stage='fresh-startup';await reloadFixture();await shot('checkpoint-fresh');
    report.loads.fresh={count:new Set(requests).size,paths:[...new Set(requests)],stats:await page.evaluate(()=>window.kingdom.stats)};
    check(report.loads.fresh.count===33,'Fresh kingdom requests exactly33 base GLBs');
    check(!requests.some(p=>p.includes('/levels/')),'Fresh kingdom does not preload evolution tiers');
    stage='high-level-fixture';const high=await page.evaluate(async()=>{const R=await import('./src/rules.js');const s=R.newGame();s.name='Landscape QA';s.buildings.push({id:'b900',type:'cannon',x:1,z:1,w:2,h:2,level:15,builtAt:Date.now(),readyAt:0,upgradingTo:0,stored:0});for(const b of s.buildings){b.level=15;b.readyAt=0;b.upgradingTo=0;}s.resources={coin:33000,grain:33000,wood:33000,iron:33000};s.gems=500;s.achievements.first_upgrade=true;return JSON.stringify(R.hydrate(s));});
    await reloadFixture(high);await shot('checkpoint-high15');const highState=await state();
    report.loads.high={count:new Set(requests).size,paths:[...new Set(requests)],stats:await page.evaluate(()=>window.kingdom.stats)};
    const expectedTypes=[...new Set(highState.buildings.map(b=>b.type))];
    check(report.loads.high.count===33+expectedTypes.length,'High-level save requests bases plus only its15 visible variants');
    check(requests.filter(p=>p.includes('/levels/')).every(p=>p.endsWith('/15.glb')),'High-level startup requests only tier15 variants');
    stage='max-level-ui';await chooseBuilding('fort');check(await page.locator('[data-action="confirmUpgrade"]').isDisabled(),'Level15 capital upgrade is disabled');check((await page.locator('.upgrade-hero').innerText()).includes('Maximum level'),'Capital UI displays maximum level15');
    await page.locator('[data-action="uiGallery"]').click();check(await page.locator('.evolution-level').count()===15,'Evolution gallery offers15 levels');await page.locator('.evolution-level').last().click();await page.locator('.evolution-preview img').evaluate(e=>e.decode());check((await page.locator('.evolution-preview img').getAttribute('src')).endsWith('/fort/15.png'),'Gallery displays actual level15 PNG');await shot('max15-gallery');await close();
    await chooseBuilding('farm');check(await page.locator('[data-action="confirmUpgrade"]').isDisabled(),'Level15 farm upgrade is disabled');await close();
    stage='five-landscape-viewports';
    for(const [width,height] of [[568,320],[667,375],[740,360],[844,390],[932,430]]){
      await page.setViewportSize({width,height});await page.locator('#camera-tools [data-value="reset"]').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      const baseline=await page.evaluate(()=>window.kingdom.screenForCell(12,12));
      await page.mouse.move(width*.53,height*.42);await page.mouse.down();await page.mouse.move(width*.53+45,height*.42+18,{steps:5});await page.mouse.up();
      const panned=await page.evaluate(()=>window.kingdom.screenForCell(12,12));check(Math.hypot(panned.x-baseline.x,panned.y-baseline.y)>5,`Canvas drag changes camera at${width}`);
      await page.locator('#camera-tools [data-value="reset"]').click();await page.waitForFunction(p=>{const a=window.kingdom.screenForCell(12,12);return Math.hypot(a.x-p.x,a.y-p.y)<1;},baseline);
      await shot(`home-${width}`);await page.locator('#home-actions [data-value="army"]').click();const add=await page.locator('.roster-add').first().boundingBox();const overflow=await page.locator('.panel-content').evaluate(e=>e.scrollWidth>e.clientWidth);check(add.width>=44&&add.height>=44&&add.y+add.height<=height,`First army44px action is visible at${width}`);check(!overflow,`No army panel overflow at${width}`);report.viewports.push({width,height,add,baseline,panned});await shot(`army-${width}`);await close();
    }
    stage='paid-upgrade';const farm3=await page.evaluate(async()=>{const R=await import('./src/rules.js');const s=window.kingdom.state;s.buildings.find(b=>b.type==='farm').level=3;s.lastTick=Date.now();return JSON.stringify(R.hydrate(s));});await reloadFixture(farm3);
    const before=await state(),farm=before.buildings.find(b=>b.type==='farm');const price=await page.evaluate(async id=>(await import('./src/rules.js')).upgradeInfo(window.kingdom.state,id).cost,farm.id);
    await chooseBuilding('farm');check((await page.locator('[data-action="confirmUpgrade"]').innerText()).includes('level4')||(await page.locator('[data-action="confirmUpgrade"]').innerText()).includes('level 4'),'Farm3 UI offers level4 upgrade');await page.locator('[data-action="confirmUpgrade"]').click();let after=await state();check(after.buildings.find(b=>b.id===farm.id).upgradingTo===4,'Paid farm upgrade starts target4');for(const k of Object.keys(price))check(after.resources[k]===before.resources[k]-price[k],`Upgrade charges exact${k} cost`);
    await page.locator('#home-hud [data-value="gems"]').first().click();await page.locator(`[data-action="finish"][data-value="building:${farm.id}"]`).click();const finish=await page.evaluate(async id=>(await import('./src/rules.js')).finishCost(window.kingdom.state,'building',id),farm.id);const gems=(await state()).gems;await page.locator('[data-action="confirmFinish"]').click();after=await state();check(after.gems===gems-finish.cost,'Gem finish charges displayed cost exactly once');check(after.buildings.find(b=>b.id===farm.id).level===4,'Gem finish completes farm level4');await page.waitForFunction(()=>window.kingdom.stats.buildingModels.includes('farm_4')&&window.kingdom.stats.pendingModels===0);await shot('farm4-finished');
    requests=[];await page.reload();await ready();check((await state()).buildings.find(b=>b.id===farm.id).level===4,'Farm4 persists after reload');check((await state()).gems===after.gems,'Gem balance persists after reload');check(await page.evaluate(()=>window.kingdom.stats.buildingModels.includes('farm_4')),'Reload loads actual farm_4 model');report.loads.upgraded={count:new Set(requests).size,paths:[...new Set(requests)],stats:await page.evaluate(()=>window.kingdom.stats)};
    stage='portrait-battle-pause';await page.locator('#home-actions [data-value="army"]').click();await page.locator('[data-action="uiArmyTools"]').click();await page.locator('[data-action="startPractice"]').click();await page.locator('[data-action="confirmBattle"]').click();await page.waitForFunction(()=>window.kingdom.battle?.elapsed>.3);const fingerprint=()=>page.evaluate(()=>JSON.stringify({name:window.kingdom.state.name,buildings:window.kingdom.state.buildings.map(b=>[b.id,b.level,b.readyAt]),gems:window.kingdom.state.gems,army:window.kingdom.state.army,raid:window.kingdom.state.activeRaid}));const beforeRotate=await fingerprint();
    await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>window.kingdom.stats.portraitBlocked);const paused=await page.evaluate(()=>window.kingdom.battle.elapsed);await page.waitForTimeout(1100);check((await page.evaluate(()=>window.kingdom.battle.elapsed))===paused,'Portrait rotation pauses battle elapsed time');check(await fingerprint()===beforeRotate,'Portrait rotation preserves kingdom and army');check(await page.locator('#troop-actions').evaluate(e=>e.inert&&getComputedStyle(e).visibility==='hidden'),'Portrait battle controls are hidden and inert');check(await page.evaluate(()=>JSON.parse(localStorage.getItem('monsoon.kingdoms.v1')).name==='Landscape QA'),'Portrait rotation saves kingdom');await shot('portrait-paused');
    await page.setViewportSize({width:844,height:390});await page.waitForFunction(t=>!window.kingdom.stats.portraitBlocked&&window.kingdom.battle.elapsed>t,paused);check(await fingerprint()===beforeRotate,'Landscape resume preserves kingdom and army');await shot('battle-resumed');await page.locator('[data-action="retreat"]').click();await page.locator('[data-action="confirmRetreat"]').click();await page.locator('[data-action="dismissResult"]').click();check((await state()).activeRaid===null,'Practice retreat clears raid');
    check(report.errors.length===0,'No browser runtime or console errors');check(report.failedRequests.length===0,'No failed requests');report.passed=true;return report;
  } catch(error){report.stage=stage;report.failure=error.message;try{await shot('failure-'+stage);}catch{}return report;}
}
