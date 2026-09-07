// Playwright CLI run-code. Isolated named browser only; resets its local save.
async page=>{
 const check=(v,m)=>{if(!v)throw Error(m);},errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:5192/');await page.waitForFunction(()=>window.kingdom?.stats.loaded);
 const fixture=await page.evaluate(async()=>{const R=await import('./src/rules.js');const s=R.newGame();s.name='Level 15 Kingdom';s.buildings.forEach(b=>b.level=15);for(let n=0;n<2;n++){let placed=false;for(let z=0;z<22&&!placed;z++)for(let x=0;x<22&&!placed;x++)if(R.canPlace(s,'camp',x,z).ok){s.buildings.push({id:`qa-camp-${n}`,type:'camp',x,z,w:3,h:3,level:15,readyAt:0,upgradingTo:0,stored:0});placed=true;}}s.army=Object.fromEntries(Object.keys(R.UNITS).map(k=>[k,k==='guard'?240:0]));return s;});
 await page.addInitScript(s=>{if(!sessionStorage.getItem('release-fixture')){localStorage.clear();localStorage.setItem('monsoon.kingdoms.v1',JSON.stringify(s));sessionStorage.setItem('release-fixture','1');}},fixture);
 await page.reload();await page.waitForFunction(()=>window.kingdom?.stats.loaded);await page.locator('#loading').waitFor({state:'hidden'});await page.bringToFront();const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await cdp.detach();
 const sample=()=>page.evaluate(async()=>{const gaps=[];let last=performance.now();for(let i=0;i<150;i++){const now=await new Promise(requestAnimationFrame);if(i>30)gaps.push(now-last);last=now;}gaps.sort((a,b)=>a-b);return {medianMs:gaps[Math.floor(gaps.length/2)],p95Ms:gaps[Math.floor(gaps.length*.95)],stats:window.kingdom.stats};});
 const home=await sample();await page.screenshot({path:'monsoon-kingdoms/output/playwright/release-landscape-level15.png'});
 await page.getByRole('button',{name:'Army 240/240',exact:true}).click();await page.getByRole('button',{name:'Army recipes, research and practice',exact:true}).click();await page.getByRole('button',{name:'Test defenses',exact:true}).click();await page.getByRole('button',{name:'Start practice',exact:true}).click();await page.waitForFunction(()=>window.kingdom.stats.mode==='battle');
 await page.getByRole('button',{name:'Deploy Talwar Guard, 240 remaining',exact:true}).click();
 const positions=await page.evaluate(()=>[3.5,6.5,9.5,12.5,15.5,18.5].map(z=>window.kingdom.screenForCell(.5,z)));
 for(let i=0;i<240;i++){const p=positions[i%positions.length];check(p.x>0&&p.x<844&&p.y>0&&p.y<300,'deployment point not in unobscured playfield');await page.mouse.click(p.x,p.y);}
 await page.waitForFunction(()=>window.kingdom.battle.reserve.guard===0);check(await page.evaluate(()=>window.kingdom.battle.deployed.guard===240),'not all240 deployed');
 const combat=await sample();await page.screenshot({path:'monsoon-kingdoms/output/playwright/release-landscape-240-troops.png'});
 await page.getByRole('button',{name:'Retreat',exact:true}).click();await page.getByRole('button',{name:'Retreat',exact:true}).last().click();
 check(errors.length===0,errors.join('\n'));return {passed:true,home,combat,errors};
}
