import { logprobModels } from "./_models.js";

export async function onRequestGet() {
  return new Response(JSON.stringify(await logprobModels()), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
