# Perplexity Lab

An interactive toy for exploring what **perplexity** actually measures in language models — not correctness, not quality, just how surprised the model was by its own word choices.

## What it does

Type a prompt, pick a model, and the app calls OpenRouter to generate a response with logprobs. Each word and token is colored on a teal→red scale: teal means the model was confident (low surprisal), red means it hesitated among many alternatives (high surprisal). Hover any token to see its exact probability and what the runner-up alternatives were.

The sidebar includes hand-authored illustrative examples to show the range — pure recall, confident-but-wrong, open-ended generation, hedged estimates — so the concept is clear without needing to run a live query first.

## Architecture

- **Frontend**: React + Vite, deployed on Cloudflare Pages
- **API proxy**: `functions/api/perplexity.js` — a Cloudflare Pages Function that forwards requests to OpenRouter and injects the API key from the `OPENROUTER_API_KEY` environment variable

## Local dev

```bash
npm install
npm run dev
```

For live queries locally you'll need a `OPENROUTER_API_KEY` wrangler secret or can use `wrangler pages dev` to emulate the Functions layer. The illustrative examples in the sidebar work without any key.

## Deploy

Push to the connected Cloudflare Pages project. Set `OPENROUTER_API_KEY` as an environment variable in the Pages dashboard.
