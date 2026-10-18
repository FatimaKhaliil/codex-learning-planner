import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  deleteUser,
} from 'firebase/auth';

const app = initializeApp({ apiKey: 'emulator-only-api-key', projectId: 'demo-learning-planner', authDomain: 'demo-learning-planner.firebaseapp.com' }, `sdk-test-${randomUUID()}`);
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const email = `sdk-${randomUUID()}@example.test`;
const password = randomBytes(24).toString('base64url');
const newPassword = randomBytes(24).toString('base64url');
const events = [];
const results = [];
const unsubscribe = onAuthStateChanged(auth, user => events.push(Boolean(user)));
const observe = expected => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => { stop(); reject(new Error('auth-state-timeout')); }, 5000);
  const stop = onAuthStateChanged(auth, user => {
    if (Boolean(user) === expected) { clearTimeout(timeout); stop(); resolve(); }
  });
});
const check = async (label, action) => {
  await action();
  results.push({ check: label, result: 'passed' });
};
try {
  await check('initial onAuthStateChanged is signed out', () => observe(false));
  await check('Firebase SDK registration', async () => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    assert.equal(credential.user.email, email);
    await observe(true);
  });
  await check('duplicate registration rejected', async () => {
    await assert.rejects(createUserWithEmailAndPassword(auth, email, password), { code: 'auth/email-already-in-use' });
  });
  await check('sign-out and auth observer', async () => {
    await signOut(auth);
    await observe(false);
    assert.equal(auth.currentUser, null);
  });
  await check('incorrect password rejected', async () => {
    await assert.rejects(signInWithEmailAndPassword(auth, email, randomBytes(24).toString('base64url')), error => ['auth/wrong-password', 'auth/invalid-credential'].includes(error.code));
    assert.equal(auth.currentUser, null);
  });
  await check('Firebase SDK sign-in and auth observer', async () => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    assert.equal(credential.user.email, email);
    await observe(true);
  });
  await signOut(auth);
  await observe(false);
  await check('password reset request accepted by emulator', () => sendPasswordResetEmail(auth, email));
  const response = await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-learning-planner/oobCodes');
  assert.equal(response.status, 200);
  const data = await response.json();
  const reset = data.oobCodes.find(item => item.email === email && item.requestType === 'PASSWORD_RESET');
  assert.ok(reset?.oobCode);
  await check('emulator generated reset action; SDK verifies and changes password', async () => {
    assert.equal(await verifyPasswordResetCode(auth, reset.oobCode), email);
    await confirmPasswordReset(auth, reset.oobCode, newPassword);
  });
  await check('old password rejected after reset', async () => {
    await assert.rejects(signInWithEmailAndPassword(auth, email, password), error => ['auth/wrong-password', 'auth/invalid-credential'].includes(error.code));
  });
  await check('new password accepted after reset', async () => {
    await signInWithEmailAndPassword(auth, email, newPassword);
    await observe(true);
  });
  await check('onAuthStateChanged tracked signed-in and signed-out transitions', async () => {
    assert.ok(events.includes(false));
    assert.ok(events.includes(true));
    assert.ok(events.length >= 6);
  });
  await check('temporary emulator user deleted', async () => {
    await deleteUser(auth.currentUser);
    await observe(false);
  });
  process.stdout.write(`${JSON.stringify({ environment: 'local Firebase Auth emulator only', results, total: results.length, passed: results.length, scope: 'No production Firebase calls or external email delivery' }, null, 2)}\n`);
} catch (error) {
  process.stdout.write(`${JSON.stringify({ results, failure: { name: error.name, code: error.code ?? 'assertion-or-runtime-error' } }, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  unsubscribe();
  await deleteApp(app);
}
