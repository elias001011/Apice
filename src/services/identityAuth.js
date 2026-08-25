const DELETE_ACCOUNT_ENDPOINT = '/.netlify/functions/excluir-conta'

const INVALID_LOGIN_PATTERNS = [
  /invalid\s+login/i,
  /invalid_grant/i,
  /email\s+address\s+or\s+password\s+was\s+invalid/i,
  /wrong\s+email\s+or\s+password/i,
  /credentials?\s+were\s+invalid/i,
]

const UNCONFIRMED_ACCOUNT_PATTERNS = [
  /not\s+confirmed/i,
  /email\s+is\s+not\s+confirmed/i,
  /please\s+confirm/i,
  /confirm.*email/i,
]

const ALREADY_CONFIRMED_PATTERNS = [
  /already\s+registered/i,
  /already\s+confirmed/i,
  /user\s+already\s+registered/i,
]

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function extractErrorMessage(error) {
  if (!error) return ''
  if (typeof error === 'string') return normalizeText(error)

  const candidates = [
    error.message,
    error.error_description,
    error?.json?.msg,
    error?.json?.error_description,
    error?.json?.error,
    error?.details,
    error?.detail,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate)
    if (normalized) return normalized
  }

  return ''
}

function parsePayloadMessage(payload) {
  if (!payload) return ''
  if (typeof payload === 'string') return normalizeText(payload)
  if (typeof payload !== 'object') return ''

  return normalizeText(
    payload.msg || payload.error_description || payload.error || payload.details || payload.detail,
  )
}

function hasAdminRole(user) {
  const roles = Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : []
  return roles.some((role) => normalizeText(role).toLowerCase() === 'admin')
}

export function clearVerificationPassword() {
  // Compatibilidade com versões antigas: apaga a credencial temporária que
  // versões anteriores chegaram a persistir no sessionStorage.
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') return
  window.sessionStorage.removeItem('_apice_verif_pw')
}

export function normalizeIdentityError(error) {
  return extractErrorMessage(error)
}

export function isInvalidLoginError(error) {
  const message = normalizeIdentityError(error)
  return INVALID_LOGIN_PATTERNS.some((pattern) => pattern.test(message))
}

export function isUnconfirmedAccountError(error) {
  const message = normalizeIdentityError(error)
  return UNCONFIRMED_ACCOUNT_PATTERNS.some((pattern) => pattern.test(message))
}

export function isAlreadyConfirmedError(error) {
  const message = normalizeIdentityError(error)
  return ALREADY_CONFIRMED_PATTERNS.some((pattern) => pattern.test(message))
}

export async function requestAccountDeletion(authClient) {
  const currentUser = authClient?.currentUser?.()
  if (!currentUser) {
    throw new Error('Usuário não autenticado. Faça login novamente para excluir a conta.')
  }

  const currentUserId = String(currentUser?.id ?? currentUser?.sub ?? '').trim()
  const canTryDirectDeletion = hasAdminRole(currentUser)

  const deleteDirectlyWithCurrentUser = async () => {
    if (!canTryDirectDeletion) {
      throw new Error('Não foi possível excluir sua conta agora.')
    }

    if (!currentUserId) {
      throw new Error('Não foi possível identificar sua conta para exclusão.')
    }

    const admin = currentUser?.admin
    if (!admin || typeof admin.deleteUser !== 'function') {
      throw new Error('Não foi possível excluir sua conta agora.')
    }

    await admin.deleteUser({ id: currentUserId })
    return { ok: true, source: 'direct' }
  }

  let jwt = ''
  try {
    jwt = await currentUser.jwt()
  } catch {
    throw new Error('Não foi possível validar sua sessão. Faça login novamente para excluir a conta.')
  }

  try {
    const response = await fetch(DELETE_ACCOUNT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      credentials: 'same-origin',
    })

    const contentType = response.headers.get('Content-Type') || ''
    let payload = null

    try {
      payload = contentType.includes('json')
        ? await response.json()
        : await response.text()
    } catch {
      payload = null
    }

    if (!response.ok) {
      const message = parsePayloadMessage(payload)
      if (response.status >= 500 && canTryDirectDeletion) {
        try {
          return await deleteDirectlyWithCurrentUser()
        } catch (fallbackError) {
          const fallbackMessage = normalizeIdentityError(fallbackError)
          throw new Error(message || fallbackMessage || 'Não foi possível excluir sua conta agora.')
        }
      }

      throw new Error(message || 'Não foi possível excluir sua conta agora.')
    }

    return payload
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error
    }

    if (canTryDirectDeletion) {
      try {
        return await deleteDirectlyWithCurrentUser()
      } catch (fallbackError) {
        const message = normalizeIdentityError(error)
        const fallbackMessage = normalizeIdentityError(fallbackError)
        throw new Error(message || fallbackMessage || 'Não foi possível excluir sua conta agora.')
      }
    }

    const message = normalizeIdentityError(error)
    throw new Error(message || 'Não foi possível excluir sua conta agora.')
  }
}
