import { logprobModels } from "./_models.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return j({ error: "bad json" }, 400);
  }

  const { model = "openai/gpt-chat-latest", prompt } = body || {};
  if (!prompt) return j({ error: "missing prompt" }, 400);

  const allowed = await logprobModels();
  if (!allowed.includes(model))
    return j({ error: "model not allowed (no logprobs or unknown id)" }, 400);

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
      provider: { require_parameters: true },
    }),
  });

  return new Response(await r.text(), {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}

const j = (o, s) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { "Content-Type": "application/json" },
  });
