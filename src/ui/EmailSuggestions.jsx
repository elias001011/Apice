import React from 'react'

const COMMON_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com.br',
  'icloud.com',
  'uol.com.br',
  'bol.com.br'
]

/**
 * Componente que renderiza um datalist com sugestões de e-mail baseadas no input atual.
 * @param {string} id - O ID único para o datalist.
 * @param {string} value - O valor atual do campo de e-mail.
 */
export function EmailSuggestions({ id, value }) {
  // Só mostramos sugestões se o usuário já digitou o '@'
  if (!value || !value.includes('@')) return null

  const [prefix, suffix] = value.split('@')
  
  // Se o usuário já terminou de digitar um domínio (tem ponto após o @), não sugerimos mais
  if (suffix && suffix.includes('.')) return null

  return (
    <datalist id={id}>
      {COMMON_DOMAINS.map((domain) => (
        <option key={domain} value={`${prefix}@${domain}`} />
      ))}
    </datalist>
  )
}
