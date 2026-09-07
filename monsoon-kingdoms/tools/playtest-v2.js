// Playwright CLI run-code function. Disposable browser only: resets its local kingdom.
async page => {
  const check=(value,message)=>{if(!value)throw Error(message);};
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://localhost:5191/monsoon-kingdoms/');
  await page.addInitScript(()=>{if(sessionStorage.getItem('monsoon-v2-test')){localStorage.removeItem('monsoon.kingdoms.v1');sessionStorage.removeItem('monsoon-v2-test');}});
  await page.evaluate(()=>sessionStorage.setItem('monsoon-v2-test','1'));await page.reload();
  await page.waitForFunction(()=>window.kingdom?.stats.loaded);await page.locator('#loading').waitFor({state:'hidden'});
  const close=()=>page.getByRole('button',{name:'Close panel',exact:true}).click();
  const clickCell=async(x,z)=>{const p=await page.evaluate(([x,z])=>window.kingdom.screenForCell(x,z),[x,z]);await page.mouse.click(p.x,p.y);};
  const clickBuilding=async(type)=>{const b=await page.evaluate(type=>window.kingdom.state.buildings.find(b=>b.type===type),type);await clickCell(b.x+b.w/2,b.z+b.h/2);return b;};
  const upgrade=async(type)=>{const b=await clickBuilding(type);await page.locator('#context-actions [data-action="openUpgrade"]').last().click();await page.locator('[data-action="confirmUpgrade"]').click();await page.locator(`#context-actions [data-action="finish"][data-value="building:${b.id}"]`).click();await page.locator('[data-action="confirmFinish"]').click();await page.waitForFunction(([id,level])=>window.kingdom.state.buildings.find(b=>b.id===id).level===level,[b.id,b.level+1]);};
  const army=async()=>{await page.locator('#home-actions [data-value="army"]').click();await page.locator('[data-action="quickTrain"]').click();await close();};
  const deployArmy=async()=>{
    await page.locator('[data-action="selectHeroDeploy"]').click();await clickCell(12.5,22.5);
    for(const type of ['guard','archer','engineer','rider','elephant','healer']){const n=await page.evaluate(t=>window.kingdom.battle.reserve[t],type);if(!n)continue;await page.locator(`[data-action="selectTroop"][data-value="${type}"]`).click();for(let i=0;i<n;i++)await clickCell(7.5+i%9,22.5);}
    const ability=page.locator('[data-action="heroAbility"]');if(await ability.isEnabled())await ability.click();
    await page.screenshot({path:'monsoon-kingdoms/output/playwright/v2-battle.png'});
    await page.getByRole('button',{name:'Return to your kingdom'}).waitFor({timeout:60000});
    const result=await page.evaluate(()=>({stars:window.kingdom.battle.stars,hero:window.kingdom.battle.hero,kind:window.kingdom.battle.kind,score:window.kingdom.state.ranked.score}));
    await page.screenshot({path:'monsoon-kingdoms/output/playwright/v2-victory.png'});await page.getByRole('button',{name:'Return to your kingdom'}).click();return result;
  };
  const campaign=async(id)=>{await army();await page.getByRole('button',{name:'Attack',exact:true}).click();await page.locator('[data-action="setAttackTab"][data-value="campaign"]').click();await page.locator(`[data-action="startRaid"][data-value="${id}"]`).click();return deployArmy();};
  const initial=await page.evaluate(()=>window.kingdom.state);
  check(initial.buildings.length===32,'new civic buildings missing');
  await page.locator('#home-actions [data-value="army"]').click();await page.getByRole('button',{name:'Add Talwar Guard',exact:true}).click();await page.getByRole('button',{name:'Remove Talwar Guard',exact:true}).click();await close();
  check(await page.evaluate(()=>window.kingdom.state.resources.coin)===1900,'army prep charged resources');
  await page.getByRole('button',{name:'Builders and gems',exact:true}).click();await page.locator('[data-action="buyBuilder"]').click();await close();
  check(await page.evaluate(()=>window.kingdom.state.builders)===3,'builder purchase failed');
  await upgrade('fort');
  check(await page.evaluate(()=>window.kingdom.state.gems)>50,'upgrade gem achievement missing');
  const first=await campaign('riverbend');check(first.stars===3,'first campaign not completed');check(first.hero.deployed,'hero did not deploy');check(first.hero.abilityUsed,'hero ability not used');
  const second=await campaign('teakpass');check(second.stars>=1,'second campaign not completed');
  await upgrade('laboratory');
  await page.getByRole('button',{name:'Open Royal Workshop',exact:true}).click();
  await page.locator('[data-action="research"][data-value="guard"]').click();await page.locator('[data-action="finish"][data-value="research:guard"]').click();await page.locator('[data-action="confirmFinish"]').click();
  check(await page.evaluate(()=>window.kingdom.state.unitLevels.guard)===2,'research finish failed');await close();
  await army();await page.getByRole('button',{name:'Open Royal League',exact:true}).click();
  await page.screenshot({path:'monsoon-kingdoms/output/playwright/v2-ranked.png'});
  await page.locator('[data-action="startRanked"]').click();const ranked=await deployArmy();check(ranked.stars>=1&&ranked.score>0,'ranked score failed');
  check(await page.evaluate(()=>window.kingdom.state.ranked.attacksUsed)===1,'ranked attempt not consumed exactly once');
  await upgrade('hero_hall');
  await page.getByRole('button',{name:'Heroes',exact:true}).click();await page.locator('[data-action="selectHero"][data-value="tara"]').click();
  await page.locator('.panel-heroes').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});await page.screenshot({path:'monsoon-kingdoms/output/playwright/v2-heroes.png'});await close();
  check(await page.evaluate(()=>window.kingdom.state.activeHero)==='tara','Tara not unlocked/chosen');
  await page.getByRole('button',{name:'Build',exact:true}).click();await page.getByRole('button',{name:'Build Rampart',exact:true}).click();
  await clickCell(2.5,18.5);await clickCell(5.5,18.5);await page.mouse.move(1200,940);
  await page.screenshot({path:'monsoon-kingdoms/output/playwright/v2-wall-line.png'});
  await page.getByRole('button',{name:'Build walls',exact:true}).click();
  check(await page.evaluate(()=>window.kingdom.state.buildings.filter(b=>b.type==='wall').length)===23,'wall line count wrong');
  const before=await page.evaluate(()=>({gems:window.kingdom.state.gems,builders:window.kingdom.state.builders,level:window.kingdom.state.unitLevels.guard,hero:window.kingdom.state.activeHero,score:window.kingdom.state.ranked.score,walls:window.kingdom.state.buildings.length}));
  await page.reload();await page.waitForFunction(()=>window.kingdom?.stats.loaded);await page.locator('#loading').waitFor({state:'hidden'});
  const after=await page.evaluate(()=>({gems:window.kingdom.state.gems,builders:window.kingdom.state.builders,level:window.kingdom.state.unitLevels.guard,hero:window.kingdom.state.activeHero,score:window.kingdom.state.ranked.score,walls:window.kingdom.state.buildings.length}));
  check(JSON.stringify(before)===JSON.stringify(after),'expanded progress did not persist');
  await page.screenshot({path:'monsoon-kingdoms/output/playwright/v2-upgraded-village.png'});
  return {passed:true,first,second,ranked,persisted:after,stats:await page.evaluate(()=>window.kingdom.stats)};
}
