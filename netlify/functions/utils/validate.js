/**
 * Input validation utilities for Netlify Functions.
 *
 * Enforces character limits on text inputs to prevent:
 * - Cost amplification (oversized prompts sent to paid AI APIs)
 * - Prompt injection via oversized payloads
 * - Memory exhaustion in serverless functions
 */

export const INPUT_LIMITS = {
  /** Maximum character length for an essay (redação) */
  redacao: 15_000,
  /** Maximum character length for a theme (tema) */
  tema: 500,
  /** Maximum character length for a system prompt */
  systemPrompt: 5_000,
  /** Maximum character length for a single user message */
  userMessage: 10_000,
  /** Maximum number of user messages in a conversation */
  maxUserMessages: 20,
  /** Maximum character length for a search query */
  query: 500,
  /** Maximum number of history entries for summarization */
  maxHistoryEntries: 100,
  /** Maximum total character length for serialized history */
  historyTotal: 100_000,
  /** Maximum character length for responsePreference */
  responsePreference: 500,
  /** Maximum character length for material (serialized) */
  material: 30_000,
}

/**
 * Validate that a string field does not exceed the given character limit.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateStringLength(fieldName, value, maxLength) {
  const text = String(value ?? '')
  if (text.length > maxLength) {
    return {
      valid: false,
      error: `O campo "${fieldName}" excede o limite de ${maxLength.toLocaleString('pt-BR')} caracteres (recebido: ${text.length.toLocaleString('pt-BR')}).`,
    }
  }
  return { valid: true }
}

/**
 * Validate an array field's length.
 */
export function validateArrayLength(fieldName, value, maxItems) {
  const arr = Array.isArray(value) ? value : []
  if (arr.length > maxItems) {
    return {
      valid: false,
      error: `O campo "${fieldName}" excede o limite de ${maxItems} itens (recebido: ${arr.length}).`,
    }
  }
  return { valid: true }
}

/**
 * Build a 400 validation error response.
 */
export function validationErrorResponse(message, corsHeaders = {}) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    },
  )
}
