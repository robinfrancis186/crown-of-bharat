// Run only in a disposable named Playwright CLI browser session.
// PLAYWRIGHT_CLI_SESSION=monsoon-empty-reserve playwright_cli.sh run-code --filename tools/playtest-empty-reserve.js
async page => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const errors = [], failedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:5192/');
  await page.waitForFunction(() => window.kingdom?.stats.loaded);
  await page.locator('#loading').waitFor({ state: 'hidden' });
  const fixture = await page.evaluate(async () => {
    const { newGame, UNITS } = await import('./src/rules.js');
    const state = newGame();
    state.name = 'Empty Reserve Regression';
    state.buildings = state.buildings.filter(building => building.type !== 'hero_hall');
    state.army = Object.fromEntries(Object.keys(UNITS).map(type => [type, type === 'guard' ? 1 : 0]));
    return state;
  });
  await page.addInitScript(state => { localStorage.clear(); localStorage.setItem('monsoon.kingdoms.v1', JSON.stringify(state)); }, fixture);
  await page.reload();
  await page.waitForFunction(() => window.kingdom?.stats.loaded);
  await page.locator('#loading').waitFor({ state: 'hidden' });
  check(await page.evaluate(() => window.kingdom.state.army.guard === 1 && !window.kingdom.state.buildings.some(b => b.type === 'hero_hall')), 'fixture was not loaded');
  await page.getByRole('button', { name: /^Army 1\/48$/ }).click();
  await page.getByRole('button', { name: 'Army recipes, research and practice', exact: true }).click();
  await page.getByRole('button', { name: 'Test defenses', exact: true }).click();
  await page.getByText('No hero ready', { exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.waitForFunction(() => window.kingdom?.stats.mode === 'battle');
  check(await page.evaluate(() => window.kingdom.battle.hero === null), 'practice unexpectedly has a hero');
  await page.getByRole('button', { name: 'Deploy Talwar Guard, 1 remaining', exact: true }).click();
  const point = await page.evaluate(() => window.kingdom.screenForCell(1.5, 1.5));
  check(point.x >= 0 && point.x < 1440 && point.y >= 0 && point.y < 1000, 'deployment point is outside the viewport');
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => window.kingdom.battle.reserve.guard === 0);
  const hint = page.locator('.deployment-hint');
  await hint.getByText(/All troops deployed/).waitFor({ state: 'visible' });
  const hintText = await hint.innerText();
  check(!/Deploy hero|Hero selected/i.test(hintText), 'hint selected a nonexistent hero');
  check(await page.locator('[data-action="selectHeroDeploy"]').count() === 0, 'nonexistent hero deployment control is visible');
  check(await page.getByRole('button', { name: 'Deploy Talwar Guard, 0 remaining', exact: true }).isDisabled(), 'spent troop card remains enabled');
  const result = await page.evaluate(() => ({ mode: window.kingdom.stats.mode, hero: window.kingdom.battle.hero, reserve: window.kingdom.battle.reserve, deployed: window.kingdom.battle.deployed.guard, units: window.kingdom.battle.units.length }));
  check(result.deployed === 1 && result.units === 1, 'deployment did not create exactly one troop');
  await page.screenshot({ path: '/Volumes/T7/ra.one the game/monsoon-kingdoms/output/playwright/empty-reserve-release.png' });
  check(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  check(failedRequests.length === 0, `Failed requests: ${failedRequests.join('; ')}`);
  return { passed: true, fixture: { name: fixture.name, buildings: fixture.buildings.length, army: fixture.army }, result, hint: hintText, point, errors, failedRequests };
}
