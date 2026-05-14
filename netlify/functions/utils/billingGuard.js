export const WELCOME_PREMIUM_DAYS = 30;
export const WELCOME_PREMIUM_CUTOFF_ISO = '2026-04-15T22:55:09-03:00';

function safeText(value) {
    return String(value ?? '').trim();
}

function safeDate(d) {
    if (!d) return null;
    const time = Date.parse(d);
    return isNaN(time) ? null : time;
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
        // Inicializa o usuário sem teste grátis automático.
        // O teste grátis de 7 dias será obtido ativamente via gateway da AbacatePay.
        incomingState.billing = {
            status: 'free',
            planKey: '',
            updatedAt: new Date().toISOString(),
        };
        incomingState.planStatus = 'free';
        incomingState.planTier = 'free';
        
        return incomingState;
    }

    // 2. Se JÁ EXISTE estado de billing na nuvem: o Backend VENCE SEMPRE
    // Frontend não pode forjar 'paid' ou datas longas de trial.
    incomingState.billing = existingState.billing;
    incomingState.planStatus = existingState.planStatus || existingState.billing?.status || 'free';
    incomingState.planTier = existingState.planTier || (incomingState.planStatus === 'free' ? 'free' : 'paid');
    
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
