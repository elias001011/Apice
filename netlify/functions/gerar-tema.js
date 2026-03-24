const providers = [
  {
    name: 'GROQ',
    call: async (systemPrompt, userMessages) => {
      const apiKey = process.env.GROQ_API_KEY || process.env.GROQ;
      if (!apiKey) throw new Error('GROQ Key missing');
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const payload = {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...userMessages],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return JSON.parse(data.choices[0].message.content);
    }
  },
  {
    name: 'OpenRouter',
    call: async (systemPrompt, userMessages) => {
      const apiKey = process.env.OR_API_KEY || process.env.OR;
      const url = 'https://openrouter.ai/api/v1/chat/completions';
      const payload = {
        model: "google/gemini-2.0-flash-exp:free",
        messages: [{ role: "system", content: systemPrompt }, ...userMessages],
        temperature: 0.7
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      let text = data.choices[0].message.content;
       const firstBrace = text.indexOf('{');
       const lastBrace = text.lastIndexOf('}');
       if (firstBrace !== -1 && lastBrace !== -1) {
         text = text.substring(firstBrace, lastBrace + 1);
       }
      return JSON.parse(text);
    }
  }
];

export default async (req, context) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (req.method === 'OPTIONS') return new Response('', { headers, status: 200 });

  const systemPrompt = `Você é um gerador de temas de redação estilo ENEM.
Gere um tema relevante e atual, junto com 3 textos motivadores curtos.
Responda APENAS JSON:
{
  "tema": "O título do tema",
  "material": "Texto motivador 1... Texto motivador 2... Texto motivador 3..."
}`;

  const userMessages = [{ role: 'user', content: 'Gere um tema aleatório seguindo o padrão ENEM.' }];

  for (const provider of providers) {
    try {
      const result = await provider.call(systemPrompt, userMessages);
      return new Response(JSON.stringify(result), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
    } catch (err) {
      console.error(err);
    }
  }

  return new Response(JSON.stringify({ error: 'All providers failed' }), { status: 502, headers });
};
