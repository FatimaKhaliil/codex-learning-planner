const invalidCredentialsMessage =
  'E-Mail-Adresse oder Passwort stimmen nicht überein. Bitte prüfe deine Eingaben.'

const messages: Record<string, string> = {
  'auth/invalid-credential': invalidCredentialsMessage,
  'auth/wrong-password': invalidCredentialsMessage,
  'auth/user-not-found': invalidCredentialsMessage,
  'auth/invalid-login-credentials': invalidCredentialsMessage,
  'auth/invalid-email': 'Bitte gib eine gültige E-Mail-Adresse ein.',
  'auth/missing-email': 'Bitte gib deine E-Mail-Adresse ein.',
  'auth/missing-password': 'Bitte gib dein Passwort ein.',
  'auth/weak-password': 'Das Passwort ist zu schwach. Bitte verwende ein stärkeres Passwort mit mindestens 6 Zeichen.',
  'auth/password-does-not-meet-requirements': 'Das Passwort erfüllt die Sicherheitsanforderungen nicht. Bitte verwende ein stärkeres Passwort.',
  'auth/email-already-in-use': 'Für diese E-Mail-Adresse besteht bereits ein Konto. Bitte melde dich an oder setze dein Passwort zurück.',
  'auth/too-many-requests': 'Es gab zu viele Versuche. Bitte warte einen Moment und versuche es erneut.',
  'auth/network-request-failed': 'Die Verbindung ist fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.',
  'auth/user-disabled': 'Dieses Konto ist deaktiviert. Bitte wende dich an die zuständige Administration.',
  'auth/operation-not-allowed': 'Die Anmeldung mit E-Mail und Passwort ist für dieses Projekt noch nicht freigeschaltet.',
  'auth/unauthorized-domain': 'Diese Website ist für die Anmeldung noch nicht freigeschaltet. Bitte die Firebase-Konfiguration prüfen.',
  'auth/invalid-api-key': 'Die Firebase-Konfiguration ist ungültig. Bitte die Webkonfiguration prüfen.',
  'auth/app-not-authorized': 'Diese Anwendung ist für Firebase Authentication noch nicht freigeschaltet.',
  'auth/configuration-not-ready': 'Die Anmeldung ist noch nicht eingerichtet. Bitte die Firebase-Konfiguration prüfen.',
  'auth/requires-recent-login': 'Bitte melde dich erneut an und wiederhole den Vorgang.',
}

export function authErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null
  return typeof error.code === 'string' ? error.code : null
}

export function authErrorMessage(error: unknown): string {
  const code = authErrorCode(error)
  if (code && Object.hasOwn(messages, code)) return messages[code]
  return 'Der Vorgang konnte nicht abgeschlossen werden. Bitte versuche es erneut.'
}
