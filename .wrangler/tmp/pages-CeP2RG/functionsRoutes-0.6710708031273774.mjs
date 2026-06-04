import { onRequestPost as __api_logprobs_js_onRequestPost } from "/Users/dj/Projects/gigue-ai/perplexity-lab/functions/api/logprobs.js"
import { onRequestGet as __api_models_js_onRequestGet } from "/Users/dj/Projects/gigue-ai/perplexity-lab/functions/api/models.js"

export const routes = [
    {
      routePath: "/api/logprobs",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_logprobs_js_onRequestPost],
    },
  {
      routePath: "/api/models",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_models_js_onRequestGet],
    },
  ]