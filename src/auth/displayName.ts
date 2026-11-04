export const DISPLAY_NAME_MAX_LENGTH = 100

function trimmedDisplayName(value: string): string {
  // Include Unicode White_Space (such as NEL) as well as JavaScript whitespace.
  // Inner whitespace and the spelling of a person's name remain unchanged.
  return value.replace(/^[\s\p{White_Space}]+|[\s\p{White_Space}]+$/gu, '')
}

export function validateDisplayName(value: string): string | null {
  const name = trimmedDisplayName(value)
  if (!name) return 'Bitte gib einen Namen ein.'
  if (Array.from(name).length > DISPLAY_NAME_MAX_LENGTH) {
    return `Der Name darf höchstens ${DISPLAY_NAME_MAX_LENGTH} Zeichen enthalten.`
  }
  return null
}

export function normalizeDisplayName(value: string): string {
  const message = validateDisplayName(value)
  if (message) {
    throw Object.assign(new Error(message), { code: 'profile/invalid-display-name' })
  }
  return trimmedDisplayName(value)
}
