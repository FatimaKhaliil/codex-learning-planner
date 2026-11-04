"""Isolated profile-name UI checks; callback is NOT Firebase persistence evidence."""
import asyncio,json,os
from datetime import datetime,timezone
from pathlib import Path
from playwright.async_api import async_playwright,expect

BASE=os.environ.get('PROFILE_NAME_BROWSER_BASE_URL','http://127.0.0.1:5185/').rstrip('/')
OUT=Path('docs/visual/aufgabe-06/name-fix');OUT.mkdir(parents=True,exist_ok=True)

async def main():
 checks=[];metrics=[];errors=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  context=await browser.new_context(viewport={'width':1440,'height':1000},locale='de-DE',timezone_id='Europe/Berlin')
  page=await context.new_page();page.set_default_timeout(12000);page.set_default_navigation_timeout(30000)
  page.on('pageerror',lambda error:errors.append(str(error)))
  await page.clock.install(time=datetime(2026,10,9,10,tzinfo=timezone.utc))
  await page.goto(BASE+'/tests/fixtures/profile-name.html#/profile',wait_until='domcontentloaded')
  await expect(page.locator('.profile-view .progress-card')).to_be_visible()
  await page.add_style_tag(content='#fixture-controls{display:none}')
  async def audit():return await page.evaluate('({...window.profileNameTestAudit})')
  async def control(name):await page.get_by_role('button',name=name,exact=True,include_hidden=True).evaluate('(e)=>e.click()')
  async def confirmed(name,initials):
   await expect(page.locator('.profile-name-form .notice.success')).to_have_text('Name gespeichert.')
   await expect(page.locator('#profile-name')).to_have_value(name)
   await expect(page.locator('.profile-identity-copy strong')).to_have_text(name)
   await expect(page.locator('.planner-account strong')).to_have_text(name)
   await expect(page.locator('.profile-avatar')).to_have_text(initials)
   await expect(page.locator('.planner-account .avatar')).to_have_text(initials)
  initial=await audit()
  await expect(page.locator('#profile-name')).to_have_value('')
  await expect(page.locator('#profile-email')).to_have_value('name-ui@example.test')
  assert await page.locator('#profile-email').evaluate('(e)=>e.readOnly')
  await expect(page.locator('.profile-identity-copy strong')).to_have_text('name-ui@example.test')
  await expect(page.locator('.profile-avatar')).to_have_text('N')
  await page.locator('#profile-name').fill('Ungespeicherter Name')
  await expect(page.locator('.profile-identity-copy strong')).to_have_text('name-ui@example.test')
  await expect(page.locator('.planner-account strong')).to_have_text('name-ui@example.test')
  assert await audit()==initial
  checks.append('initial email fallback and editable name; unsaved draft never changes identity, avatar, or repository counters; email stays read-only')

  await page.locator('#profile-name').fill(' \u0085\u00a0\t ')
  await page.get_by_role('button',name='Namen speichern',exact=True).click()
  await expect(page.locator('#profile-name-error')).to_have_text('Bitte gib einen Namen ein.')
  await expect(page.locator('#profile-name')).to_be_focused()
  await page.locator('#profile-name').fill('A'*101)
  await page.locator('#profile-name').press('Enter')
  await expect(page.locator('#profile-name-error')).to_contain_text('höchstens 100 Zeichen')
  await expect(page.locator('#profile-name')).to_have_attribute('maxlength','200')
  assert (await audit())['saveAttempts']==0
  checks.append('Unicode/ASCII whitespace-only and 101-character inputs are rejected before callback; first invalid field focused; input maxLength 200 supports 100 astral Unicode code points')

  emoji_name='😀'*100
  await page.locator('#profile-name').fill(emoji_name)
  await page.locator('#profile-name').press('Enter')
  await expect(page.locator('.profile-name-form')).to_have_attribute('aria-busy','true')
  await expect(page.locator('#profile-name')).to_be_disabled()
  await expect(page.locator('.profile-name-save')).to_be_disabled()
  await expect(page.locator('.profile-logout')).to_be_disabled()
  await expect(page.locator('.profile-identity-copy strong')).to_have_text('name-ui@example.test')
  await expect(page.locator('.profile-name-form .notice.success')).to_have_count(0)
  await page.locator('.profile-name-form').evaluate('e=>{for(let i=0;i<3;i++)e.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))}')
  await page.keyboard.press('Enter')
  assert (await audit())['saveAttempts']==1
  assert (await audit())['successfulSaves']==0
  await page.screenshot(path=str(OUT/'profile-name-pending-1440.png'),full_page=True)
  await confirmed(emoji_name,'😀')
  assert (await audit())['saveAttempts']==1 and (await audit())['successfulSaves']==1
  checks.append('100 astral Unicode code points saved through Enter; pending input/save/logout disabled, old identity retained until acknowledgment, repeated submit events create exactly one callback attempt')

  await page.locator('#profile-name').fill(' \u0085Mira Sommer\u0085\u00a0 ')
  await page.get_by_role('button',name='Namen speichern',exact=True).click()
  await confirmed('Mira Sommer','MS')
  await page.locator('.app-navigation a[href="#/dashboard"]').click()
  await expect(page.locator('.overview-intro h2')).to_have_text('Hallo Mira, schön, dass du da bist.')
  await page.locator('.planner-account .profile-link').click()
  await expect(page.locator('#profile-name')).to_have_value('Mira Sommer')
  assert (await audit())['taskReads']==initial['taskReads']
  assert (await audit())['taskWrites']==0
  checks.append('Unicode edge whitespace trimmed; acknowledged name, sidebar/profile initials and dashboard greeting update immediately without reload or extra task reads/writes')

  await control('Speicherfehler aktivieren')
  await page.locator('#profile-name').fill('Nora Winter')
  await page.locator('#profile-name').press('Enter')
  await expect(page.locator('.profile-name-form .notice.error')).to_contain_text('Internetverbindung')
  await expect(page.locator('.profile-name-form .notice.success')).to_have_count(0)
  await expect(page.locator('.profile-identity-copy strong')).to_have_text('Mira Sommer')
  await expect(page.locator('.planner-account strong')).to_have_text('Mira Sommer')
  await expect(page.locator('.profile-avatar')).to_have_text('MS')
  await expect(page.locator('#profile-name')).to_have_value('Nora Winter')
  await expect(page.locator('.profile-name-save')).to_be_enabled()
  failed=await audit();assert failed['saveAttempts']==3 and failed['successfulSaves']==2
  await page.screenshot(path=str(OUT/'profile-name-error-1440.png'),full_page=True)
  await control('Speicherfehler beheben')
  await page.locator('#profile-name').focus();await page.keyboard.press('Enter')
  await confirmed('Nora Winter','NW')
  successful=await audit();assert successful['saveAttempts']==4 and successful['successfulSaves']==3
  assert successful['taskReads']==initial['taskReads'] and successful['taskWrites']==0
  await page.locator('.app-navigation a[href="#/dashboard"]').click()
  await expect(page.locator('.overview-intro h2')).to_have_text('Hallo Nora, schön, dass du da bist.')
  await page.locator('.planner-account .profile-link').click()
  await expect(page.locator('#profile-name')).to_have_value('Nora Winter')
  checks.append('simulated SDK network error preserves confirmed name/initials and draft with no false success; Enter retry succeeds and updates dashboard/profile/sidebar without reload')

  for width,height in [(1440,1000),(390,1000),(320,1000)]:
   await page.set_viewport_size({'width':width,'height':height});await page.evaluate('document.fonts.ready')
   await page.screenshot(path=str(OUT/f'profile-name-{width}.png'),full_page=True)
   data=await page.evaluate('''()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,profile:box('.profile-view'),nameForm:box('.profile-name-form'),input:box('#profile-name'),save:box('.profile-name-save'),email:box('#profile-email'),progress:box('.progress-card'),logout:box('.profile-logout'),images:[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width>0&&r.height>0}).map(i=>{const r=i.getBoundingClientRect();return {src:new URL(i.src).pathname,loaded:i.complete&&i.naturalWidth>0,nativeWidth:i.naturalWidth,nativeHeight:i.naturalHeight,width:r.width,height:r.height}})}}''')
   assert data['width']==data['scrollWidth'],data
   assert all(i['loaded'] and i['width']==i['nativeWidth'] and i['height']==i['nativeHeight'] for i in data['images']),data
   assert await page.locator('#profile-email').evaluate('(e)=>e.readOnly')
   metrics.append(data)
  await page.locator('#profile-email').focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('cannot-change@example.test')
  await expect(page.locator('#profile-email')).to_have_value('name-ui@example.test')
  checks.append('saved-name form screenshots at 1440/390/320 with isolated task progress; no horizontal overflow, all visible original assets at native geometry, email uneditable by keyboard')

  # Hold the synthetic response explicitly so this race cannot pass by timing luck.
  await page.set_viewport_size({'width':1440,'height':1000})
  await control('Speicherrückmeldung anhalten')
  await page.locator('#profile-name').fill('Tessa Sommer')
  await page.locator('#profile-name').press('Enter')
  await expect(page.locator('.profile-name-form')).to_have_attribute('aria-busy','true')
  beforeNavigation=await audit()
  await page.locator('.app-navigation a[href="#/dashboard"]').click()
  await expect(page.locator('.overview-intro h2')).to_have_text('Hallo Nora, schön, dass du da bist.')
  await page.locator('.planner-account .profile-link').click()
  await expect(page.locator('.profile-name-form')).to_have_attribute('aria-busy','true')
  await expect(page.locator('#profile-name')).to_be_disabled()
  await expect(page.locator('.profile-name-save')).to_be_disabled()
  await expect(page.locator('.profile-name-save')).to_have_text('Name wird gespeichert …')
  await expect(page.locator('.profile-identity-copy strong')).to_have_text('Nora Winter')
  await page.locator('.profile-name-form').evaluate('e=>e.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))')
  assert (await audit())['saveAttempts']==beforeNavigation['saveAttempts']==5
  assert (await audit())['successfulSaves']==3
  assert (await audit())['taskReads']==initial['taskReads']
  await control('Speicherrückmeldung freigeben')
  await expect(page.locator('.profile-identity-copy strong')).to_have_text('Tessa Sommer')
  await expect(page.locator('#profile-name')).to_have_value('Tessa Sommer')
  await expect(page.locator('#profile-name')).to_be_enabled()
  await expect(page.locator('.profile-name-save')).to_be_enabled()
  await expect(page.locator('.profile-avatar')).to_have_text('TS')
  await expect(page.locator('.planner-account .avatar')).to_have_text('TS')
  assert (await audit())['saveAttempts']==5 and (await audit())['successfulSaves']==4
  assert (await audit())['taskReads']==initial['taskReads'] and (await audit())['taskWrites']==0
  checks.append('global pending save survives dashboard/profile remount: input/save remain disabled until held response acknowledges the new name, duplicate submit is ignored, no extra task reads')
  assert not errors,errors
  final=await audit();await browser.close()
 OUT.joinpath('browser-profile-name-results.json').write_text(json.dumps({'scope':'explicitly isolated in-memory TaskRepository and asynchronous identity callback; NOT Firebase SDK persistence/Auth/Firestore integration','syntheticInitialIdentity':{'displayName':None,'email':'name-ui@example.test'},'confirmedScreenshotIdentity':'Nora Winter','fixedTestClock':'2026-10-09T10:00:00Z','timezone':'Europe/Berlin','passed':len(checks),'checks':checks,'audit':{'initial':initial,'afterFailedSave':failed,'afterRetry':successful,'final':final,'additionalTaskReads':final['taskReads']-initial['taskReads']},'metrics':metrics,'pageErrors':errors},indent=2)+'\n')
 print(json.dumps({'passed':len(checks),'checks':checks,'audit':{'initial':initial,'afterFailedSave':failed,'final':final}},indent=2))

asyncio.run(main())
