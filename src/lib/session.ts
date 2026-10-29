/**
 * App identity and mock SSO session.
 * APP_NAME is a placeholder until the product name is confirmed.
 */

export const APP_NAME = 'M42 Workspace'

export interface UserProfile {
  id: string
  name: string
  designation: string
  email: string
  avatarUrl?: string
}

/** The only role for now — every SSO sign-in lands as Admin. */
export const ADMIN_PROFILE: UserProfile = {
  id: 'admin',
  name: 'Nadia Al-Farsi',
  designation: 'Admin',
  email: 'nadia.alfarsi@m42.ae',
  avatarUrl:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
}

/**
 * The session lives only in memory, so a refresh or a new tab sends the user
 * back to the login screen. Moving between pages inside the app keeps it.
 */
let signedIn = false

export function startSession() {
  signedIn = true
}

export function endSession() {
  signedIn = false
}

export function hasSession() {
  return signedIn
}
