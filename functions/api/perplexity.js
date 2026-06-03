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
    return j({ error: { message: "bad json" } }, 400);
  }

  const { model = "openai/gpt-4o-mini", prompt } = body || {};
  if (!prompt) return j({ error: { message: "missing prompt" } }, 400);
  if (!ALLOWED.has(model)) return j({ error: { message: "model not allowed" } }, 400);

  if (!env.OPENROUTER_API_KEY)
    return j({ error: { message: "OPENROUTER_API_KEY not configured on this deployment." } }, 500);

  let r;
  try {
    r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
        stream: false,
      }),
    });
  } catch (e) {
    return j({ error: { message: `Could not reach OpenRouter: ${e.message}` } }, 502);
  }

  const text = await r.text();
  if (!text)
    return j({ error: { message: `OpenRouter returned an empty response (HTTP ${r.status}).` } }, 502);

  return new Response(text, {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}

const j = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
