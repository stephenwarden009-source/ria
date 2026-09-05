const { chromium } = require('playwright');
const path = require('path');

// Resolves index.html next to this script by default; override with an argument.
const TARGET = process.argv[2] || path.resolve(__dirname, 'index.html');
const URL = 'file://' + TARGET;

// Use a pinned Chromium if PLAYWRIGHT_CHROMIUM is set, otherwise let Playwright
// find its own (run `npx playwright install chromium` once).
const LAUNCH = process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {};
const results = [];
function check(name, cond, extra){ results.push({name, pass: !!cond, extra: extra||''}); }

(async () => {
  const browser = await chromium.launch(LAUNCH);
  const page = await browser.newPage({ viewport:{width:430,height:900} });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type()==='error') errors.push('console: '+m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(300);

  // ── Step 0 validation blocks empty name
  await page.click('#ob0 .btn');
  check('step0 blocks empty name', await page.isVisible('#ob0'), await page.textContent('#err0'));

  await page.fill('#inp-name','Steve');
  await page.fill('#inp-days','16');
  await page.selectOption('#inp-sub','Alcohol');
  await page.fill('#inp-cycle','18');
  check('region default CA', await page.inputValue('#inp-region') === 'CA');
  await page.click('#ob0 .btn');
  await page.waitForTimeout(150);
  check('advanced to step 1', await page.isVisible('#ob1'));

  // ── Triggers persist
  const chipCount = await page.locator('#chips-signals .chip').count();
  check('signal chips rendered', chipCount === 8, 'count='+chipCount);
  await page.click('#chips-signals .chip:nth-child(4)'); // Going quiet
  await page.click('#chips-emotional .chip:nth-child(1)'); // Loneliness
  const trg = await page.evaluate(() => JSON.parse(localStorage.getItem('ria3')).triggers);
  check('triggers persisted to localStorage', trg.signals.includes('Going quiet') && trg.emotional.includes('Loneliness'), JSON.stringify(trg.signals));

  await page.click('#ob1 .btn');
  await page.waitForTimeout(150);

  // ── Step 2 requires a phone number
  await page.click('#ob2 .btn');
  check('step2 blocks with no phone', await page.isVisible('#ob2'), await page.textContent('#err2'));
  await page.fill('#inp-c1','Dave'); await page.fill('#inp-c1p','204 555 0123');
  await page.click('#chips-tone .chip:nth-child(3)'); // Hardline
  await page.click('#ob2 .btn');
  await page.waitForTimeout(150);
  check('advanced to step 3', await page.isVisible('#ob3'));

  await page.fill('#inp-aff','My kids need me present.');
  await page.fill('#inp-loss','Everything that matters.');
  await page.fill('#inp-clean','Present. Working. Trusted.');
  await page.fill('#inp-binge','200'); await page.fill('#inp-freq','4');
  await page.click('#ob3 .btn');
  await page.waitForTimeout(200);

  // ── Summary reflects entered data
  const ss = await page.textContent('#ss-content');
  check('summary shows name+triggers+contacts', /Steve/.test(ss) && /Triggers mapped/.test(ss) && /Hardline|Contacts reachable/.test(ss), ss.replace(/\s+/g,' ').slice(0,180));

  await page.click('#ob4 .btn');
  await page.waitForTimeout(300);
  check('app launched (nav visible)', await page.isVisible('#nav'));
  check('onboarding hidden', !(await page.isVisible('#onboarding')));

  // ── Home renders real values
  check('days clean = 17', (await page.textContent('#stat-days')) === '17', await page.textContent('#stat-days'));
  check('money saved computed', (await page.textContent('#stat-saved')) !== '$0', await page.textContent('#stat-saved'));
  check('loss text shown', (await page.textContent('#loss-text')).includes('Everything'));

  // ── Crisis bar: real tel: links, Canadian numbers
  const telHrefs = await page.$$eval('#crisis-home a', as => as.map(a => a.getAttribute('href')));
  check('crisis tel:988 present', telHrefs.includes('tel:988'), JSON.stringify(telHrefs));
  check('crisis sms:988 present', telHrefs.includes('sms:988'));
  check('NORS number present', telHrefs.includes('tel:18886886677'));
  check('emergency 911 note', (await page.textContent('#crisis-home')).includes('911'));

  // ── Contacts are dialable
  await page.click('#nav-support'); await page.waitForTimeout(150);
  const cHref = await page.$$eval('#contacts-list a', as => as.map(a=>a.getAttribute('href')));
  check('contact tel: link built from digits', cHref.some(h => h === 'tel:2045550123'), JSON.stringify(cHref));

  // ── Crisis keyword coverage (the P0)
  await page.click('#nav-ai'); await page.waitForTimeout(150);
  await page.fill('#chat-input',"i don't want to be here anymore");
  await page.click('#screen-ai .btn2');
  await page.waitForTimeout(200);
  const chat = await page.textContent('#chat-log');
  const crisisLinks = await page.$$eval('#chat-log .msg-crisis a', as => as.map(a=>a.getAttribute('href')));
  check('suicide phrase triggers crisis block', crisisLinks.includes('tel:988'), JSON.stringify(crisisLinks));
  check('crisis reply does not give generic fallback', !/Choose one stabilizing move/.test(chat));

  await page.fill('#chat-input','i think he overdosed');
  await page.click('#screen-ai .btn2');
  await page.waitForTimeout(200);
  check('overdose phrase routes to emergency', (await page.textContent('#chat-log')).includes('911'));

  // ── Check-in persists answers + drives drift
  await page.click('#nav-home'); await page.waitForTimeout(150);
  await page.click('text=✓ Check in today');
  await page.waitForTimeout(200);
  check('checkin modal shows own signals', (await page.textContent('#checkin-signals')).includes('Going quiet'));
  await page.click('#modal-checkin .cq[data-q="urges"] .cqo:nth-child(3)');      // Strong
  await page.click('#modal-checkin .cq[data-q="isolation"] .cqo:nth-child(3)');  // Gone dark
  await page.click('#modal-checkin .btn2');
  await page.waitForTimeout(200);
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('ria3')).checkinLog);
  check('checkin answers persisted', log.length===1 && log[0].isolation==='Gone dark' && log[0].urges==='Strong', JSON.stringify(log[0]));

  const banner = await page.textContent('#risk-banner');
  check('drift banner cites the real reason', /gone dark/i.test(banner), banner.replace(/\s+/g,' ').slice(0,140));

  // ── Tone drives red mode copy
  await page.evaluate(() => enterRedMode());
  await page.waitForTimeout(150);
  check('hardline red-mode copy applied', (await page.textContent('#red-title')).includes('STOP'), await page.textContent('#red-title'));
  check('crisis lines inside red mode', (await page.textContent('#crisis-red')).includes('9-8-8'));
  await page.evaluate(() => exitRedMode());

  // ── Re-entry persists and can reset the count
  await page.click('#nav-support'); await page.waitForTimeout(150);
  await page.click('text=Open re-entry');
  await page.waitForTimeout(200);
  check('re-entry offers user own signals', (await page.textContent('#relapse-signal-opts')).includes('Going quiet'));
  await page.click('#modal-relapse .cq[data-q="firstPull"] .cqo:nth-child(1)');
  await page.click('#modal-relapse .cq[data-q="missedSignal"] .cqo:nth-child(1)');
  await page.click('#modal-relapse .cq[data-q="reset"] .cqo:nth-child(1)'); // Yes, reset
  await page.click('#modal-relapse .btn2');
  await page.waitForTimeout(300);
  const rel = await page.evaluate(() => JSON.parse(localStorage.getItem('ria3')).relapses);
  check('relapse persisted', rel.length===1 && rel[0].firstPull==='Days ago', JSON.stringify(rel[0]));
  check('day count reset to 1', (await page.textContent('#stat-days'))==='1', await page.textContent('#stat-days'));
  check('re-entry history rendered', (await page.textContent('#relapse-history')).includes('Missed signal'));

  // ── Accordion + breathing ring
  await page.click('#nav-tools'); await page.waitForTimeout(150);
  await page.click('#screen-tools .tool-card:nth-child(3) .tc-head');
  await page.waitForTimeout(350);
  check('accordion opens', await page.evaluate(() => document.querySelectorAll('#screen-tools .tc-body.open').length === 1));
  await page.evaluate(() => startBreath('main'));
  await page.waitForTimeout(400);
  check('breathing ring animates', (await page.textContent('#breath-ring')) === 'Inhale', await page.textContent('#breath-ring'));
  await page.evaluate(() => stopBreath('main'));

  // ── Reload keeps everything
  await page.reload(); await page.waitForTimeout(400);
  check('state survives reload', await page.isVisible('#nav') && (await page.textContent('#uname'))==='Steve');
  const trg2 = await page.evaluate(() => JSON.parse(localStorage.getItem('ria3')).triggers);
  check('triggers survive reload', trg2.signals.includes('Going quiet'));

  // ── Region switch changes crisis lines
  await page.evaluate(() => { S.region='US'; saveState(); renderCrisis(); });
  await page.waitForTimeout(150);
  check('US region swaps to SAMHSA', (await page.textContent('#crisis-home')).includes('SAMHSA'));
  await page.evaluate(() => { S.region='OTHER'; S.customCrisis={name:'Lifeline',tel:'131114'}; saveState(); renderCrisis(); });
  await page.waitForTimeout(150);
  const custom = await page.$$eval('#crisis-home a', as => as.map(a=>a.getAttribute('href')));
  check('custom region line works', custom.includes('tel:131114'), JSON.stringify(custom));

  // ── Regression: Settings save must not inflate the day count
  await page.evaluate(() => { S.startDate = '2026-08-01'; saveState(); populate(); });
  await page.waitForTimeout(150);
  const before = await page.textContent('#stat-days');
  for(let i=0;i<3;i++){ await page.evaluate(() => { openSettings(); saveSettings(); }); await page.waitForTimeout(100); }
  const after = await page.textContent('#stat-days');
  check('day count stable across 3 settings saves', before === after, before + ' -> ' + after);

  await page.evaluate(() => openSettings());
  await page.fill('#s-date','2027-01-01');
  await page.evaluate(() => saveSettings());
  await page.waitForTimeout(150);
  check('future date clamps to day 1', (await page.textContent('#stat-days')) === '1', await page.textContent('#stat-days'));

  // ══ Phase 1-3: storage, pattern view, ledger, backup ══════════════

  // ── Photos live in IndexedDB, not localStorage
  await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 12; c.height = 12;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#888'; ctx.fillRect(0,0,12,12);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const file = new File([blob], 'test.png', { type:'image/png' });
    await new Promise(res => handleFiles([file], res));
  });
  await page.waitForTimeout(300);
  const memShape = await page.evaluate(() => JSON.stringify((S.memories||[]).slice(-1)[0] || {}));
  check('photo stored by IndexedDB key, not base64', memShape.includes('"k"') && !memShape.includes('data:image'), memShape.slice(0,120));
  const lsClean = await page.evaluate(() => !(localStorage.getItem('ria3') || '').includes('data:image'));
  check('localStorage carries no image payload', lsClean);
  const idbHas = await page.evaluate(async () => {
    const m = (S.memories||[]).slice(-1)[0];
    if(!m || !m.k) return false;
    const b = await idbGet(m.k);
    return !!(b && b.size > 0);
  });
  check('photo blob readable back from IndexedDB', idbHas);
  const imgSrc = await page.evaluate(() => { renderMemory(); const i = document.querySelector('#memory-grid img'); return i ? i.getAttribute('src') : ''; });
  check('memory grid renders from object URL', imgSrc.startsWith('blob:'), imgSrc.slice(0,40));

  // ── Your pattern: the user can actually see their check-ins
  await page.evaluate(() => {
    S.checkinLog = [
      { date:'2026-08-20', urges:'Some', reachedOut:'Yes', isolation:'Connected', intensity:3 },
      { date:'2026-08-24', urges:'Strong', reachedOut:'No', isolation:'Pulling back', intensity:7, signalToday:'Going quiet' },
      { date:'2026-08-27', urges:'Strong', reachedOut:'No', isolation:'Isolated', intensity:9 }
    ];
    S.relapses = [{ date:'2026-08-27', note:'x' }];
    saveState(); renderPattern();
  });
  await page.waitForTimeout(150);
  const patRows = await page.locator('#pattern-view .pat-row').count();
  check('pattern view lists every check-in', patRows === 3, 'rows=' + patRows);
  const patText = await page.textContent('#pattern-view');
  check('pattern view shows the answers, not just dots', patText.includes('Pulling back') && patText.includes('Going quiet'));
  check('pattern view shows intensity values', patText.includes('9/10'));
  const svgPts = await page.getAttribute('#pattern-view polyline', 'points');
  check('intensity plotted as a line', (svgPts || '').split(' ').length === 3, svgPts);
  const relLine = await page.locator('#pattern-view line[stroke-dasharray]').count();
  check('re-entry days marked on the chart', relLine === 1, 'marks=' + relLine);

  // ── Usage ledger counts events, never content
  await page.evaluate(() => { S.usage = { firstOpen:'', days:[], redMode:0, timerStarts:0, timerDone:0, breathDone:0, tools:{}, contactTaps:0, crisisTaps:0, checkins:0, relapses:0, exports:0 }; saveState(); });
  await page.evaluate(() => { startBuy10(); stopBuy10(); });
  await page.evaluate(() => enterRedMode());
  await page.evaluate(() => exitRedMode());
  await page.evaluate(() => { const h = document.querySelector('#screen-tools .tc-head'); if(h) toggleTool(h); });
  await page.evaluate(() => {
    const a = document.querySelector('#crisis-home a.crisis-act');
    if(a){ a.addEventListener('click', e => e.preventDefault()); a.click(); }
  });
  await page.waitForTimeout(150);
  const u = await page.evaluate(() => JSON.parse(JSON.stringify(S.usage)));
  check('ledger counts timer starts', u.timerStarts === 1, JSON.stringify(u.timerStarts));
  check('ledger counts red mode entries', u.redMode === 1, JSON.stringify(u.redMode));
  check('ledger counts tool opens by name', Object.keys(u.tools || {}).length === 1, JSON.stringify(u.tools));
  check('ledger counts crisis-bar taps', u.crisisTaps === 1, JSON.stringify(u.crisisTaps));
  const ledgerClean = JSON.stringify(u);
  check('ledger holds no free text from the user', !ledgerClean.includes('Steve') && !ledgerClean.includes('Going quiet'), ledgerClean.slice(0,150));

  // ── Backup round-trip through the real file input
  const backup = await page.evaluate(async () => JSON.stringify(await buildBackup()));
  check('backup includes check-in history', backup.includes('2026-08-24'));
  check('backup carries photos as data URLs', backup.includes('data:image'));
  await page.evaluate(() => { S.name = 'WIPED'; S.checkinLog = []; S.memories = []; saveState(); populate(); renderPattern(); });
  await page.waitForTimeout(100);
  check('state wiped before restore', (await page.evaluate(() => S.checkinLog.length)) === 0);
  await page.evaluate(() => openSettings());
  await page.setInputFiles('#s-restore', { name:'ria-backup.json', mimeType:'application/json', buffer: Buffer.from(backup) });
  await page.waitForTimeout(500);
  const restored = await page.evaluate(() => ({ name: S.name, logs: (S.checkinLog||[]).length, mems: (S.memories||[]).length }));
  check('restore brings back the name', restored.name === 'Steve', restored.name);
  check('restore brings back check-in history', restored.logs === 3, 'logs=' + restored.logs);
  check('restore brings back photos', restored.mems === 1, 'mems=' + restored.mems);
  const restoredImg = await page.evaluate(async () => { await loadPhotos(); renderMemory(); const i = document.querySelector('#memory-grid img'); return i ? i.getAttribute('src') : ''; });
  check('restored photo renders', restoredImg.startsWith('blob:'), restoredImg.slice(0,40));
  await page.evaluate(() => closeSettings());

  // ── The on-device guarantee, asserted rather than assumed
  const fs = require('fs');
  const source = fs.readFileSync(TARGET, 'utf8');
  const net = (source.match(/\bfetch\s*\(|XMLHttpRequest|new WebSocket|navigator\.sendBeacon/g) || []);
  check('no network calls anywhere in the app', net.length === 0, net.join(','));
  check('no geolocation access', !/navigator\.geolocation/.test(source));

  check('no page errors', errors.length === 0, errors.slice(0,3).join(' | '));

  await browser.close();
  const fails = results.filter(r => !r.pass);
  results.forEach(r => console.log((r.pass?'PASS':'FAIL') + '  ' + r.name + (r.extra && !r.pass ? '  → ' + r.extra : '')));
  console.log('\n' + (results.length - fails.length) + '/' + results.length + ' passed');
  process.exit(fails.length ? 1 : 0);
})();
