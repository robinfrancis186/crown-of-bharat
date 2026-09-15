// Read-only packaged build smoke in a disposable Playwright browser.
async page=>{
 const errors=[],out='/Volumes/T7/ra.one the game/monsoon-kingdoms/output/playwright/';page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:5192/');await page.waitForFunction(()=>window.kingdom?.stats.loaded&&window.kingdom.stats.pendingModels===0);await page.locator('#loading').waitFor({state:'hidden'});await page.bringToFront();
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await cdp.detach();
 const perf=await page.evaluate(async()=>{const gaps=[];let last=performance.now();for(let i=0;i<180;i++){const t=await new Promise(requestAnimationFrame);if(i>60)gaps.push(t-last);last=t;}gaps.sort((a,b)=>a-b);return{viewport:[innerWidth,innerHeight],medianMs:gaps[Math.floor(gaps.length/2)],p95Ms:gaps[Math.floor(gaps.length*.95)],...window.kingdom.stats};});
 if(!(await page.locator('link[href="./src/interface.css"]').count()))throw Error('Unified interface stylesheet absent from package');
 await page.screenshot({path:out+'reference-release-home.png'});
 for(const panel of ['builders','army','build']){await page.locator(`#home-hud [data-value=${panel}],#home-actions [data-value=${panel}]`).first().click();if(!(await page.locator(`.panel-${panel}`).isVisible()))throw Error(panel+' unavailable');await page.locator('.panel-close').click();}
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,errors,perf};
}
