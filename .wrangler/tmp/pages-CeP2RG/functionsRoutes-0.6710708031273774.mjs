import { onRequestPost as __api_logprobs_js_onRequestPost } from "/Users/dj/Projects/gigue-ai/perplexity-lab/functions/api/logprobs.js"

export const routes = [
    {
      routePath: "/api/logprobs",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_logprobs_js_onRequestPost],
    },
  ]