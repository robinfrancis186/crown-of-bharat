// Playwright CLI run-code function. Requires the existing isolated Firebase QA adapter.
async page=>{
 if(!["localhost","127.0.0.1"].includes(await page.evaluate(()=>location.hostname))||!await page.evaluate(()=>typeof window.qaSwitch==="function"))throw Error("Use a disposable localhost session with the Firebase test adapter");
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const report={screens:[],checks:[],errors};
 const within=async selector=>page.locator(selector).first().evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,visible:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};});
 const capture=async(name)=>{await page.screenshot({path:`output/playwright/ui-after-${name}.png`});report.screens.push(name);};
 // Disposable Firebase mock only: existing player data is never modified.
 await page.evaluate(async()=>{
  const {developedVillage}=await import('./tools/developed-village.mjs');
  const state=developedVillage();state.name='Interface review';state.buildings[0].level=2;
  sessionStorage.setItem('qa-doc-qa-veteran',JSON.stringify({schema:1,revision:1,kingdom:JSON.stringify(state),preferences:'{}',online:'{}'}));
  sessionStorage.setItem('qa-user',JSON.stringify({uid:'qa-veteran',displayName:'Interface review',email:'qa@example.test',providerData:[{providerId:'google.com'}]}));
 });
 await page.setViewportSize({width:844,height:390});await page.reload();
 await page.waitForFunction(()=>window.kingdom?.stats.loaded,{timeout:60000});
 await page.locator('#loading').waitFor({state:'hidden'});
 assert(await page.evaluate(()=>window.kingdom.state.buildings.length)===32,'Existing developed village must survive reload');
 await capture('village-844');
 await page.locator('#home-hud [data-value=builders]').click();
 await page.locator('[data-action=openUpgrade][data-value=b2]').click();
 for(const [w,h] of [[568,320],[667,375],[844,390],[1280,440]]){
  await page.setViewportSize({width:w,height:h});
  let action=await within('[data-action=confirmUpgrade]');assert(action.visible&&action.h>=44,'Upgrade must fit without scroll at '+w);
  const before=action.y;
  await page.locator('.panel-content').evaluate(e=>e.scrollTop=e.scrollHeight);
  action=await within('[data-action=confirmUpgrade]');assert(action.visible&&action.y===before,'Upgrade must stay pinned at '+w);
  await page.locator('.panel-content').evaluate(e=>e.scrollTop=0);
  await page.getByRole('tab',{name:'Appearance',exact:true}).click();
  assert((await within('[data-action=confirmUpgrade]')).visible,'Appearance must not hide primary action');
  await page.getByRole('tab',{name:'Appearance',exact:true}).press('ArrowLeft');
  assert(await page.getByRole('tab',{name:'Stats & requirements',exact:true}).getAttribute('aria-selected')==='true','Keyboard tabs must update selection');
  const close=await within('.panel-close');assert(close.visible&&close.w>=44&&close.h>=44,'Close touch target at '+w);
  await capture('upgrade-'+w);report.checks.push('pinned upgrade, tab keyboard and 44px close '+w+'x'+h);
 }
 await page.setViewportSize({width:844,height:390});
 const before=await page.evaluate(async()=>{const R=await import('./src/rules.js'),s=window.kingdom.state;return {resources:s.resources,info:R.upgradeInfo(s,'b2')};});
 assert(before.info.canUpgrade,'Fixture farm upgrade should be affordable');
 await page.locator('[data-action=confirmUpgrade]').click();
 const after=await page.evaluate(()=>window.kingdom.state);
 assert(after.buildings.find(b=>b.id==='b2').readyAt>Date.now(),'Upgrade must start builder timer');
 for(const [r,n]of Object.entries(before.info.cost))assert(after.resources[r]===before.resources[r]-n,'Upgrade cost charged once: '+r);
 await page.locator('#home-hud [data-value=builders]').click();
 await page.locator('[data-action=finish]').first().click();
 await capture('finish-844');
 await page.locator('[data-action=backPanel]').click();assert(await page.locator('.panel-builders').isVisible(),'Back from finish returns to builders');
 await page.locator('.panel-close').click();
 await page.locator('#home-actions [data-value=army]').click();
 await page.locator('[data-action=uiArmyTools]').click();
 await page.locator('.army-toolbox [data-value=research]').click();
 await page.locator('[data-action=backPanel]').click();assert(await page.locator('.panel-army').isVisible(),'Research back returns to Army');
 report.checks.push('Upgrade exact charge and builder timer; nested finish/research back navigation');
 for(const [w,h]of [[568,320],[844,390],[1280,440]]){
  await page.setViewportSize({width:w,height:h});
  for(const id of ['build','army','heroes','attack','settings']){
   await page.locator(`.panel-nav [data-value=${id}]`).click();
   await page.locator('.game-panel').waitFor({state:'visible'});
   const bounds=await within('.game-panel');assert(bounds.visible,'Panel bounds '+id+' '+w);
   const nav=await within(`.panel-nav [data-value=${id}]`);assert(nav.visible&&nav.h>=44,'Menu navigation target '+id+' '+w);
   const overflow=await page.locator('.panel-content').evaluate(e=>e.scrollWidth>e.clientWidth+2);assert(!overflow,'Panel body horizontal overflow '+id+' '+w);
   if(id==='build'){const c=await within('.catalog-card .button');assert(c.visible&&c.h>=44,'First shop Build action visible '+w);}
   if(id==='army'){const c=await within('.roster-add');assert(c.visible&&c.h>=44&&c.w>=44,'First troop Add action visible '+w);}
   await capture(id+'-'+w);
  }
  report.checks.push('Shop/Army/Heroes/Battle/Kingdom bounds, touch targets, no horizontal overflow '+w+'x'+h);
 }
 await page.locator('.panel-close').click();await page.setViewportSize({width:844,height:390});
 for(let i=0;i<4;i++){
  await page.locator('#camera-tools [data-value=rotate]').click();
  const stable=await page.locator('.building-bubble:not([hidden])').evaluateAll(els=>els.every(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return m.a===1&&m.b===0&&m.c===0&&m.d===1;}));
  assert(stable,'World icons must remain upright under camera rotation');
 }
 report.checks.push('World icons stay upright through four camera rotations');
 assert(!errors.length,errors.join('\n'));await page.evaluate(r=>window.uiPolishReport=r,report);
}
