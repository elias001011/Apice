export async function createAiRequestError(response, fallbackMessage = 'Erro na comunicação com a IA.') {
  let errorData = {}

  try {
    errorData = await response.json()
  } catch {
    errorData = {}
  }

  const message = String(
    errorData.error
    ?? errorData.detail
    ?? errorData.message
    ?? response.statusText
    ?? fallbackMessage,
  ).trim() || fallbackMessage

  const error = new Error(message)
  const code = String(errorData.code ?? '').trim()

  if (code) {
    error.code = code
  }

  if (!error.code && response.status === 429) {
    error.code = 'quota_blocked'
  }

  error.status = response.status
  error.details = errorData

  return error
}
