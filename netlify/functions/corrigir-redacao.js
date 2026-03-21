/**
 * Netlify Function para gerenciar a chamada de IA.
 * Ela serve como um proxy seguro: as chaves de API nunca vão para o navegador.
 * 
 * Ordem do Fallback: GROQ -> HF -> OR -> GEMINI -> GROK
 */

// Define a lista de provedores e as funções para chamá-los.
// Caso a chamada falhe (lançando erro), o loop passa para o próximo modelo.
const providers = [
  {
    name: 'GROQ',
    call: async (systemPrompt, userMessages) => {
      // 1. GROQ
      const apiKey = process.env.GROQ_API_KEY || process.env.GROQ;
      if (!apiKey || apiKey === 'undefined') throw new Error('A chave de API do GROQ não foi encontrada no .env');

      const url = 'https://api.groq.com/openai/v1/chat/completions';
      
      const payload = {
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          ...userMessages
        ],
        temperature: 0.3,
        max_tokens: 8192,
        max_completion_tokens: 8192,
        top_p: 1,
        reasoning_effort: "medium", // Compatível com requisitos modernos
        stream: false
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`GROQ API Error: ${response.status} - ${err}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`GROQ Provider Error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      let textResponse = data.choices?.[0]?.message?.content;
      if (textResponse == null || textResponse === "") {
        // As vezes modelos de thought devolvem no campo "reasoning" e deixam content vazio
        let reasoning = data.choices?.[0]?.message?.reasoning || "";
        if (reasoning) {
            textResponse = reasoning;
        } else {
            throw new Error('Resposta do GROQ veio em formato estranho. Raw: ' + JSON.stringify(data).substring(0, 300));
        }
      }

      // Extração robusta de JSON (ignora pensamentos e textos antes/depois)
      const jsonMatch = textResponse.match(/\`\`\`(?:json)?\s*(\{[\s\S]*?\})\s*\`\`\`/i);
      if (jsonMatch) {
        textResponse = jsonMatch[1];
      } else {
        const firstBrace = textResponse.indexOf('{');
        const lastBrace = textResponse.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          textResponse = textResponse.substring(firstBrace, lastBrace + 1);
        }
      }

      return JSON.parse(textResponse);
    }
  },
  {
    name: 'HF',
    call: async (systemPrompt, userMessages) => {
      // 2. HUGGING FACE (HF)
      // throw new Error('HF não implementado')
      throw new Error('HF não implementado')
    }
  },
  {
    name: 'OpenRouter',
    call: async (systemPrompt, userMessages) => {
      // 3. OPENROUTER (OR)
      const apiKey = process.env.OR_API_KEY || process.env.OR;
      if (!apiKey || apiKey === 'undefined') throw new Error('A chave de API do OpenRouter não foi encontrada no .env');

      const url = 'https://openrouter.ai/api/v1/chat/completions';
      
      const payload = {
        model: "openrouter/free", // Usando o endpoint gratuito
        messages: [
          { role: "system", content: systemPrompt },
          ...userMessages
        ],
        temperature: 0.3,
        max_tokens: 8192
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://apice.netlify.app', // OR exige Referer
          'X-Title': 'Apice ENEM'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OR API Error: ${response.status} - ${err}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(`OR Provider Error: ${data.error.message}`);

      let textResponse = data.choices?.[0]?.message?.content;
      if (textResponse == null || textResponse === "") {
        throw new Error('Resposta do OpenRouter vazia.');
      }

      const jsonMatch = textResponse.match(/\`\`\`(?:json)?\s*(\{[\s\S]*?\})\s*\`\`\`/i);
      if (jsonMatch) textResponse = jsonMatch[1];
      else {
        const firstBrace = textResponse.indexOf('{');
        const lastBrace = textResponse.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          textResponse = textResponse.substring(firstBrace, lastBrace + 1);
        }
      }

      return JSON.parse(textResponse);
    }
  },
  {
    name: 'GEMINI',
    call: async (systemPrompt, userMessages) => {
      // 4. GEMINI (gemini-3.1-flash-lite-preview)
      // Note que o Gemini v1beta espera um formato específico de 'contents'
      
      const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI;
      if (!apiKey || apiKey === 'undefined') throw new Error('A chave de API do Gemini não foi encontrada no .env');

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;

      // Formatar o histórico combinando o system prompt na frente
      const contents = [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        },
        ...userMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      ];

      const payload = {
        contents,
        generationConfig: {
          temperature: 0.3, // Menos alucinação
          responseMimeType: "application/json", // Forçar output JSON
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${err}`);
      }

      const data = await response.json();
      let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error('Resposta do Gemini veio em um formato inesperado.');
      }

      // Limpeza de markdown, caso a IA retorne envelopado em \`\`\`json \`\`\`
      textResponse = textResponse.trim();
      if (textResponse.startsWith('\`\`\`json')) {
        textResponse = textResponse.replace(/^\`\`\`json/i, '').replace(/\`\`\`$/, '').trim();
      } else if (textResponse.startsWith('\`\`\`')) {
        textResponse = textResponse.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
      }

      return JSON.parse(textResponse);
    }
  },
  {
    name: 'GROK',
    call: async (systemPrompt, userMessages) => {
      // 5. GROK
      throw new Error('GROK não implementado')
    }
  }
];

export default async (req, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { headers, status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { headers, status: 405 });
  }

  try {
    const body = await req.json();
    const { systemPrompt, userMessages } = body;

    if (!systemPrompt || !userMessages || !Array.isArray(userMessages)) {
      return new Response(
        JSON.stringify({ error: 'systemPrompt e userMessages são obrigatórios' }),
        { status: 400, headers }
      );
    }

    let lastError = null;

    // Estratégia de Fallback Linear
    for (const provider of providers) {
      try {
        console.log(`Tentando provedor de IA: ${provider.name}...`);
        const result = await provider.call(systemPrompt, userMessages);
        
        console.log(`Sucesso com ${provider.name}`);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
        
      } catch (err) {
        console.error(`Falha no ${provider.name}:`, err.message);
        lastError = err.message;
        // Continua para o próximo provedor
      }
    }

    // Se saiu do loop, todos os provedores falharam
    return new Response(JSON.stringify({ 
      error: 'Todos os provedores de IA falharam no fallback',
      details: lastError
    }), { status: 502, headers });

  } catch (error) {
    console.error('Erro geral no handler de IA:', error);
    return new Response(JSON.stringify({ error: 'Erro interno no servidor', details: error.message }), {
      status: 500,
      headers
    });
  }
};
