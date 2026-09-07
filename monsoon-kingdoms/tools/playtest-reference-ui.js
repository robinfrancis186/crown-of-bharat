// Run only in a disposable named Playwright browser; uses a local save fixture.
async page => {
 const out='/Volumes/T7/ra.one the game/monsoon-kingdoms/output/playwright/',report={passed:false,checks:[],screenshots:[],errors:[],fixture:'Fresh isolated browser kingdom; 5000 resources each,500 gems; first-upgrade achievement already credited.'};let stage='startup';
 const check=(yes,msg)=>{if(!yes)throw Error(msg);report.checks.push(msg)},state=()=>page.evaluate(()=>window.kingdom.state),close=()=>page.locator('.panel-close').click();
 const shot=async name=>{const p=out+'reference-ui-'+name+'.png';await page.screenshot({path:p});report.screenshots.push(p);};
 page.on('pageerror',e=>report.errors.push(e.message));
 try{
  await page.route('**/*',route=>route.continue());
  await page.addInitScript(()=>{const fixture=sessionStorage.getItem('reference-flow-fixture');if(fixture){localStorage.setItem('monsoon.kingdoms.v1',fixture);localStorage.removeItem('monsoon.preferences');sessionStorage.removeItem('reference-flow-fixture');}});
  await page.setViewportSize({width:844,height:390});await page.goto('http://localhost:5191/monsoon-kingdoms/');
  await page.evaluate(async()=>{const R=await import('./src/rules.js'),s=R.newGame();s.name='UI Flow Test';s.resources={coin:5000,grain:5000,wood:5000,iron:5000};s.gems=500;s.tutorial.skipped=true;s.achievements.first_upgrade=true;sessionStorage.setItem('reference-flow-fixture',JSON.stringify(s));});
  await page.reload();await page.waitForFunction(()=>window.kingdom?.stats.loaded&&window.kingdom.stats.pendingModels===0);await page.locator('#loading').waitFor({state:'hidden'});
  stage='builders-upgrade-finish';
  await page.locator('.builder-chip').first().click();
  for(const [w,h]of [[844,390],[568,320]]){await page.setViewportSize({width:w,height:h});await shot('builders-'+w);}
  const target=await page.locator('.builder-project.is-ready [data-action=openUpgrade]').first().getAttribute('data-value'),before=await state(),info=await page.evaluate(async id=>(await import('./src/rules.js')).upgradeInfo(window.kingdom.state,id),target);
  check(info.canUpgrade,'Builder suggestion is affordable according to upgradeInfo');
  await page.locator(`.builder-project [data-action=openUpgrade][data-value="${target}"]`).click();await page.locator('[data-action=confirmUpgrade]').click();
  let after=await state();for(const [k,n]of Object.entries(info.cost))check(after.resources[k]===before.resources[k]-n,`Upgrade charges exact ${k} cost: ${n}`);
  check(after.buildings.find(b=>b.id===target).upgradingTo===info.nextLevel,'Upgrade starts the displayed next level');
  await page.locator('.builder-chip').first().click();check(await page.locator('.builder-jobs').count()===1,'Builder running job appears after upgrade');
  await page.locator(`[data-action=finish][data-value="building:${target}"]`).click();
  const gems=(await state()).gems,finish=await page.evaluate(async id=>(await import('./src/rules.js')).finishCost(window.kingdom.state,'building',id),target),shown=await page.locator('.gem-confirm>strong').innerText();
  check(Number(shown.replace(/\D/g,''))===finish.cost,'Finish confirmation displays rules-backed gem price');
  await page.locator('[data-action=confirmFinish]').click();after=await state();
  check(after.gems===gems-finish.cost,'Finish confirmation spends exactly the displayed gems');check(after.buildings.find(b=>b.id===target).level===info.nextLevel&&!after.buildings.find(b=>b.id===target).readyAt,'Gem finish completes the exact building upgrade');
  stage='shop-placement-cancel';
  await page.locator('.build-button').click();await page.locator('[data-action=uiFilter][data-value="build:economy"]').click();check(await page.locator('.catalog-card').count()===6,'Shop Economy filters to six buildings');
  await page.locator('[data-action=uiBuildDetail][data-value=farm]').click();check(await page.locator('.catalog-card .catalog-detail').count()===1,'Shop portrait opens building details');
  for(const[w,h]of[[568,320],[844,390]]){await page.setViewportSize({width:w,height:h});await shot('shop-'+w);check(await page.locator('.catalog-card').first().evaluate(el=>el.querySelector('.catalog-select h3').getBoundingClientRect().bottom<=el.querySelector('.catalog-card-body').getBoundingClientRect().top),`Shop details at ${w}px keep title above cost`);}
  const beforePlace=await state();await page.locator('[data-action=selectBuild][data-value=farm]').click();
  check(await page.locator('[data-action=cancelPlacement]').isVisible(),'Selecting shop building enters actual placement mode');
  const point=await page.evaluate(()=>window.kingdom.screenForCell(2,19));await page.mouse.click(point.x,point.y);
  await page.locator('[data-action=cancelPlacement]').click();after=await state();
  check(JSON.stringify(after.resources)===JSON.stringify(beforePlace.resources),'Cancelling placement charges no resources');check(after.buildings.length===beforePlace.buildings.length,'Cancelling placement creates no building');
  stage='army-recipe';
  await page.locator('#home-actions [data-value=army]').click();const composition=(await state()).army;
  await page.locator('[data-action=uiArmyTools]').click();await page.locator('[data-action=saveArmyRecipe]').click();
  check(await page.evaluate(a=>JSON.stringify(JSON.parse(localStorage.getItem('monsoon.preferences')).armyRecipe)===JSON.stringify(a),composition),'Saved recipe records actual army composition');
  await page.locator('[data-action=clearArmy]').click();check(Object.values((await state()).army).every(n=>n===0),'Clear army removes all troops');
  await page.locator('[data-action=loadArmyRecipe]').click();check(JSON.stringify((await state()).army)===JSON.stringify(composition),'Load recipe restores exact troop counts');await close();
  stage='context-direct-actions';
  for(const[type,panel,label]of[['camp','army','Train'],['barracks','army','Train'],['laboratory','research','Research']]){
   await page.locator('#camera-tools [data-value=reset]').click();const point=await page.evaluate(t=>{const b=window.kingdom.state.buildings.find(b=>b.type===t);return window.kingdom.screenForCell(b.x+b.w/2,b.z+b.h/2);},type);await page.mouse.click(point.x,point.y);
   const direct=page.locator(`#context-actions [data-action=openPanel][data-value=${panel}]`);check(await direct.isVisible(),`${type} exposes direct ${label}`);await direct.click();check(await page.locator(`.panel-${panel}`).count()===1,`${type} direct ${label} opens actual ${panel} panel`);await close();
  }
  check(report.errors.length===0,'No JavaScript runtime errors');report.passed=true;
 }catch(e){report.stage=stage;report.failure=e.message;await shot('failure-'+stage);}
 await page.evaluate(r=>window.uiFlowReport=r,report);return report;
}
