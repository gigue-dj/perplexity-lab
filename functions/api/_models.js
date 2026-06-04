const DAY = 86_400_000;
let MEM = { at: 0, list: null };

// OpenRouter models that actually return logprobs, minus :free variants. Cached ~daily.
export async function logprobModels() {
  if (MEM.list && Date.now() - MEM.at < DAY) return MEM.list;

  const cache = caches.default;
  const key = new Request("https://cache.local/or-logprob-models");
  let res = await cache.match(key);

  if (!res) {
    const up = await fetch(
      "https://openrouter.ai/api/v1/models?supported_parameters=logprobs",
    );
    const data = await up.json();
    const list = (data.data || [])
      .filter(
        (m) =>
          Array.isArray(m.supported_parameters) &&
          m.supported_parameters.includes("logprobs") &&
          !m.id.endsWith(":free"),
      )
      .map((m) => m.id);
    res = new Response(JSON.stringify(list), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "s-maxage=86400",
      },
    });
    await cache.put(key, res.clone());
  }

  MEM = { at: Date.now(), list: await res.json() };
  return MEM.list;
}
