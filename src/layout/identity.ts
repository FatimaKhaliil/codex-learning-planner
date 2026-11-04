export function identityInitials(displayName: string | null, email: string | null): string {
  const words = displayName?.split(/[\s\p{White_Space}]+/u).filter(Boolean) ?? []
  const initials = words.slice(0, 2).map(word => Array.from(word)[0]).join('')
  const emailInitial = Array.from(email?.replace(/^[\s\p{White_Space}]+/u, '') ?? '')[0]
  return (initials || emailInitial || 'K').toLocaleUpperCase('de')
}
