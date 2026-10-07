/** Turns Supabase's error messages into calm, plain ones. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'That email and password don’t match.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox for the link.'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'There’s already an account with that email. Try signing in.'
  if (m.includes('password') && m.includes('at least')) return 'Use a password with at least 6 characters.'
  if (m.includes('fetch') || m.includes('network')) return 'Couldn’t reach MYOS. Check your connection and try again.'
  if (m.includes('rate limit')) return 'Too many tries. Please wait a minute and try again.'
  if (m.includes('web3') && (m.includes('disabled') || m.includes('not enabled')))
    return 'Wallet sign-in isn’t turned on for MYOS yet.'
  if (m.includes('not allowed on this server') || m.includes('another app') || m.includes('does not use https'))
    return 'This address isn’t set up for wallet sign-in yet.'
  if (m.includes('signature does not match')) return 'That signature didn’t match the wallet. Please try again.'
  if (m.includes('issued too long ago') || m.includes('expired'))
    return 'The sign-in request expired. Please try again.'
  if (m.includes('no accounts')) return 'Your wallet didn’t share an account. Unlock it and try again.'
  return message
}
