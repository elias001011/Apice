const POLICY_KEY = 'apice:policy-consent:v1'

export const POLICY_URL = 'https://policies.netlify.app'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadPolicyConsent() {
  if (!canUseStorage()) return false

  try {
    const raw = localStorage.getItem(POLICY_KEY)
    if (!raw) return false

    const parsed = JSON.parse(raw)
    return Boolean(parsed?.accepted)
  } catch {
    return false
  }
}

export function savePolicyConsent(accepted) {
  if (!canUseStorage()) return false

  if (!accepted) {
    localStorage.removeItem(POLICY_KEY)
    return false
  }

  localStorage.setItem(POLICY_KEY, JSON.stringify({
    accepted: true,
    acceptedAt: new Date().toISOString(),
  }))
  return true
}

export function clearPolicyConsent() {
  if (!canUseStorage()) return
  localStorage.removeItem(POLICY_KEY)
}
