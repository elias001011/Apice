/**
 * Endpoint de emergência: limpa campos legados do user_metadata.
 *
 * Usa o Netlify Admin API (não requer JWT do usuário).
 * Resolve o problema de JWT inflado que causa 500 em todas as funções.
 *
 * POST /.netlify/functions/limpar-metadata
 * Body: { userId: string } (opcional — se ausente, limpa o usuário autenticado)
 */

import process from 'node:process'
import { requireAuth } from './utils/auth.js'
import { buildCorsHeaders } from './utils/cors.js'

export default async function handler(req) {
  const headers = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  // Permite self-service (usuário limpa seu próprio metadata)
  // Se não tem auth, tenta pegar userId do body
  let userId = ''
  try {
    const auth = requireAuth(req, headers)
    if (auth instanceof Response) {
      // Sem auth válido — tenta pegar userId do body
      const body = await req.json().catch(() => ({}))
      userId = String(body?.userId ?? '').trim()
      if (!userId) {
        return auth // 401
      }
    } else {
      userId = auth.user.id
    }
  } catch {
    const body = await req.json().catch(() => ({}))
    userId = String(body?.userId ?? '').trim()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId é obrigatório' }), { status: 400, headers })
    }
  }

  try {
    const netlifyUrl = String(process.env.NETLIFY_IDENTITY_URL || process.env.VITE_NETLIFY_IDENTITY_URL || '').trim()
    const adminToken = String(process.env.NETLIFY_ADMIN_TOKEN || process.env.GOTRUE_ADMIN_TOKEN || '').trim()

    if (!netlifyUrl) {
      console.error('[limpar-metadata] NETLIFY_IDENTITY_URL não configurada')
      return new Response(JSON.stringify({ error: 'Admin URL não configurada', userId }), { status: 500, headers })
    }

    if (!adminToken) {
      console.error('[limpar-metadata] NETLIFY_ADMIN_TOKEN não configurado')
      return new Response(JSON.stringify({ error: 'Admin token não configurado', userId }), { status: 500, headers })
    }

    const baseUrl = netlifyUrl.replace(/\/$/, '')

    // Busca o usuário atual para ler o metadata existente
    const getUserRes = await fetch(`${baseUrl}/admin/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!getUserRes.ok) {
      const errText = await getUserRes.text().catch(() => '')
      console.error(`[limpar-metadata] Falha ao buscar usuário: HTTP ${getUserRes.status}`, errText)
      return new Response(JSON.stringify({ error: 'Usuário não encontrado', status: getUserRes.status }), { status: 404, headers })
    }

    const userData = await getUserRes.json()
    const currentMetadata = userData?.user_metadata || {}

    // Campos legados que inflam o JWT
    const legacyKeys = [
      'apice_state', 'app_data', 'billing', 'usage', 'history',
      'preferences', 'planStatus', 'planTier', 'radar', 'conquistas',
      'summary', 'enemDate', 'radarFavorites', 'aiResponsePreference',
      'avatarSettings', 'notifications',
    ]

    const removedKeys = []
    // Mantém apenas campos essenciais
    const cleanMetadata = {}
    for (const [key, value] of Object.entries(currentMetadata)) {
      if (['full_name', 'first_name', 'last_name', 'school', 'name', 'avatar_url'].includes(key)) {
        cleanMetadata[key] = value
      } else if (legacyKeys.includes(key)) {
        removedKeys.push(key)
      } else {
        // Campos desconhecidos — manter por segurança
        cleanMetadata[key] = value
      }
    }

    if (removedKeys.length === 0) {
      console.log(`[limpar-metadata] Usuário ${userId} já tem metadata limpo`)
      return new Response(JSON.stringify({ ok: true, cleaned: false, userId, reason: 'no_legacy_keys' }), { status: 200, headers })
    }

    // Atualiza o usuário com metadata limpo
    const updateUserRes = await fetch(`${baseUrl}/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_metadata: cleanMetadata,
      }),
    })

    if (!updateUserRes.ok) {
      const errText = await updateUserRes.text().catch(() => '')
      console.error(`[limpar-metadata] Falha ao atualizar: HTTP ${updateUserRes.status}`, errText)
      return new Response(JSON.stringify({ error: 'Falha ao limpar metadata', status: updateUserRes.status }), { status: 500, headers })
    }

    console.log(`[limpar-metadata] Limpou ${removedKeys.length} campos legados de ${userId}: ${removedKeys.join(', ')}`)

    return new Response(JSON.stringify({
      ok: true,
      cleaned: true,
      userId,
      removedKeys,
      keptKeys: Object.keys(cleanMetadata),
    }), { status: 200, headers })
  } catch (error) {
    console.error('[limpar-metadata] Erro:', error.message)
    return new Response(JSON.stringify({ error: 'Falha ao limpar metadata', detail: error.message }), { status: 500, headers })
  }
}
