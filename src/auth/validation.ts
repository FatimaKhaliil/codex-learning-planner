export type AuthMode = 'login' | 'register' | 'reset'

export interface AuthFormValues {
  email: string
  password?: string
  confirmation?: string
}

export interface FieldErrors {
  email?: string
  password?: string
  confirmation?: string
}

export function validateAuthForm(mode: AuthMode, values: AuthFormValues): FieldErrors {
  const errors: FieldErrors = {}
  const email = values.email.trim()
  const password = values.password ?? ''
  const confirmation = values.confirmation ?? ''

  if (!email) {
    errors.email = 'Bitte gib deine E-Mail-Adresse ein.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Bitte gib eine gültige E-Mail-Adresse ein.'
  }

  if (mode === 'reset') return errors

  // Never trim passwords: whitespace can be part of an existing password.
  if (!password) {
    errors.password = 'Bitte gib dein Passwort ein.'
  } else if (mode === 'register' && password.length < 6) {
    errors.password = 'Dein Passwort muss mindestens 6 Zeichen enthalten.'
  }

  if (mode === 'register') {
    if (!confirmation) {
      errors.confirmation = 'Bitte bestätige dein Passwort.'
    } else if (confirmation !== password) {
      errors.confirmation = 'Die Passwörter stimmen nicht überein.'
    }
  }

  return errors
}
