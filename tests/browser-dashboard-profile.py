"""Dashboard/profile checks using an explicitly isolated repository and synthetic identity.

These checks do not exercise production Firebase or prove Firestore isolation.
Authentication/logout protection is covered separately against the Auth Emulator.
"""
import asyncio,json,os
from datetime import datetime,timezone
from pathlib import Path
from playwright.async_api import async_playwright,expect

BASE=os.environ.get('DASHBOARD_BROWSER_BASE_URL','http://127.0.0.1:5185/').rstrip('/')
OUT=Path('docs/visual/aufgabe-06');OUT.mkdir(parents=True,exist_ok=True)
URL=BASE+'/tests/fixtures/dashboard-profile.html'

async def main():
 checks=[];metrics=[];queries=[];errors=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  context=await browser.new_context(viewport={'width':1440,'height':935},locale='de-DE',timezone_id='Europe/Berlin')
  page=await context.new_page();page.set_default_timeout(12000);page.set_default_navigation_timeout(30000)
  page.on('pageerror',lambda error:errors.append(str(error)))
  await page.clock.install(time=datetime(2026,10,9,10,tzinfo=timezone.utc))
  async def control(name):
   await page.get_by_role('button',name=name,exact=True,include_hidden=True).evaluate('(e)=>e.click()')
  async def audit():return await page.evaluate('({...window.dashboardTestAudit})')
  async def route(view):
   await page.evaluate('(view)=>{location.hash="#/"+view}',view)
   await expect(page.locator({'dashboard':'.dashboard-view','profile':'.profile-view','calendar':'.calendar-view','tasks':'.task-results'}[view])).to_be_visible()
  async def reset():
   await page.goto(URL+'#/dashboard',wait_until='domcontentloaded')
   await page.reload(wait_until='domcontentloaded')
   await expect(page.locator('.dashboard-view .statistics strong')).to_have_text(['2','1','3'])
   await page.add_style_tag(content='#fixture-controls{display:none}')
  async def screenshot(view,width,height):
   await page.set_viewport_size({'width':width,'height':height});await route(view)
   await page.evaluate('document.fonts.ready')
   await page.screenshot(path=str(OUT/f'{view}-{width}.png'),full_page=True)
   data=await page.evaluate('''()=>{const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,header:box('.planner-header'),intro:box('.overview-intro'),progress:box('.progress-card'),statistics:box('.statistics'),statisticsCards:[...document.querySelectorAll('.statistics>div')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}),next:box('.overview-next'),firstTask:box('.task-card'),taskCards:[...document.querySelectorAll('.overview-next .task-card')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}),profile:box('.profile-view'),name:box('#profile-name'),email:box('#profile-email'),logout:box('.profile-logout'),navigation:box(innerWidth>900?'.app-navigation':'.bottom-navigation'),icons:[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(i).visibility!=='hidden'}).map(i=>{const r=i.getBoundingClientRect();return {src:new URL(i.src).pathname,loaded:i.complete&&i.naturalWidth>0,nativeWidth:i.naturalWidth,nativeHeight:i.naturalHeight,width:r.width,height:r.height}})}}''')
   assert data['width']==data['scrollWidth'],data
   assert all(icon['loaded'] and icon['width']==icon['nativeWidth'] and icon['height']==icon['nativeHeight'] for icon in data['icons']),data
   metrics.append({'view':view,**data})

  await reset()
  await expect(page.locator('.overview-intro h2')).to_have_text('Hallo Mira, schön, dass du da bist.')
  await expect(page.locator('.overview-next .task-card h3')).to_have_text(['Mathematik: Integrale verstehen','Deutsch: Essay ausarbeiten'])
  initial=await audit()
  for view,sizes in [('dashboard',[(1440,935),(390,1143),(320,1143)]),('profile',[(1440,800),(390,844),(320,844)])]:
   for width,height in sizes:await screenshot(view,width,height)
  await expect(page.locator('#profile-name')).to_have_value('Mira Sommer')
  await expect(page.locator('#profile-email')).to_have_value('mira@example.test')
  assert await page.locator('#profile-name').evaluate('(e)=>e.readOnly')
  assert await page.locator('#profile-email').evaluate('(e)=>e.readOnly')
  await page.locator('#profile-name').focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('Ungespeichert')
  await expect(page.locator('#profile-name')).to_have_value('Mira Sommer')
  await expect(page.get_by_role('button',name='Speichern',exact=True)).to_have_count(0)
  await page.set_viewport_size({'width':1440,'height':935})
  for href,target in [('#/dashboard','dashboard'),('#/tasks','tasks'),('#/calendar','calendar')]:
   await page.locator(f'.app-navigation a[href="{href}"]').click();await route(target)
  await page.locator('.planner-account .profile-link').click();await route('profile')
  await page.locator('.app-navigation a[href="#/dashboard"]').click();await route('dashboard')
  assert await audit()==initial
  queries.append({'case':'initial 3 records and route/profile/visual changes','initial':initial,'afterRoutes':await audit(),'additionalRouteReads':0,'additionalRouteWrites':0})
  checks.append('six screenshots at 1440/390/320; visible original icons load at native geometry; read-only profile identity and internal navigation add no repository calls')

  for count,expected,distribution,titles in [
   (54,['36','18','54'],'Davon 18 offen, 18 in Bearbeitung.',['Synthetische Aufgabe 51','Synthetische Aufgabe 52','Synthetische Aufgabe 0']),
   (1000,['667','333','1000'],'Davon 334 offen, 333 in Bearbeitung.',['Synthetische Aufgabe 997','Synthetische Aufgabe 999','Synthetische Aufgabe 0'])]:
   before=await audit();await control(f'{count} Aufgaben')
   await expect(page.locator('.statistics strong')).to_have_text(expected)
   await expect(page.locator('.statistics .sr-only')).to_have_text(distribution)
   await expect(page.locator('.overview-next .task-card h3')).to_have_text(titles)
   await expect(page.get_by_role('progressbar')).to_have_attribute('max',str(count))
   await expect(page.get_by_role('progressbar')).to_have_attribute('value',expected[1])
   after=await audit();delta=after['reads']-before['reads']
   assert delta==count//50+2,(count,before,after)
   assert after['writes']==before['writes']==0
   await route('profile');await expect(page.get_by_role('progressbar')).to_have_attribute('max',str(count))
   await route('dashboard');assert await audit()==after
   queries.append({'case':f'{count} records, StrictMode remount','before':before,'afterLoad':after,'readDelta':delta,'additionalProfileRouteReads':0,'note':'includes one cancelled StrictMode first-page request; exact multiples of 50 require empty terminal page'})
  checks.append('54 and 1000 complete records: exact counts/status distribution/progress, overdue tasks after first cursor page sorted deterministically, measured complete-load query deltas and zero profile-navigation rereads')

  await control('Leerer Bestand');await expect(page.get_by_text('Noch keine Aufgaben',exact=True)).to_be_visible()
  await expect(page.locator('.statistics strong')).to_have_text(['0','0','0'])
  await control('Alles erledigt');await expect(page.get_by_role('heading',name='Alles erledigt',exact=True)).to_be_visible()
  await expect(page.locator('.statistics strong')).to_have_text(['0','3','3'])
  await expect(page.locator('.overview-next .task-card')).to_have_count(0)
  await control('Ladefehler');await expect(page.get_by_role('alert')).to_contain_text('Internetverbindung')
  await expect(page.locator('.statistics')).to_have_count(0)
  await control('Fehler beheben');await page.get_by_role('button',name='Erneut versuchen',exact=True).click()
  await expect(page.get_by_role('heading',name='Alles erledigt',exact=True)).to_be_visible()
  await control('Langsam laden');await expect(page.get_by_text('Aufgaben werden geladen …',exact=False)).to_be_visible()
  await expect(page.locator('.statistics')).to_have_count(0)
  await expect(page.get_by_role('heading',name='Alles erledigt',exact=True)).to_be_visible()
  await route('profile');await control('Ladefehler')
  await expect(page.locator('.profile-view').get_by_role('alert')).to_contain_text('Internetverbindung')
  await expect(page.locator('.profile-view .progress-card')).to_have_count(0)
  await expect(page.locator('#profile-email')).to_have_value('mira@example.test')
  await control('Fehler beheben');await page.get_by_role('button',name='Erneut versuchen',exact=True).click()
  await expect(page.locator('.profile-view .progress-card')).to_be_visible()
  await control('Langsam laden');await expect(page.locator('.profile-loading')).to_be_visible()
  await expect(page.locator('.profile-view .progress-card')).to_have_count(0)
  await expect(page.locator('.profile-view .progress-card')).to_be_visible()
  checks.append('empty and all-completed dashboard, loading hides stale metrics; dashboard/profile errors hide stale progress and retry restores complete data')

  await page.set_viewport_size({'width':320,'height':844})
  await control('Fehlende Identität')
  await expect(page.locator('#profile-name')).to_have_value('')
  await expect(page.locator('#profile-email')).to_have_value('')
  await expect(page.locator('.profile-identity-copy strong')).to_have_text('Dein Konto')
  await expect(page.locator('.profile-view .progress-copy p')).to_have_text('0 von 0 erledigt')
  assert await page.evaluate('document.documentElement.scrollWidth===innerWidth')
  await control('Lange Identität')
  await expect(page.locator('#profile-name')).to_have_value('Benutzerin'*15)
  await expect(page.locator('.profile-view .progress-card')).to_be_visible()
  assert await page.evaluate('document.documentElement.scrollWidth===innerWidth')
  await route('dashboard');assert await page.evaluate('document.documentElement.scrollWidth===innerWidth')
  await control('Isolierter Kontowechsel')
  await expect(page.locator('.statistics strong')).to_have_text(['1','0','1'])
  await expect(page.locator('.overview-next .task-card h3')).to_have_text(['Nur zweites Konto'])
  await route('profile');await expect(page.locator('#profile-name')).to_have_value('Zweite Benutzerin')
  await expect(page.locator('#profile-email')).to_have_value('zweite@example.test')
  assert 'Mira Sommer' not in await page.locator('.profile-view').inner_text()
  checks.append('missing and long profile identity remain explicit/read-only with no 320px overflow; isolated account remount removes previous profile/task data (real Auth isolation tested separately)')

  await reset();await page.set_viewport_size({'width':1440,'height':935})
  await page.get_by_role('combobox',name='Status für Mathematik: Integrale verstehen',exact=True).select_option('done')
  await expect(page.locator('.notice.success')).to_have_text('Status gespeichert.')
  await expect(page.locator('.statistics strong')).to_have_text(['1','2','3'])
  await expect(page.locator('.overview-next .task-card h3')).to_have_text(['Deutsch: Essay ausarbeiten'])
  await page.get_by_role('button',name='Aktionen für Deutsch: Essay ausarbeiten',exact=True).click()
  await page.get_by_role('button',name='Bearbeiten',exact=True).click()
  await expect(page.locator('#task-title')).to_have_value('Deutsch: Essay ausarbeiten')
  await page.locator('#task-title').fill('Überarbeiteter Lernschritt')
  await page.locator('#task-dueDate').fill('2026-09-01')
  await page.get_by_role('button',name='Änderungen speichern',exact=True).click()
  await expect(page.locator('.notice.success')).to_have_text('Aufgabe gespeichert.')
  await route('dashboard');await expect(page.locator('.overview-next .task-card h3')).to_have_text(['Überarbeiteter Lernschritt'])
  await control('Leerer Bestand');await page.get_by_role('button',name='Erste Aufgabe erstellen',exact=True).click()
  await expect(page.locator('#task-title')).to_be_visible()
  await page.locator('#task-title').fill('Neu aus Übersicht')
  await page.locator('#task-dueDate').fill('2026-10-10')
  await page.get_by_role('button',name='Eintrag hinzufügen',exact=True).click()
  await expect(page.locator('.notice.success')).to_have_text('Aufgabe gespeichert.')
  await route('dashboard');await expect(page.locator('.statistics strong')).to_have_text(['1','0','1'])
  await page.get_by_role('button',name='Aktionen für Neu aus Übersicht',exact=True).click()
  await page.get_by_role('button',name='Löschen',exact=True).click()
  await expect(page.get_by_role('button',name='Abbrechen',exact=True)).to_be_focused()
  await page.get_by_role('button',name='Aufgabe löschen',exact=True).click()
  await expect(page.get_by_text('Noch keine Aufgaben',exact=True)).to_be_visible()
  mutations=await audit();assert mutations['writes']==4,mutations
  queries.append({'case':'dashboard existing CRUD handlers','freshFixtureDocumentBeforeThisSegment':True,'afterMutations':mutations,'writes':4,'note':'status, edit, create, delete; counters start at zero in a fresh fixture document; mutation reloads intentionally read again'})
  checks.append('dashboard status save, edit via existing TaskForm, create from empty CTA, delete confirmation and refreshed complete statistics reuse existing CRUD handlers')

  await route('profile');await page.locator('.profile-logout').click()
  await expect(page.locator('.profile-logout')).to_be_disabled()
  await expect(page.locator('.profile-logout')).to_have_text('Abmeldung läuft …')
  await expect(page.locator('.profile-view').get_by_role('alert')).to_contain_text('Abmeldung ist fehlgeschlagen')
  await expect(page.locator('.profile-logout')).to_be_enabled()
  checks.append('isolated logout callback shows pending/disabled state and actionable failure; no claim of real signout in this fixture')
  assert not errors,errors
  await browser.close()
 OUT.joinpath('browser-dashboard-profile-results.json').write_text(json.dumps({'scope':'explicitly isolated in-memory TaskRepository, synthetic identity and simulated logout; NOT real Firebase/Auth/Firestore integration','counterScope':'cumulative per fixture document; 3/54/1000 read-only cases share a document; CRUD uses a fresh document and is explicitly marked','testIdentity':'Mira Sommer <mira@example.test>','fixedTestClock':'2026-10-09T10:00:00Z','timezone':'Europe/Berlin','passed':len(checks),'checks':checks,'queryMetrics':queries,'metrics':metrics,'pageErrors':errors},indent=2)+'\n')
 print(json.dumps({'passed':len(checks),'checks':checks,'queryMetrics':queries},indent=2))

asyncio.run(main())
