// Playwright CLI run-code function. Requires the existing isolated Firebase QA adapter.
async page=>{
 if(!["localhost","127.0.0.1"].includes(await page.evaluate(()=>location.hostname))||!await page.evaluate(()=>typeof window.qaSwitch==="function"))throw Error("Use a disposable localhost session with the Firebase test adapter");
 const assert=(v,m)=>{if(!v)throw Error(m);};
 for(const mode of ['busy','maximum','blocked']){
  await page.evaluate(mode=>{
   const raw=JSON.parse(sessionStorage.getItem('qa-doc-qa-veteran')),s=JSON.parse(raw.kingdom),fort=s.buildings.find(b=>b.type==='fort');
   s.activeRaid=null;fort.level=mode==='maximum'?15:2;fort.readyAt=mode==='busy'?Date.now()+300000:0;fort.upgradingTo=mode==='busy'?3:0;
   if(mode==='blocked')s.resources={coin:0,grain:0,wood:0,iron:0};
   raw.kingdom=JSON.stringify(s);raw.revision++;sessionStorage.setItem('qa-doc-qa-veteran',JSON.stringify(raw));
  },mode);
  await page.reload();await page.waitForFunction(()=>window.kingdom?.stats.loaded,{timeout:60000});
  await page.setViewportSize({width:568,height:320});
  await page.locator('#home-actions [data-value=build]').click();
  await page.locator('[data-action=uiBuildDetail][data-value=fort]').click();
  await page.locator('[data-action=openUpgrade][data-value=b1]').click();
  const button=page.locator('.upgrade-action-main button');
  assert(await button.evaluate(el=>{const r=el.getBoundingClientRect();return r.y>=0&&r.bottom<=innerHeight&&r.height>=44;}),'Upgrade action visible: '+mode);
  if(mode==='busy')assert((await button.innerText()).includes('Finish now'),'Busy shows Finish now');
  else assert(await button.isDisabled(),'Maximum and blocked cannot charge resources');
  if(mode==='maximum')assert((await button.innerText()).includes('Fully upgraded'),'Maximum status is clear');
  if(mode==='blocked')assert((await page.locator('.upgrade-gate').innerText()).includes('Missing resources'),'Missing resources explained');
  await page.screenshot({path:`output/playwright/ui-after-upgrade-${mode}-568.png`});
 }
 await page.locator('.panel-close').click();
 await page.evaluate(()=>window.uiUpgradeStatesReport={passed:['busy','maximum','blocked'],viewport:'568x320'});
}
