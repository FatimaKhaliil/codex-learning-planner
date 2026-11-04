import asyncio, json, os, secrets, uuid
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright, expect

OUT=Path(os.environ.get('AUTH_BROWSER_OUT','work/aufgabe-04-implementation/auth-browser'))
OUT.mkdir(parents=True,exist_ok=True)
results=[]
async def check(name, action):
    await action()
    results.append({'check':name,'status':'passed'})
    print(name+': passed',flush=True)

async def main():
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,timeout=15000,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'])
    context=await browser.new_context(viewport={'width':1440,'height':800})
    blocked_requests=[]
    async def local_only(route):
      if route.request.url.startswith(('http://127.0.0.1:','http://localhost:')):
        await route.continue_()
      else:
        parsed=urlparse(route.request.url)
        blocked_requests.append({'origin':parsed.netloc,'path':parsed.path,'blocked':True})
        await route.abort('blockedbyclient')
    await context.route('**/*',local_only)
    page=await context.new_page()
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    base=os.environ.get('AUTH_BROWSER_BASE_URL','http://127.0.0.1:5180/').rstrip('/')+'/'
    assert base.startswith('http://127.0.0.1:') or base.startswith('http://localhost:'), 'Auth regression must target loopback'
    email='browser-'+str(uuid.uuid4())+'@example.test'
    password=secrets.token_urlsafe(24)
    auth_base='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/'
    accounts=[(email,password)]
    cleanup_success=True
    try:
      for route in ['dashboard','tasks','calendar','profile']:
        await page.goto(base+'#/'+route,wait_until='networkidle')
        await expect(page.get_by_role('heading',name='Willkommen zurück')).to_be_visible()
        await expect(page).to_have_url(base+'#/login')
        await expect(page.locator('.planner-layout')).to_have_count(0)
      results.append({'check':'All four authenticated routes are protected','status':'passed'})
      await page.get_by_role('button',name='Anmelden',exact=True).click()
      await expect(page.locator('#email-error')).to_be_visible()
      await expect(page.locator('#password-error')).to_be_visible()
      await expect(page.locator('#email')).to_be_focused()
      results.append({'check':'Required fields and focus on first invalid field','status':'passed'})
      await page.locator('#email').fill('invalid-address')
      await page.locator('#password').fill(password)
      await page.get_by_role('button',name='Anmelden',exact=True).click()
      await expect(page.locator('#email-error')).to_contain_text('gültige')
      await page.get_by_role('button',name='Passwort anzeigen',exact=True).click()
      await expect(page.locator('#password')).to_have_attribute('type','text')
      await page.get_by_role('button',name='Passwort verbergen',exact=True).click()
      await expect(page.locator('#password')).to_have_attribute('type','password')
      results.append({'check':'Invalid email and password visibility controls','status':'passed'})
      await page.get_by_role('link',name='Jetzt registrieren').click()
      await expect(page.get_by_role('heading',name='Dein Lernplan beginnt hier',exact=True)).to_be_visible()
      await page.locator('#email').fill(email)
      await page.locator('#password').fill(password[:5])
      await page.locator('#confirmation').fill(password[:5])
      await page.get_by_role('button',name='Konto erstellen',exact=True).click()
      await expect(page.locator('#password-error')).to_contain_text('mindestens 6')
      await page.locator('#password').fill(password)
      await page.locator('#confirmation').fill(secrets.token_urlsafe(20))
      await page.get_by_role('button',name='Konto erstellen',exact=True).click()
      await expect(page.locator('#confirmation-error')).to_contain_text('nicht überein')
      results.append({'check':'Registration rejects short and mismatching passwords','status':'passed'})
      await page.locator('#confirmation').fill(password)
      async def delay(route):
        await asyncio.sleep(1)
        await route.continue_()
      await page.route('**/accounts:signUp*',delay)
      await page.get_by_role('button',name='Konto erstellen',exact=True).click()
      await expect(page.get_by_role('button',name='Konto wird erstellt')).to_be_disabled()
      await page.screenshot(path=str(OUT/'registration-loading.png'),full_page=True)
      await expect(page.get_by_role('heading',name='Deine Übersicht',exact=True)).to_be_visible()
      await expect(page).to_have_url(base+'#/dashboard')
      await expect(page.locator('.profile-link small')).to_have_text(email)
      await page.unroute('**/accounts:signUp*',delay)
      results.append({'check':'Real UI registration, loading state, and protected dashboard','status':'passed'})
      await page.reload(wait_until='networkidle')
      await expect(page.get_by_role('heading',name='Deine Übersicht',exact=True)).to_be_visible()
      results.append({'check':'Firebase session restored after reload','status':'passed'})
      tab=await context.new_page()
      await tab.goto(base+'#/dashboard',wait_until='networkidle')
      await expect(tab.get_by_role('heading',name='Deine Übersicht',exact=True)).to_be_visible()
      await page.get_by_role('button',name='Abmelden',exact=True).click()
      await expect(page.get_by_role('heading',name='Willkommen zurück')).to_be_visible()
      await expect(tab.get_by_role('heading',name='Willkommen zurück')).to_be_visible(timeout=10000)
      await tab.close()
      results.append({'check':'Logout removes protected content in both open tabs','status':'passed'})
      await page.locator('#email').fill(email)
      await page.locator('#password').fill(secrets.token_urlsafe(24))
      await page.get_by_role('button',name='Anmelden',exact=True).click()
      await expect(page.get_by_role('alert')).to_contain_text('stimmen nicht überein')
      await expect(page.locator('.planner-layout')).to_have_count(0)
      results.append({'check':'Wrong password shows German error and denies dashboard','status':'passed'})
      await page.get_by_role('link',name='Jetzt registrieren').click()
      await expect(page.get_by_role('heading',name='Dein Lernplan beginnt hier',exact=True)).to_be_visible()
      await page.locator('#email').fill(email)
      await page.locator('#password').fill(password)
      await page.locator('#confirmation').fill(password)
      await page.get_by_role('button',name='Konto erstellen',exact=True).click()
      await expect(page.get_by_role('alert')).to_contain_text('bereits ein Konto')
      results.append({'check':'Duplicate registration shows actionable error','status':'passed'})
      await page.get_by_role('link',name='Zur Anmeldung').click()
      await expect(page.get_by_role('heading',name='Willkommen zurück',exact=True)).to_be_visible()
      await page.locator('#email').fill(email)
      await page.locator('#password').fill(password)
      await page.get_by_role('button',name='Anmelden',exact=True).click()
      await expect(page.get_by_role('heading',name='Deine Übersicht',exact=True)).to_be_visible()
      await page.screenshot(path=str(OUT/'dashboard-desktop.png'),full_page=True)
      await page.set_viewport_size({'width':390,'height':844})
      await page.screenshot(path=str(OUT/'dashboard-mobile.png'),full_page=True)
      assert await page.evaluate('document.documentElement.scrollWidth === document.documentElement.clientWidth')
      await page.locator('.header-profile').click()
      await expect(page.get_by_role('heading',name='Dein Profil',exact=True)).to_be_visible()
      await expect(page.locator('#profile-email')).to_have_value(email)
      await expect(page.locator('#profile-name')).to_have_value('')
      assert not await page.locator('#profile-name').evaluate('(element) => element.readOnly')
      assert await page.locator('#profile-email').evaluate('(element) => element.readOnly')
      await page.locator('.profile-view').get_by_role('button',name='Abmelden',exact=True).click()
      await expect(page.get_by_role('heading',name='Willkommen zurück')).to_be_visible()
      results.append({'check':'Real profile identity, editable name and readonly email; mobile logout and no horizontal overflow','status':'passed'})
      await page.get_by_role('link',name='Passwort vergessen?').click()
      await expect(page.get_by_role('heading',name='Passwort zurücksetzen',exact=True)).to_be_visible()
      await page.locator('#email').fill(email)
      await page.get_by_role('button',name='Link zum Zurücksetzen senden',exact=True).click()
      await expect(page.get_by_role('status')).to_contain_text('Falls ein Konto')
      response=await context.request.get('http://127.0.0.1:9099/emulator/v1/projects/demo-learning-planner/oobCodes')
      data=await response.json()
      assert any(item.get('email')==email and item.get('requestType')=='PASSWORD_RESET' for item in data['oobCodes'])
      await page.screenshot(path=str(OUT/'reset-confirmation-mobile.png'),full_page=True)
      results.append({'check':'UI reset requests a real emulator reset action','status':'passed'})
      await page.locator('#email').fill(str(uuid.uuid4())+'@example.test')
      await page.get_by_role('button',name='Link zum Zurücksetzen senden',exact=True).click()
      await expect(page.get_by_role('status')).to_contain_text('Falls ein Konto')
      results.append({'check':'Unknown reset address gets the same neutral confirmation','status':'passed'})
      await page.locator('#email').fill(email)
      await page.route('**/accounts:sendOobCode*',lambda route: route.abort('internetdisconnected'))
      await page.get_by_role('button',name='Link zum Zurücksetzen senden',exact=True).click()
      await expect(page.get_by_role('alert')).to_contain_text('Internetverbindung',timeout=15000)
      await page.screenshot(path=str(OUT/'network-error-mobile.png'),full_page=True)
      await page.unroute('**/accounts:sendOobCode*')
      results.append({'check':'Network failure gives actionable error without false success','status':'passed'})
      # The second account is created only in the local Auth emulator. It is not
      # injected into React; the UI must receive identity through Firebase Auth.
      second_email='switch-'+str(uuid.uuid4())+'@example.test'
      second_password=secrets.token_urlsafe(24)
      accounts.append((second_email,second_password))
      created=await context.request.post(auth_base+'accounts:signUp?key=emulator-only',data={'email':second_email,'password':second_password,'returnSecureToken':True})
      assert created.ok
      second=await created.json()
      first_name='Wechsel'+uuid.uuid4().hex[:6]
      second_name=first_name+' Testkonto'
      updated=await context.request.post(auth_base+'accounts:update?key=emulator-only',data={'idToken':second['idToken'],'displayName':second_name,'returnSecureToken':True})
      assert updated.ok
      await page.goto(base+'#/login',wait_until='networkidle')
      await page.locator('#email').fill(second_email)
      await page.locator('#password').fill(second_password)
      await page.get_by_role('button',name='Anmelden',exact=True).click()
      await expect(page.get_by_role('heading',name='Deine Übersicht',exact=True)).to_be_visible()
      await expect(page.locator('.overview-intro h2')).to_have_text('Hallo '+first_name+', schön, dass du da bist.')
      await expect(page.locator('.profile-link small')).to_have_text(second_email)
      await page.locator('.header-profile').click()
      await expect(page.locator('#profile-name')).to_have_value(second_name)
      await expect(page.locator('#profile-email')).to_have_value(second_email)
      await expect(page.locator('.profile-identity-copy strong')).to_have_text(second_name)
      assert not await page.locator('#profile-name').evaluate('(element) => element.readOnly')
      assert await page.locator('#profile-email').evaluate('(element) => element.readOnly')
      await expect(page.get_by_text(email,exact=True)).to_have_count(0)
      await page.reload(wait_until='networkidle')
      await expect(page.locator('#profile-name')).to_have_value(second_name)
      await expect(page.locator('#profile-email')).to_have_value(second_email)
      await page.screenshot(path=str(OUT/'profile-second-account-mobile.png'),full_page=True)
      results.append({'check':'Second real emulator account supplies profile and dashboard displayName/email; identity persists after reload','status':'passed'})
      await page.set_viewport_size({'width':1440,'height':800})
      await page.locator('.profile-view').get_by_role('button',name='Abmelden',exact=True).click()
      await expect(page.get_by_role('heading',name='Willkommen zurück')).to_be_visible()
      await expect(page.locator('.planner-layout')).to_have_count(0)
      await expect(page.locator('.profile-view')).to_have_count(0)
      for route in ['profile','dashboard','tasks','calendar']:
        await page.goto(base+'#/'+route,wait_until='networkidle')
        await expect(page).to_have_url(base+'#/login')
        await expect(page.locator('.planner-layout')).to_have_count(0)
      await expect(page.get_by_text(second_name,exact=True)).to_have_count(0)
      results.append({'check':'Logout removes protected identity and all four routes remain inaccessible','status':'passed'})
      await page.locator('#email').fill(email)
      await page.locator('#password').fill(password)
      await page.get_by_role('button',name='Anmelden',exact=True).click()
      await expect(page.get_by_role('heading',name='Deine Übersicht',exact=True)).to_be_visible()
      await expect(page.locator('.overview-intro h2')).to_have_text('Hallo, schön, dass du da bist.')
      await expect(page.locator('.profile-link small')).to_have_text(email)
      await page.locator('.profile-link').click()
      await expect(page.locator('#profile-name')).to_have_value('')
      await expect(page.locator('#profile-email')).to_have_value(email)
      await expect(page.get_by_text(second_name,exact=True)).to_have_count(0)
      await page.screenshot(path=str(OUT/'profile-first-account-desktop.png'),full_page=True)
      await page.locator('.profile-view').get_by_role('button',name='Abmelden',exact=True).click()
      await expect(page.get_by_role('heading',name='Willkommen zurück')).to_be_visible()
      results.append({'check':'Switching back restores the original account without the second account’s identity','status':'passed'})
      visual=[]
      for name,w,h,mobile in [('desktop',1440,800,False),('mobile',390,844,True),('small-mobile',320,812,True)]:
        c=await browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
        pg=await c.new_page()
        for mode,path in [('login','login'),('register','register'),('reset','reset-password')]:
          await pg.goto(base+'#/'+path,wait_until='networkidle')
          await expect(pg.locator('h1')).to_be_visible()
          await pg.evaluate('document.fonts.ready')
          metrics=await pg.evaluate('''() => ({clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,assets:[...document.querySelectorAll('img')].map(i=>({src:new URL(i.src).pathname,loaded:i.complete&&i.naturalWidth>0,width:i.width,height:i.height,visible:!!i.getClientRects().length}))})''')
          assert metrics['clientWidth']==metrics['scrollWidth']
          assert all(i['loaded'] for i in metrics['assets'])
          await pg.screenshot(path=str(OUT/f'{mode}-{name}.png'),full_page=True)
          visual.append({'mode':mode,'viewport':{'width':w,'height':h},'mobileEmulation':mobile,**metrics})
        await c.close()
      results.append({'check':'Nine responsive views have no horizontal overflow and all local image assets load','status':'passed'})
      assert all(request=={'origin':'www.google.com','path':'/images/cleardot.gif','blocked':True} for request in blocked_requests)
      assert not errors, errors
      results.append({'check':'No uncaught application JavaScript errors during flows','status':'passed'})
    finally:
      for cleanup_email,cleanup_password in accounts:
        cleanup_login=await context.request.post(auth_base+'accounts:signInWithPassword?key=emulator-only',data={'email':cleanup_email,'password':cleanup_password,'returnSecureToken':True})
        if not cleanup_login.ok:
          # The failed test may not have reached account creation.
          data=await cleanup_login.json()
          if data.get('error',{}).get('message') not in ['EMAIL_NOT_FOUND','INVALID_LOGIN_CREDENTIALS']:
            cleanup_success=False
          continue
        credential=await cleanup_login.json()
        cleanup=await context.request.post(auth_base+'accounts:delete?key=emulator-only',data={'idToken':credential['idToken']})
        cleanup_success=cleanup_success and cleanup.ok
      await context.close()
      await browser.close()
    assert cleanup_success
    results.append({'check':'Only this run’s temporary Auth emulator accounts are deleted','status':'passed'})
    OUT.joinpath('results.json').write_text(json.dumps({'browser':'Chromium','scope':'Real Firebase SDK against local Auth Emulator; no production email delivery','checks':results,'visual':visual,'pageErrors':errors,'blockedOffOriginRequests':blocked_requests},indent=2)+'\n')
    print('TOTAL PASSED: '+str(len(results)),flush=True)

try:
  asyncio.run(main())
except Exception as error:
  import sys
  print(json.dumps({'status':'failed','type':type(error).__name__,'completedChecks':results}),flush=True)
  sys.exit(1)
