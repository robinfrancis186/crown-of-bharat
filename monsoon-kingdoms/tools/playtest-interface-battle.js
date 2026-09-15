// Playwright CLI run-code function. Requires the existing isolated Firebase QA adapter.
async page=>{
 if(!["localhost","127.0.0.1"].includes(await page.evaluate(()=>location.hostname))||!await page.evaluate(()=>typeof window.qaSwitch==="function"))throw Error("Use a disposable localhost session with the Firebase test adapter");
 const assert=(v,m)=>{if(!v)throw Error(m);},errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(await page.locator('[data-action=dismissResult]').count())await page.locator('[data-action=dismissResult]').click();
 if(await page.locator('[data-action=retreat]').count()){await page.locator('[data-action=retreat]').click();await page.locator('[data-action=confirmRetreat]').click();await page.locator('[data-action=dismissResult]').click();}
 await page.reload();await page.waitForFunction(()=>window.kingdom?.stats.loaded,{timeout:60000});
 await page.setViewportSize({width:844,height:390});
 const army=await page.evaluate(()=>window.kingdom.state.army);
 await page.locator('#home-actions [data-value=army]').click();
 await page.locator('[data-action=uiArmyTools]').click();
 await page.locator('[data-action=startPractice]').click();
 await page.screenshot({path:'output/playwright/ui-after-briefing-844.png'});
 await page.locator('[data-action=confirmBattle]').click();
 await page.waitForFunction(()=>window.kingdom.stats.mode==='battle');
 const touch=await page.context().newCDPSession(page);
 const deploy=async(type,x,z,n)=>{
  await page.locator(`[data-action=selectTroop][data-value=${type}]`).click();
  const p=await page.evaluate(({x,z})=>window.kingdom.screenForCell(x,z),{x,z});
  assert(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id==='world',p),'Deployment target must hit world canvas');
  for(let i=0;i<n;i++){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 };
 await deploy('guard',1,16,5);await deploy('archer',1,17,3);
 const before=await page.evaluate(()=>window.kingdom.battle.units.map(u=>({id:u.id,x:u.x,z:u.z})));
 assert(before.length===8,'Eight troops deployed through touch');
 await page.waitForTimeout(1000);
 const after=await page.evaluate(()=>window.kingdom.battle.units);
 assert(after.some(a=>{const b=before.find(x=>x.id===a.id);return b&&Math.hypot(a.x-b.x,a.z-b.z)>.1;}),'Troops move on the real battlefield');
 await page.screenshot({path:'output/playwright/ui-after-battle-844.png'});
 await page.setViewportSize({width:568,height:320});await page.waitForTimeout(200);
 for(const sel of ['[data-action=retreat]','.troop-card','.battle-hero']){
  const e=page.locator(sel).first();if(!await e.count())continue;
  assert(await e.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}),'Battle touch target '+sel);
 }
 await page.screenshot({path:'output/playwright/ui-after-battle-568.png'});
 await page.locator('[data-action=retreat]').click();
 await page.getByRole('button',{name:'Keep fighting',exact:true}).click();assert(await page.locator('#troop-actions').isVisible(),'Cancel retreat restores battlefield');
 await page.locator('[data-action=retreat]').click();await page.locator('[data-action=confirmRetreat]').click();
 await page.locator('[data-action=dismissResult]').waitFor({state:'visible'});
 await page.screenshot({path:'output/playwright/ui-after-results-568.png'});
 assert(await page.locator('[data-action=dismissResult]').evaluate(el=>{const r=el.getBoundingClientRect();return r.bottom<=innerHeight&&r.height>=44;}),'Result return action immediately visible');
 await page.locator('[data-action=dismissResult]').click();
 assert(JSON.stringify(await page.evaluate(()=>window.kingdom.state.army))===JSON.stringify(army),'Practice restores complete army');
 assert(await page.locator('.game-panel').count()===0,'Return home clears all dialogs');
 await touch.detach();assert(!errors.length,errors.join('\n'));
 await page.evaluate(r=>window.uiBattleReport=r,{checks:['Practice briefing and commit','8 real touch deployments','Observed troop travel','568x320 battle controls >=44px','Cancel/confirm retreat and immediately visible result return','Full army restored and home navigation reset'],errors});
}
