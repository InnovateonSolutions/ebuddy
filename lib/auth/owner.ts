const OWNER_EMAIL = 'martin.cuevas.t@gmail.com'

export function isOwner(email: string | null | undefined): boolean {
  return email === OWNER_EMAIL
}
