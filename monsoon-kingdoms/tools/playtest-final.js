// Run in a disposable Playwright CLI browser with release server on5192.
async page => {
  const check=(v,m)=>{if(!v)throw Error(m);},errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5192/');await page.waitForFunction(()=>window.kingdom?.stats.loaded);await page.locator('#loading').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Kingdom settings',exact:true}).click();
  const download=page.waitForEvent('download');await page.locator('[data-action="exportSave"]').click();const backup=await download;await backup.saveAs('/tmp/kingdom-release-backup.json');
  await page.locator('#graphics-quality').selectOption('low');if(await page.locator('[data-action="toggleSound"]').innerText()==='Off')await page.getByRole('button',{name:'Toggle sound',exact:true}).click();
  const chooser=page.waitForEvent('filechooser');await page.locator('[data-action="importSave"]').click();await(await chooser).setFiles('/tmp/kingdom-release-test.json');await page.waitForFunction(()=>window.kingdom.state.name==='Release Test');
  check((await page.evaluate(()=>window.kingdom.state.army.garuda))===2,'Import army failed');
  await page.reload();await page.waitForFunction(()=>window.kingdom?.stats.loaded);await page.locator('#loading').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Kingdom settings',exact:true}).click();check(await page.locator('#graphics-quality').inputValue()==='low','Quality preference not saved');check(await page.locator('[data-action="toggleSound"]').innerText()==='On','Sound preference not saved');await page.locator('#graphics-quality').selectOption('balanced');await page.getByRole('button',{name:'Close panel',exact:true}).click();
  await page.screenshot({path:'monsoon-kingdoms/output/playwright/final-release-home.png'});
  await page.locator('#home-actions [data-value="army"]').click();check(await page.locator('.unit-row').count()===10,'Ten army choices missing');await page.locator('[data-action="startPractice"]').click();
  const cell=async(x,z)=>{const p=await page.evaluate(([x,z])=>window.kingdom.screenForCell(x,z),[x,z]);await page.mouse.click(p.x,p.y);};
  for(const type of ['bowler','miner','yeti','garuda']){await page.locator(`[data-action="selectTroop"][data-value="${type}"]`).click();await cell(9.5,22.5);}
  check(await page.evaluate(()=>['bowler','miner','yeti','garuda'].every(t=>window.kingdom.battle.units.some(u=>u.type===t))),'New troops not deployed');
  for(const spell of ['lightning','freeze','rage']){await page.locator(`[data-action="selectSpell"][data-value="${spell}"]`).click();await cell(spell==='rage'?9.5:10.5,spell==='rage'?22.5:5.5);check(await page.evaluate(id=>window.kingdom.battle.spells[id]===0,spell),`Spell ${spell} not cast`);}
  await page.screenshot({path:'monsoon-kingdoms/output/playwright/final-release-battle.png'});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.getByRole('button',{name:'Center village',exact:true}).click();check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile page overflow');await page.screenshot({path:`monsoon-kingdoms/output/playwright/final-release-battle-${width}.png`});}
  await page.locator('[data-action="retreat"]').click();await page.getByRole('button',{name:'Return to your kingdom',exact:true}).click();check(await page.evaluate(()=>window.kingdom.state.army.garuda===2&&window.kingdom.state.army.bowler===2),'Practice did not restorearmy');
  await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Center village',exact:true}).click();await page.bringToFront();
  const performance=await page.evaluate(async()=>{await new Promise(resolve=>{let n=0;const loop=()=>++n>=90?resolve():requestAnimationFrame(loop);requestAnimationFrame(loop);});const frames=[];await new Promise(resolve=>{let last;const loop=t=>{if(last)frames.push(t-last);last=t;if(frames.length===180)resolve();else requestAnimationFrame(loop);};requestAnimationFrame(loop);});frames.sort((a,b)=>a-b);return {median:frames[90],p95:frames[171],...window.kingdom.stats};});
  check(errors.length===0,errors.join('\n'));return {passed:true,errors,performance,backup:backup.suggestedFilename(),troops:10,spells:3,viewports:[1440,390,320]};
}
