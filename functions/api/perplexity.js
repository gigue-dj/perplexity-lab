// Cloudflare Pages Function -> POST /api/perplexity
const ALLOWED = new Set([
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "openai/gpt-4.1-mini",
  "openai/gpt-4.1",
  "mistralai/mistral-7b-instruct",
]);

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return j({ error: "bad json" }, 400);
  }

  const { model = "openai/gpt-4o-mini", prompt } = body || {};
  if (!prompt) return j({ error: "missing prompt" }, 400);
  if (!ALLOWED.has(model)) return j({ error: "model not allowed" }, 400);

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      logprobs: true,
      top_logprobs: 3,
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  // pass OpenRouter's JSON straight through; the frontend parser is unchanged
  return new Response(await r.text(), {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}

const j = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
