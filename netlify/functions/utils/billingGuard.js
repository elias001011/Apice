export const WELCOME_PREMIUM_DAYS = 30;
export const WELCOME_PREMIUM_CUTOFF_ISO = '2026-04-15T22:55:09-03:00';

function safeText(value) {
    return String(value ?? '').trim();
}

function safeDateMs(value) {
    const text = safeText(value);
    if (!text) return 0;
    const time = Date.parse(text);
    return Number.isFinite(time) ? time : 0;
}

function normalizeBillingRecord(record) {
    return {
        ...(record && typeof record === 'object' ? record : {}),
        status: safeText(record?.status || record?.planStatus || '').toLowerCase() || 'free',
        planKey: safeText(record?.planKey || ''),
        billingMode: safeText(record?.billingMode || record?.checkoutMode || record?.paymentMode || ''),
        oneTimePlanKeys: Array.isArray(record?.oneTimePlanKeys)
            ? record.oneTimePlanKeys.map((item) => safeText(item)).filter(Boolean)
            : [],
        updatedAt: safeText(record?.updatedAt || record?.savedAt || record?.modifiedAt || ''),
    };
}

function mergeBillingRecords(existingBilling, incomingBilling) {
    const existing = normalizeBillingRecord(existingBilling)
    const incoming = normalizeBillingRecord(incomingBilling)
    const existingMs = safeDateMs(existing.updatedAt)
    const incomingMs = safeDateMs(incoming.updatedAt)

    if (!existingBilling || typeof existingBilling !== 'object') {
        return incoming
    }

    if (incoming.status === 'paid' && existing.status !== 'paid') {
        return {
            ...existing,
            ...incoming,
            oneTimePlanKeys: Array.from(new Set([...(existing.oneTimePlanKeys || []), ...(incoming.oneTimePlanKeys || [])])),
            updatedAt: incoming.updatedAt || new Date().toISOString(),
        }
    }

    if (incomingMs > existingMs) {
        return {
            ...existing,
            ...incoming,
            oneTimePlanKeys: Array.from(new Set([...(existing.oneTimePlanKeys || []), ...(incoming.oneTimePlanKeys || [])])),
            updatedAt: incoming.updatedAt || new Date().toISOString(),
        }
    }

    return {
        ...incoming,
        ...existing,
        oneTimePlanKeys: Array.from(new Set([...(existing.oneTimePlanKeys || []), ...(incoming.oneTimePlanKeys || [])])),
        updatedAt: existing.updatedAt || incoming.updatedAt || new Date().toISOString(),
    }
}

/**
 * Filtra e protege o plano e a cota do usuário no backend.
 * Garante que o frontend não possa escalar privilégios ou forjar status Pago/Premium.
 */
export function sanitizeState(incomingState, existingState, user) {
    if (!incomingState) {
        incomingState = { version: 18 };
    }

    const userId = safeText(user?.id || user?.sub || user?.payload?.sub);
    const existingOwnerId = safeText(existingState?.accountOwnerId || existingState?.ownerId);
    if (existingOwnerId && userId && existingOwnerId !== userId) {
        console.warn('[billingGuard] Estado com ownerId divergente ignorado para evitar mistura entre contas.');
        incomingState = { version: incomingState.version || 21 };
        existingState = null;
    }

    incomingState.accountOwnerId = userId;
    incomingState.profile = {
        ...(incomingState.profile && typeof incomingState.profile === 'object' ? incomingState.profile : {}),
        email: safeText(user?.email),
        full_name: safeText(user?.fullName || user?.metadata?.full_name),
        first_name: safeText(user?.metadata?.first_name),
        school: safeText(user?.metadata?.school),
    };

    // 1. Se NÃO existe estado de billing no backend, inicializamos como 'free'
    if (!existingState || !existingState.billing || typeof existingState.billing !== 'object') {
        // Inicializa o usuário sem acesso temporário automático.
        // O upgrade atual é pago via gateway da AbacatePay.
        incomingState.billing = {
          status: 'free',
          planKey: '',
          oneTimePlanKeys: Array.isArray(incomingState?.billing?.oneTimePlanKeys)
            ? incomingState.billing.oneTimePlanKeys
            : [],
          updatedAt: new Date().toISOString(),
        };
        incomingState.planStatus = 'free';
        incomingState.planTier = 'free';
        
        return incomingState;
    }

    // 2. Se já existe billing na nuvem, mesclamos por recência.
    // O backend continua sendo a autoridade, mas uma confirmação de pagamento
    // mais nova pode substituir um snapshot antigo/free.
    const mergedBilling = mergeBillingRecords(existingState.billing, incomingState.billing)
    incomingState.billing = mergedBilling;
    incomingState.planStatus = mergedBilling.status || existingState.planStatus || 'free';
    incomingState.planTier = String(incomingState.planStatus).toLowerCase() === 'free' ? 'free' : 'paid';
    
    // 3. Proteger cota diária (usage)
    if (existingState.usage && incomingState.usage) {
        // Se for o mesmo dia, garante que o consumo não decresça
        if (incomingState.usage.dayKey === existingState.usage.dayKey) {
            const currentCounts = existingState.usage.counts || {};
            const newCounts = incomingState.usage.counts || {};
            
            for (const [k, v] of Object.entries(currentCounts)) {
                if (typeof v === 'number' && typeof newCounts[k] === 'number') {
                    // Impede o frontend de zerar o contador do meio do dia
                    newCounts[k] = Math.max(v, newCounts[k]);
                } else if (typeof v === 'number' && typeof newCounts[k] === 'undefined') {
                    newCounts[k] = v;
                }
            }
            incomingState.usage.counts = newCounts;
        }
    } else if (existingState.usage) {
        incomingState.usage = existingState.usage;
    }

    // Recalcular status de trial se experiou antes do front notar
    if (incomingState.billing.status === 'trial') {
        const expiresMs = Date.parse(incomingState.billing.trialEndsAt);
        if (!isNaN(expiresMs) && expiresMs <= Date.now()) {
            incomingState.billing.status = 'free';
            incomingState.planStatus = 'free';
            incomingState.planTier = 'free';
        }
    }

    return incomingState;
}

export function ensureInitialState(existingState, user) {
    if (!existingState) existingState = { version: 18 };
    return sanitizeState(existingState, null, user);
}
