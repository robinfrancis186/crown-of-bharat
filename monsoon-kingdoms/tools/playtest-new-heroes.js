// Run with Playwright CLI after setup-interface-qa.js in a disposable localhost browser.
async page => {
  if (!['localhost', '127.0.0.1'].includes(await page.evaluate(() => location.hostname)) || !await page.evaluate(() => typeof window.qaSwitch === 'function')) throw Error('Use the isolated local account adapter.');
  const assert = (value, message) => { if (!value) throw Error(message); };
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const inside = selector => page.locator(selector).first().evaluate(el => { const r = el.getBoundingClientRect(); return r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.height >= 44 && r.width >= 44; });
  const fixture = async () => {
    await page.evaluate(async () => {
      const R = await import('./src/rules.js'), s = R.newGame(); s.name = 'Champions review'; s.tutorial.skipped = true;
      s.buildings = [['fort', 10, 9, 6], ['barracks', 10, 16, 3], ['hero_hall', 15, 14, 6], ['archer_tower', 4, 15, 1], ['farm', 6, 15, 1], ['lumber', 6, 18, 1]].map(([type, x, z, level], i) => ({ id: `b${i + 1}`, type, x, z, w: R.CATALOG[type].w, h: R.CATALOG[type].h, level, builtAt: Date.now(), readyAt: 0, upgradingTo: 0, stored: 0 }));
      s.resources = { coin: 3000, grain: 3000, wood: 3000, iron: 3000 }; s.ore = 5000; s.nextId = 7; R.tickHome(s, Date.now() + 1);
      for (const key of Object.keys(localStorage)) if (key.startsWith('monsoon.account.qa-')) localStorage.removeItem(key);
      sessionStorage.setItem('qa-doc-qa-newheroes', JSON.stringify({ schema: 1, revision: 1, kingdom: JSON.stringify(s), preferences: '{}', online: '{}' }));
      sessionStorage.setItem('qa-user', JSON.stringify({ uid: 'qa-newheroes', displayName: s.name, providerData: [{ providerId: 'google.com' }] }));
    });
    await page.reload(); await page.waitForFunction(() => window.kingdom?.stats.loaded, { timeout: 60000 });
    await page.locator('#loading').waitFor({ state: 'hidden' });
  };
  await fixture();
  await page.locator('#home-actions [data-value=heroes]').click();
  for (const [width, height] of [[568, 320], [667, 375], [844, 390], [1280, 440]]) {
    await page.setViewportSize({ width, height });
    for (const id of ['nila', 'ayaan', 'ira', 'kabir']) {
      await page.locator(`[data-action=uiHeroFocus][data-value=${id}]`).click();
      assert(await inside(`[data-action=uiHeroFocus][data-value=${id}]`), `${id} roster target fits at ${width}`);
      assert(await inside(`[data-action=upgradeHero][data-value=${id}]`), `${id} upgrade fits without scrolling at ${width}`);
      assert(await inside(`[data-action=selectHero][data-value=${id}]`), `${id} selection fits at ${width}`);
      await page.waitForFunction(() => { const img = document.querySelector('.hero-profile img'); return img?.complete && img.naturalWidth > 0; });
      assert(!await page.locator('.panel-content').evaluate(el => el.scrollWidth > el.clientWidth + 1), `No body overflow at ${width}`);
    }
    await page.screenshot({ path: `output/playwright/heroes-roster-${width}.png` });
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('[data-action=uiHeroFocus][data-value=nila]').click();
  await page.locator('[data-action=upgradeHero][data-value=nila]').click();
  assert(await page.evaluate(() => window.kingdom.state.heroes.nila.readyAt > Date.now()), 'Nila upgrade starts timer');
  await page.locator('[data-action=finish][data-value="hero:nila"]').click();
  await page.locator('[data-action=confirmFinish]').click();
  await page.locator('.panel-heroes').waitFor({state:'visible'});
  assert(await page.evaluate(() => window.kingdom.state.heroes.nila.level) === 2, 'Nila upgrade completes');
  await page.locator('[data-action=uiHeroDetails][data-value=nila]').click();
  await page.locator('[data-action=uiEquip][data-value=nila]').click();
  await page.locator('[data-action=forgeEquipment][data-value=chakrams]').click();
  assert(await page.evaluate(() => window.kingdom.state.heroes.nila.slots.includes('chakrams')), 'Forged equipment auto-equips');
  await page.locator('.panel-close').click();
  const touch = await page.context().newCDPSession(page);
  const report = { layouts: ['568×320', '667×375', '844×390', '1280×440'], battles: [], errors };
  for (const id of ['nila', 'ayaan', 'ira', 'kabir']) {
    await fixture();
    await page.locator('#home-actions [data-value=heroes]').click();
    await page.locator(`[data-action=uiHeroFocus][data-value=${id}]`).click();
    await page.locator(`[data-action=selectHero][data-value=${id}]`).click();
    assert(await page.evaluate(() => window.kingdom.state.activeHero) === id, `${id} selected`);
    await page.locator('.panel-nav [data-value=army]').click();
    await page.locator('[data-action=uiArmyTools]').click();
    await page.locator('[data-action=startPractice]').click();
    await page.locator('[data-action=confirmBattle]').click();
    await page.waitForFunction(() => window.kingdom.stats.mode === 'battle');
    await page.locator('[data-action=selectHeroDeploy]').click();
    const point = await page.evaluate(() => window.kingdom.screenForCell(1, 16));
    assert(await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.id === 'world', point), 'Hero deployment hits canvas');
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y, id: 1 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => window.kingdom.battle.hero.deployed);
    const before = await page.evaluate(() => window.kingdom.battle.units.find(u => u.heroId));
    await page.waitForTimeout(500);
    await page.locator('[data-action=heroAbility]').click();
    const battle = await page.evaluate(() => window.kingdom.battle);
    assert(battle.hero.abilityUsed, `${id} ability fired through UI`);
    assert(battle.units.some(u => u.heroId === id && (Math.hypot(u.x - before.x, u.z - before.z) > .05 || u.action === 'attack')), `${id} moves or attacks`);
    if (id === 'nila') assert(battle.events.some(e => e.type === 'chakram'), 'Chakram events present');
    if (id === 'ayaan') assert(battle.heroEffects.some(e => e.type === 'sky_mark'), 'Falcon mark present');
    if (id === 'ira') assert(battle.heroEffects.some(e => e.type === 'canopy'), 'Canopy present');
    if (id === 'kabir') assert(battle.units.filter(u => u.decoy).length === 2, 'Both decoys appear');
    await page.screenshot({ path: `output/playwright/hero-battle-${id}.png` });
    await page.locator('[data-action=retreat]').click(); await page.locator('[data-action=confirmRetreat]').click();
    await page.locator('[data-action=dismissResult]').click();
    assert(await page.evaluate(() => window.kingdom.state.activeHero) === id, `${id} returns selected`);
    await page.reload(); await page.waitForFunction(() => window.kingdom?.stats.loaded, { timeout: 60000 });
    assert(await page.evaluate(() => window.kingdom.state.activeHero) === id, `${id} choice persists in test account`);
    report.battles.push(`${id}: select, touch deploy, ability, retreat, reload`);
  }
  await touch.detach(); assert(!errors.length, errors.join('\n'));
  await page.evaluate(report => window.newHeroesReport = report, report);
}
