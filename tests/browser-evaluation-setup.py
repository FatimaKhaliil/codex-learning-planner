"""Technical setup smoke only: no account, task action or usability evaluation."""

import asyncio
import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright


BASE = 'http://127.0.0.1:5187'
ALLOWED = {('127.0.0.1', 5187), ('127.0.0.1', 9099), ('127.0.0.1', 8081)}
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path,
                    default=Path('docs/verification/aufgabe-07-setup/browser-setup.json'))
OUT = parser.parse_args().output


async def main():
    blocked = []
    requests = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path=shutil.which('chromium'), headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = await browser.new_context()

        async def local_only(route):
            parsed = urlparse(route.request.url)
            if (parsed.hostname, parsed.port) not in ALLOWED:
                blocked.append(parsed.hostname)
                await route.abort('blockedbyclient')
            else:
                requests.append(parsed.netloc)
                await route.continue_()

        await context.route('**/*', local_only)
        page = await context.new_page()
        response = await page.goto(BASE + '/#/login', wait_until='networkidle')
        assert response and response.ok
        csp = response.headers.get('content-security-policy', '')
        assert 'connect-src' in csp and 'http://127.0.0.1:9099' in csp
        assert 'http://127.0.0.1:8081' in csp
        # A newly-created public sentinel proves the ignored credential directory
        # cannot be served, without ever opening an actual account file.
        probe = Path('.evaluation/http-deny-probe.json')
        with probe.open('x', encoding='utf-8') as target:
            target.write('{"publicSetupProbe":true}\n')
        try:
            paths = [
                '/.evaluation/http-deny-probe.json',
                '/.evaluation/http-deny-probe.json?import',
                '/.evaluation/http-deny-probe.json?raw',
                '/@fs/' + probe.resolve().as_posix(),
            ]
            for path in paths:
                denied = await context.request.get(BASE + path)
                assert denied.status == 403, 'Evaluation files must not be served'
        finally:
            probe.unlink()
        result = await page.evaluate('''async () => {
            const { firebaseApp } = await import('/src/lib/firebase.ts');
            const { authentication } = await import('/src/auth/firebaseAuth.ts');
            await import('/src/tasks/firebaseTasks.ts');
            const { getFirestore } = await import('/node_modules/.vite/deps/firebase_firestore.js');
            const db = getFirestore(firebaseApp);
            const options = firebaseApp.options;
            return {
                project: options.projectId,
                demoKey: options.apiKey === 'evaluation-only-api-key',
                authHost: authentication.auth?.emulatorConfig?.host,
                authPort: authentication.auth?.emulatorConfig?.port,
                firestoreHost: db._settings.host,
                firestoreSsl: db._settings.ssl,
            };
        }''')
        assert result == {
            'project': 'demo-learning-planner', 'demoKey': True,
            'authHost': '127.0.0.1', 'authPort': 9099,
            'firestoreHost': '127.0.0.1:8081', 'firestoreSsl': False,
        }, 'SDK emulator wiring does not match the fixed evaluation policy'
        csp_blocked = await page.evaluate('''async () => {
            try { await fetch('https://evaluation-blocked.invalid/probe'); return false; }
            catch { return true; }
        }''')
        assert csp_blocked and not blocked, 'CSP must block the probe before network routing'
        output = {
            'kind': 'technical-setup-smoke', 'browser': browser.version,
            'observedAtUtc': datetime.now(timezone.utc).isoformat(),
            'checks': {
                'reactLoaded': True, 'firebaseSdkEmulatorWiring': result,
                'evaluationCspPresent': True, 'externalProbeBlockedByCsp': True,
                'ignoredDirectoryHttpDenied': ['direct', 'import', 'raw', 'fs'],
                'externalRequestsReachedRouting': len(blocked),
            },
            'observedLocalOrigins': sorted(set(requests)),
            'limitations': [
                'No login, account creation, Firestore read/write or usability evaluation performed.',
                'SDK host settings alone do not establish emulator availability or data persistence.',
            ],
        }
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(output))
        await browser.close()


asyncio.run(main())
