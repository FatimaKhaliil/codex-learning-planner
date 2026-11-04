import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DISPLAY_NAME_MAX_LENGTH,
  normalizeDisplayName,
  validateDisplayName,
} from '../src/auth/displayName.ts'
import { identityInitials } from '../src/layout/identity.ts'

test('display names require content after trimming Unicode whitespace', () => {
  for (const name of ['', ' ', '\t\n\r', '\u00a0', '\u0085\u2003\u202f\u3000\ufeff']) {
    assert.equal(validateDisplayName(name), 'Bitte gib einen Namen ein.')
  }
  assert.equal(normalizeDisplayName('\u0085\ufeff\u00a0  Fatima Khaliil \u3000\ufeff'), 'Fatima Khaliil')
})

test('display names accept exactly 100 Unicode codepoints after trimming', () => {
  assert.equal(DISPLAY_NAME_MAX_LENGTH, 100)
  for (const character of ['a', '𐐷', '🦊']) {
    const boundary = character.repeat(DISPLAY_NAME_MAX_LENGTH)
    assert.equal(validateDisplayName(`\u00a0${boundary}\u2003`), null)
    assert.equal(normalizeDisplayName(`\u00a0${boundary}\u2003`), boundary)
    assert.equal(validateDisplayName(`${boundary}${character}`), 'Der Name darf höchstens 100 Zeichen enthalten.')
  }
  // Combining marks are separate codepoints; no lossy Unicode normalization.
  assert.equal(validateDisplayName('e\u0301'.repeat(50)), null)
  assert.ok(validateDisplayName(`${'e\u0301'.repeat(50)}a`))
})

test('legitimate names preserve accents, scripts, punctuation and inner spacing', () => {
  for (const name of [
    '李', 'محمد الأحمد', 'Anne-Marie O’Neill', 'D\'Arcy', 'Dr. Léa Müller',
    'Nguyễn Thị Minh', 'de la Cruz', 'A  B', 'Zoë\u00a0Schäfer', '𐐷 𐐨',
  ]) {
    assert.equal(validateDisplayName(name), null)
    assert.equal(normalizeDisplayName(`  ${name}  `), name)
  }
})

test('normalization rejects invalid names with a stable application error code', () => {
  for (const name of ['', '\u00a0', 'a'.repeat(DISPLAY_NAME_MAX_LENGTH + 1)]) {
    assert.throws(() => normalizeDisplayName(name), error => {
      assert.ok(error instanceof Error)
      assert.equal((error as Error & { code: string }).code, 'profile/invalid-display-name')
      assert.equal(error.message, validateDisplayName(name))
      return true
    })
  }
})

test('identity initials use the first two words and German uppercase', () => {
  assert.equal(identityInitials('Fatima Khaliil', 'different@example.test'), 'FK')
  assert.equal(identityInitials('  Léa\u00a0Müller\tSchmidt  ', null), 'LM')
  assert.equal(identityInitials('\u0085Anna\u2003Berta\u0085Carla', null), 'AB')
  assert.equal(identityInitials('Özlem', null), 'Ö')
  assert.equal(identityInitials('李 明 华', null), '李明')
  assert.equal(identityInitials('𐐷 𐐨', null), '𐐏𐐀')
  assert.equal(identityInitials('🦊 Müller', null), '🦊M')
  assert.equal(identityInitials('ß', null), 'SS')
})

test('identity initials fall back to the first complete email codepoint and then K', () => {
  assert.equal(identityInitials(null, 'fatima@example.test'), 'F')
  assert.equal(identityInitials(' \u00a0\u0085', 'ö@example.test'), 'Ö')
  assert.equal(identityInitials('', '🦊@example.test'), '🦊')
  assert.equal(identityInitials(null, '  f@example.test'), 'F')
  assert.equal(identityInitials(null, null), 'K')
  assert.equal(identityInitials('', ''), 'K')
  assert.equal(identityInitials('\t', '\u00a0 '), 'K')
})
