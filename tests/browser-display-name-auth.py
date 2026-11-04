"""Profile-name regression using real Firebase Auth against its local emulator.

No Auth state is injected into React. Accounts and credentials are temporary;
only this run's users are removed, including when an assertion fails.
"""

import asyncio
import json
import os
import secrets
import sys
import uuid
from pathlib import Path

from playwright.async_api import async_playwright, expect


OUT = Path(os.environ.get(
    'DISPLAY_NAME_BROWSER_OUT', 'work/aufgabe-06-name-fix/display-name-browser'))
OUT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('AUTH_BROWSER_BASE_URL', 'http://127.0.0.1:5185/').rstrip('/') + '/'
AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/'
checks = []


def passed(label):
    checks.append({'check': label, 'status': 'passed'})
    print(label + ': passed', flush=True)


async def main():
    assert BASE.startswith(('http://127.0.0.1:', 'http://localhost:')), 'Loopback required'
    accounts = [
        ('name-' + str(uuid.uuid4()) + '@example.test', secrets.token_urlsafe(24)),
        ('other-' + str(uuid.uuid4()) + '@example.test', secrets.token_urlsafe(24)),
    ]
    cleanup_ok = True
    errors = []
    external_requests = []
    update_requests = []
    screenshots = []
    release = None
    update_gate = None
    abort_updates = False
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path='/usr/bin/chromium', headless=True, timeout=15000,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'])
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})

        async def local_only(route):
            url = route.request.url
            if not url.startswith(('http://127.0.0.1:', 'http://localhost:')):
                # Keep only the origin in evidence; no payload, query or token.
                from urllib.parse import urlparse
                parsed = urlparse(url)
                external_requests.append({'origin': parsed.netloc, 'path': parsed.path, 'blocked': True})
                await route.abort('blockedbyclient')
            elif '/accounts:update' in url and route.request.method == 'POST' and abort_updates:
                await route.abort('internetdisconnected')
            elif '/accounts:update' in url and route.request.method == 'POST' and update_gate:
                # Hold the real emulator response, rather than stacking page and
                # context route handlers or changing application authentication.
                response = await route.fetch()
                entered, gate = update_gate
                entered.set()
                await gate.wait()
                await route.fulfill(response=response)
            else:
                await route.continue_()

        await context.route('**/*', local_only)
        page = await context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: update_requests.append(True)
                if '/accounts:update' in request.url and request.method == 'POST' else None)
        loads = []
        page.on('load', lambda: loads.append(True))

        async def login(target, account):
            await target.goto(BASE + '#/login', wait_until='domcontentloaded')
            await expect(target.get_by_role('heading', name='Willkommen zurück', exact=True)).to_be_visible()
            await target.locator('#email').fill(account[0])
            await target.locator('#password').fill(account[1])
            await target.get_by_role('button', name='Anmelden', exact=True).click()
            await expect(target.get_by_role('heading', name='Deine Übersicht', exact=True)).to_be_visible()

        async def profile(target):
            await target.locator('.profile-link').click()
            await expect(target.get_by_role('heading', name='Dein Profil', exact=True)).to_be_visible()

        async def logout(target):
            await target.locator('.sidebar-signout').click()
            await expect(target.get_by_role('heading', name='Willkommen zurück', exact=True)).to_be_visible()
            await expect(target.locator('.planner-layout')).to_have_count(0)

        async def identity(name, email, initials):
            await expect(page.locator('#profile-name')).to_have_value(name)
            await expect(page.locator('#profile-email')).to_have_value(email)
            await expect(page.locator('.profile-identity-copy strong')).to_have_text(name or email)
            await expect(page.locator('.profile-link strong')).to_have_text(name or email)
            await expect(page.locator('.profile-link small')).to_have_text(email)
            await expect(page.locator('.avatar')).to_have_text(initials)
            await expect(page.locator('.profile-avatar')).to_have_text(initials)

        async def dashboard(name):
            await page.locator('.app-navigation a[href="#/dashboard"]').click()
            first = name.split()[0] if name else ''
            greeting = 'Hallo ' + first + ', schön, dass du da bist.' if first else 'Hallo, schön, dass du da bist.'
            await expect(page.locator('.overview-intro h2')).to_have_text(greeting)
            await profile(page)

        async def save(name):
            await page.locator('#profile-name').fill(name)
            await page.locator('.profile-name-save').click()
            await expect(page.locator('.profile-name-form [role="status"]')).to_have_text('Name gespeichert.')

        try:
            # REST creates emulator accounts only. The actual login and all name
            # changes under test use the application's Firebase SDK UI path.
            for account in accounts:
                response = await context.request.post(AUTH + 'accounts:signUp?key=emulator-only', data={
                    'email': account[0], 'password': account[1], 'returnSecureToken': True})
                assert response.ok, 'Temporary Auth emulator account creation failed'
            await login(page, accounts[0])
            await profile(page)
            await identity('', accounts[0][0], 'N')
            assert not await page.locator('#profile-name').evaluate('(input) => input.readOnly')
            assert await page.locator('#profile-email').evaluate('(input) => input.readOnly')
            await expect(page.locator('.profile-name-save')).to_be_enabled()
            passed('A real nameless Auth account starts with editable name, readonly email and account fallback')

            await page.locator('#profile-name').fill('   \t  ')
            before = len(update_requests)
            await page.locator('.profile-name-save').click()
            await expect(page.locator('#profile-name-error')).to_contain_text('Namen ein')
            await expect(page.locator('#profile-name')).to_be_focused()
            assert len(update_requests) == before
            await page.locator('#profile-name').fill('X' * 101)
            await page.locator('.profile-name-save').click()
            await expect(page.locator('#profile-name-error')).to_contain_text('100')
            assert len(update_requests) == before
            passed('Whitespace-only and 101-character names are rejected before any accounts:update request')

            first_name = 'Mira Beispiel'
            before = len(update_requests)
            load_count = len(loads)
            await save(' \t ' + first_name + '  ')
            await identity(first_name, accounts[0][0], 'MB')
            await dashboard(first_name)
            assert len(loads) == load_count, 'Identity refresh unexpectedly required a page reload'
            assert len(update_requests) == before + 1
            passed('Saving trims surrounding whitespace and immediately refreshes profile, sidebar, both avatars and dashboard without reload')

            await page.reload(wait_until='domcontentloaded')
            await identity(first_name, accounts[0][0], 'MB')
            await dashboard(first_name)
            passed('Saved displayName survives a browser reload')
            await logout(page)
            await login(page, accounts[0])
            await profile(page)
            await identity(first_name, accounts[0][0], 'MB')
            await dashboard(first_name)
            passed('Saved displayName survives logout and a fresh UI login')

            changed_name = 'Lea Lernen'
            await save(changed_name)
            await identity(changed_name, accounts[0][0], 'LL')
            await dashboard(changed_name)
            passed('Editing an existing displayName refreshes all identity surfaces')

            boundary_name = 'B' * 100
            await save(boundary_name)
            await identity(boundary_name, accounts[0][0], 'B')
            await save(changed_name)
            await identity(changed_name, accounts[0][0], 'LL')
            passed('The 100-character boundary is accepted and can be changed back')

            entered = asyncio.Event()
            release = asyncio.Event()

            update_gate = (entered, release)
            pending_name = 'Noah Wissen'
            await page.locator('#profile-name').fill(pending_name)
            before = len(update_requests)
            await page.locator('.profile-name-save').click()
            await asyncio.wait_for(entered.wait(), timeout=10)
            await expect(page.locator('.profile-name-save')).to_be_disabled()
            await expect(page.locator('.profile-name-save')).to_contain_text('wird gespeichert')
            await expect(page.locator('#profile-name')).to_be_disabled()
            await expect(page.locator('.profile-logout')).to_be_disabled()
            await expect(page.locator('.profile-name-form')).to_have_attribute('aria-busy', 'true')
            await expect(page.locator('.profile-name-form [role="status"]')).to_have_count(0)
            # Rapid submit events bypass only the disabled-button safeguard.
            # The component's in-flight lock must still prevent duplicate API calls.
            await page.locator('.profile-name-form').evaluate('form => { for (let i=0;i<3;i++) form.requestSubmit() }')
            await page.wait_for_timeout(150)
            assert len(update_requests) == before + 1
            await page.locator('.app-navigation a[href="#/dashboard"]').click()
            await expect(page.get_by_role('heading', name='Deine Übersicht', exact=True)).to_be_visible()
            await profile(page)
            await expect(page.locator('.profile-name-save')).to_be_disabled()
            await expect(page.locator('.profile-name-save')).to_contain_text('wird gespeichert')
            await expect(page.locator('#profile-name')).to_be_disabled()
            await expect(page.locator('.profile-name-form')).to_have_attribute('aria-busy', 'true')
            await page.locator('.profile-name-form').evaluate('form => form.requestSubmit()')
            assert len(update_requests) == before + 1
            screenshot = 'name-saving-desktop.png'
            await page.screenshot(path=str(OUT / screenshot), full_page=True)
            screenshots.append(screenshot)
            release.set()
            await expect(page.locator('.profile-name-save')).to_be_enabled()
            update_gate = None
            await identity(pending_name, accounts[0][0], 'NW')
            assert len(update_requests) == before + 1
            passed('Pending state survives profile navigation and rapid repeated submissions make exactly one accounts:update request')

            abort_updates = True
            await page.locator('#profile-name').fill('Nicht Gespeichert')
            await page.locator('.profile-name-save').click()
            await expect(page.locator('.profile-name-form [role="alert"]')).to_contain_text('Internetverbindung', timeout=15000)
            await expect(page.locator('.profile-name-form [role="status"]')).to_have_count(0)
            await expect(page.locator('.profile-name-save')).to_be_enabled()
            await expect(page.locator('.profile-identity-copy strong')).to_have_text(pending_name)
            await expect(page.locator('.profile-link strong')).to_have_text(pending_name)
            await page.set_viewport_size({'width': 390, 'height': 844})
            screenshot = 'name-network-error-mobile.png'
            await page.screenshot(path=str(OUT / screenshot), full_page=True)
            screenshots.append(screenshot)
            abort_updates = False
            await page.reload(wait_until='domcontentloaded')
            await identity(pending_name, accounts[0][0], 'NW')
            await expect(page.locator('.profile-name-form [role="status"]')).to_have_count(0)
            await page.set_viewport_size({'width': 1440, 'height': 900})
            await dashboard(pending_name)
            passed('Aborted Auth update shows an error without success and leaves the saved identity unchanged after reload')

            # Hold A's real Auth request while another tab logs out and logs B in.
            # A's eventual completion must not publish A's identity into B's view.
            entered = asyncio.Event()
            release = asyncio.Event()
            update_gate = (entered, release)
            await page.locator('#profile-name').fill('Alte Sitzung')
            await page.locator('.profile-name-save').click()
            await asyncio.wait_for(entered.wait(), timeout=10)
            tab = await context.new_page()
            tab.on('pageerror', lambda error: errors.append(str(error)))
            await tab.goto(BASE + '#/profile', wait_until='domcontentloaded')
            await expect(tab.get_by_role('heading', name='Dein Profil', exact=True)).to_be_visible()
            await logout(tab)
            await expect(page.get_by_role('heading', name='Willkommen zurück', exact=True)).to_be_visible(timeout=10000)
            await login(tab, accounts[1])
            await expect(page.locator('.profile-link small')).to_have_text(accounts[1][0], timeout=10000)
            release.set()
            update_gate = None
            await page.wait_for_timeout(200)
            await profile(page)
            await identity('', accounts[1][0], 'O')
            await expect(page.locator('.profile-name-form [role="status"]')).to_have_count(0)
            await expect(page.get_by_text('Alte Sitzung', exact=True)).to_have_count(0)
            await dashboard('')
            await tab.close()
            passed('A delayed save from the previous account cannot overwrite the next account identity or report success there')

            await save('Sam Zweitkonto')
            await identity('Sam Zweitkonto', accounts[1][0], 'SZ')
            await dashboard('Sam Zweitkonto')
            await logout(page)
            await login(page, accounts[0])
            await profile(page)
            # The earlier request may legitimately persist A's own name. Its
            # completion is still restricted to A and must never change B.
            await identity('Alte Sitzung', accounts[0][0], 'AS')
            await dashboard('Alte Sitzung')
            await expect(page.get_by_text('Sam Zweitkonto', exact=True)).to_have_count(0)
            passed('Both accounts retain their own saved names after account switching')

            responsive = []
            for width, height in [(1440, 900), (390, 844), (320, 812)]:
                await page.set_viewport_size({'width': width, 'height': height})
                await expect(page.locator('#profile-name')).to_be_visible()
                assert await page.evaluate('document.documentElement.scrollWidth === document.documentElement.clientWidth')
                screenshot = 'profile-name-' + str(width) + '.png'
                await page.screenshot(path=str(OUT / screenshot), full_page=True)
                screenshots.append(screenshot)
                responsive.append({'width': width, 'height': height, 'horizontalOverflow': False})
            passed('Editable profile has no horizontal overflow at 1440, 390 and 320 pixels')
            # The unavailable local Firestore backend triggers WebChannel's
            # connectivity-image probe. Block it before network, and reject any
            # other off-origin attempt. Auth itself must use the local emulator.
            assert all(request == {'origin': 'www.google.com', 'path': '/images/cleardot.gif', 'blocked': True}
                       for request in external_requests), 'An unexpected off-origin request was attempted'
            assert not errors, 'An uncaught application error occurred'
            passed('Auth uses loopback; off-origin Firestore connectivity probes are blocked and no uncaught JavaScript errors occur')
        finally:
            if release:
                release.set()
            OUT.joinpath('diagnostics.json').write_text(json.dumps({
                'completedChecks': checks, 'externalRequestOrigins': external_requests,
                'pageErrors': errors,
            }, indent=2) + '\n')
            for email, password in accounts:
                try:
                    signed_in = await context.request.post(AUTH + 'accounts:signInWithPassword?key=emulator-only', data={
                        'email': email, 'password': password, 'returnSecureToken': True})
                    if not signed_in.ok:
                        data = await signed_in.json()
                        if data.get('error', {}).get('message') not in ('EMAIL_NOT_FOUND', 'INVALID_LOGIN_CREDENTIALS'):
                            cleanup_ok = False
                        continue
                    credential = await signed_in.json()
                    deleted = await context.request.post(AUTH + 'accounts:delete?key=emulator-only', data={
                        'idToken': credential['idToken']})
                    cleanup_ok = cleanup_ok and deleted.ok
                except Exception:
                    cleanup_ok = False
            await context.close()
            await browser.close()
        assert cleanup_ok, 'Temporary Auth emulator account cleanup failed'
        passed('Only this run\'s temporary Auth emulator accounts are deleted')
        OUT.joinpath('results.json').write_text(json.dumps({
            'scope': 'Real Firebase Auth SDK, local demo Auth emulator only; no successful Firestore integration claimed',
            'checks': checks, 'passed': len(checks), 'pageErrors': errors,
            'externalRequestOrigins': external_requests,
            'accountsUpdateRequests': len(update_requests),
            'responsive': responsive, 'screenshots': screenshots,
        }, indent=2) + '\n')
        print('TOTAL PASSED: ' + str(len(checks)), flush=True)


try:
    asyncio.run(main())
except Exception as error:
    # Do not print credentials, tokens, request bodies or full Playwright dumps.
    print(json.dumps({'status': 'failed', 'type': type(error).__name__, 'completedChecks': checks}), flush=True)
    sys.exit(1)
