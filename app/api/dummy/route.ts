export const maxDuration = 15

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text: string }
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return Response.json(
        {
          reasoning: `Thinking about: "${text?.slice(0, 120) || ''}"`,
          reply: `Here is a demo answer to: "${text}"\n\n- Key point 1\n- Key point 2\n\nThis is placeholder content generated locally.`,
          sources: [
            {
              title: 'AI SDK',
              url: 'https://ai-sdk.dev',
              description: 'The AI Toolkit for TypeScript',
              quote: 'AI SDK streamlines LLM apps with sensible defaults.'
            },
            {
              title: 'Vercel',
              url: 'https://vercel.com',
              description: 'Frontend cloud',
              quote: 'Deploy previews and global edge network.'
            },
            {
              title: 'Next.js',
              url: 'https://nextjs.org',
              description: 'React framework',
              quote: 'Hybrid static & server rendering.'
            },
            {
              title: 'DeepSeek',
              url: 'https://deepseek.com',
              description: 'Reasoning model provider',
              quote: 'Reasoning-first models for complex tasks.'
            },
            {
              title: 'OpenAI',
              url: 'https://openai.com',
              description: 'Models and APIs',
              quote: 'GPT models for text and multimodal.'
            }
          ]
        },
        { status: 200 }
      )
    }

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a concise assistant. First provide a short one-sentence internal reasoning summary, then the final answer.' },
          { role: 'user', content: text },
        ],
        temperature: 0.7,
      }),
    })

    if (!completion.ok) {
      const msg = await completion.text()
      return Response.json(
        {
          reasoning: `Thinking about: "${text?.slice(0, 120) || ''}"`,
          reply: `Demo response (fallback). Upstream error: ${msg.slice(0, 120)}`,
        },
        { status: 200 }
      )
    }

    const data = (await completion.json()) as any
    const full = data?.choices?.[0]?.message?.content || ''
    // naive split: first line becomes a reasoning hint
    const [firstLine, ...rest] = full.split('\n')
    const reasoning = firstLine?.slice(0, 200) || `Thinking about: "${text?.slice(0, 120) || ''}"`
    const reply = rest.join('\n').trim() || full

    // Second call to fetch 5 sources
    let sources: any[] = []
    try {
      const src = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Return JSON with an array of 5 credible sources with {title,url,description,quote} about the user topic. Only return JSON.' },
            { role: 'user', content: text },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.5,
        }),
      })
      const srcJson = await src.json()
      const parsed = JSON.parse(srcJson?.choices?.[0]?.message?.content || '{"sources":[]}')
      sources = Array.isArray(parsed.sources) ? parsed.sources.slice(0,5) : []
    } catch {}

    if (!sources.length) {
      sources = [
        { title: 'AI SDK', url: 'https://ai-sdk.dev', description: 'The AI Toolkit for TypeScript', quote: 'AI SDK streamlines LLM apps.' },
        { title: 'Vercel', url: 'https://vercel.com', description: 'Frontend cloud', quote: 'Global edge network.' },
        { title: 'Next.js', url: 'https://nextjs.org', description: 'React framework', quote: 'Hybrid rendering.' },
        { title: 'OpenAI', url: 'https://openai.com', description: 'Models and APIs', quote: 'GPT models.' },
        { title: 'MDN', url: 'https://developer.mozilla.org', description: 'Web docs', quote: 'Authoritative web platform docs.' },
      ]
    }

    return Response.json({ reasoning, reply, sources }, { status: 200 })
  } catch (err: any) {
    return Response.json(
      {
        reasoning: 'Thinking…',
        reply: `Demo response (error fallback): ${String(err?.message || err)}`,
      },
      { status: 200 }
    )
  }
}


