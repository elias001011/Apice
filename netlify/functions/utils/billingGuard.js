export const WELCOME_PREMIUM_DAYS = 30;
export const WELCOME_PREMIUM_CUTOFF_ISO = '2026-04-15T22:55:09-03:00';

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

    // 1. Se NÃO existe estado de billing no backend, inicializamos o trial na nuvem
    if (!existingState || !existingState.billing || typeof existingState.billing !== 'object') {
        const signupTime = safeDate(user?.payload?.created_at) || safeDate(user?.payload?.createdAt) || safeDate(user?.metadata?.created_at) || Date.now();
        const cutoffTime = Date.parse(WELCOME_PREMIUM_CUTOFF_ISO);

        const isWelcomeEligible = signupTime >= cutoffTime;
        const defaultDays = isWelcomeEligible ? WELCOME_PREMIUM_DAYS : 7;
        const kind = isWelcomeEligible ? 'welcome' : 'standard';

        const startedAt = new Date().toISOString();
        const endsAt = new Date(Date.now() + defaultDays * 24 * 60 * 60 * 1000).toISOString();

        // Sobrescrevemos o trial que o front possa tentar ter forjado com o do servidor.
        incomingState.billing = {
            status: 'trial',
            trialKind: kind,
            trialStartedAt: startedAt,
            trialEndsAt: endsAt,
            planKey: '',
            updatedAt: new Date().toISOString(),
        };
        incomingState.planStatus = 'trial';
        incomingState.planTier = 'paid'; // Trial gets access to paid features
        
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
