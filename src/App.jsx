import { useState } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  ChevronDown,
  Info,
  FlaskConical,
} from "lucide-react";

// --- tuning knobs ---------------------------------------------------------
const MAX_SURPRISAL = 4.0; // nats. ~1.8% token prob => fully "surprised" (warm end)

const MODELS = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "openai/gpt-4.1-mini", label: "GPT-4.1 mini" },
  { id: "openai/gpt-4.1", label: "GPT-4.1" },
  { id: "mistralai/mistral-7b-instruct", label: "Mistral 7B Instruct" },
];

// --- illustrative library (hand-authored logprobs; no network needed) -----
const EXAMPLES = [
  {
    id: "recall-paris",
    label: "Recall: capital of France",
    prompt: "What is the capital of France?",
    note: "Pure recall. Every token is near-certain and 'Paris' has almost zero surprisal. This is what low perplexity looks like.",
    tokens: [
      { token: "The", logprob: -0.31 },
      { token: " capital", logprob: -0.14 },
      { token: " of", logprob: -0.02 },
      { token: " France", logprob: -0.05 },
      { token: " is", logprob: -0.08 },
      {
        token: " Paris",
        logprob: -0.002,
        alts: [{ token: " the", logprob: -7.1 }],
      },
      { token: ".", logprob: -0.04 },
    ],
  },
  {
    id: "confident-wrong",
    label: "Confident but wrong",
    prompt: "Who wrote Pride and Prejudice?",
    note: "Low perplexity throughout, so the model is confident, but the answer is WRONG (Jane Austen, not Charlotte Brontë). Hover 'Charlotte': the correct name 'Jane' was the close runner-up. Perplexity measures confidence, not correctness.",
    tokens: [
      { token: "Pride", logprob: -0.22 },
      { token: " and", logprob: -0.01 },
      { token: " Prejudice", logprob: -0.02 },
      { token: " was", logprob: -0.12 },
      { token: " written", logprob: -0.05 },
      { token: " by", logprob: -0.03 },
      {
        token: " Charlotte",
        logprob: -0.62,
        alts: [
          { token: " Jane", logprob: -0.9 },
          { token: " Mary", logprob: -2.6 },
        ],
      },
      { token: " Brontë", logprob: -0.34 },
      { token: " in", logprob: -0.21 },
      { token: " 18", logprob: -0.42 },
      { token: "13", logprob: -0.55 },
      { token: ".", logprob: -0.05 },
    ],
  },
  {
    id: "generative-song",
    label: "Generative: kids' song",
    prompt: "Write me two lines of a kids' song about a sleepy cat.",
    note: "Pure generation. There's no single right next word, so probability spreads across many options and surprisal stays high, yet the output is perfectly good. High perplexity does NOT mean bad.",
    tokens: [
      { token: "Little", logprob: -3.2 },
      { token: " cat", logprob: -1.8 },
      { token: ",", logprob: -0.5 },
      { token: " curled", logprob: -2.9 },
      { token: " up", logprob: -0.7 },
      { token: " tight", logprob: -2.2 },
      { token: ",", logprob: -0.3 },
      { token: "\n", logprob: -1.0 },
      { token: "Dreaming", logprob: -2.7 },
      { token: " through", logprob: -1.9 },
      { token: " the", logprob: -0.4 },
      { token: " moon", logprob: -2.1 },
      { token: "lit", logprob: -1.2 },
      { token: " night", logprob: -0.6 },
      { token: ".", logprob: -0.4 },
    ],
  },
  {
    id: "forward-estimate",
    label: "Forward-looking estimate",
    prompt: "Roughly what will the global population be in 2050?",
    note: "A genuine estimate. The hedging words ('likely', 'around', 'though estimates vary') carry the highest surprisal, because that's exactly where the model is least committed. Perplexity makes uncertainty visible in word choice.",
    tokens: [
      { token: "It", logprob: -1.1 },
      { token: " will", logprob: -0.8 },
      { token: " likely", logprob: -1.6 },
      { token: " be", logprob: -0.3 },
      { token: " around", logprob: -1.2 },
      { token: " 9", logprob: -1.0 },
      { token: ".", logprob: -0.2 },
      { token: "7", logprob: -1.4 },
      { token: " billion", logprob: -0.15 },
      { token: ",", logprob: -0.6 },
      { token: " though", logprob: -2.1 },
      { token: " estimates", logprob: -1.3 },
      { token: " vary", logprob: -0.5 },
      { token: ".", logprob: -0.3 },
    ],
  },
  {
    id: "lit-recall",
    label: "Literature recall",
    prompt: "What is the first line of Moby-Dick?",
    note: "A famous, heavily-quoted phrase. Once the model commits to the quote, 'me' after 'Call' and 'mael' after 'Ish' are near-certain. Memorized sequences score low: familiarity from training, not novelty, drives the number down.",
    tokens: [
      { token: "The", logprob: -0.7 },
      { token: " opening", logprob: -1.4 },
      { token: " line", logprob: -0.3 },
      { token: " is", logprob: -0.5 },
      { token: ":", logprob: -0.8 },
      { token: ' "', logprob: -0.6 },
      { token: "Call", logprob: -0.45 },
      { token: " me", logprob: -0.05 },
      { token: " Ish", logprob: -0.3 },
      { token: "mael", logprob: -0.02 },
      { token: '."', logprob: -0.4 },
    ],
  },
  {
    id: "long-explainer",
    label: "Long response (length test)",
    prompt: "Explain photosynthesis in two sentences.",
    note: "Much longer, but overall perplexity stays low, because overall PP is an AVERAGE (geometric mean) over tokens, not a sum. Length alone doesn't raise perplexity; content type does. Compare this number to 'Paris' (short, low) and the kids' song (short, high).",
    tokens: [
      { token: "Photos", logprob: -0.9 },
      { token: "ynthesis", logprob: -0.02 },
      { token: " is", logprob: -0.2 },
      { token: " the", logprob: -0.5 },
      { token: " process", logprob: -0.7 },
      { token: " by", logprob: -0.3 },
      { token: " which", logprob: -0.1 },
      { token: " plants", logprob: -0.4 },
      { token: " convert", logprob: -0.9 },
      { token: " sunlight", logprob: -0.6 },
      { token: " into", logprob: -0.3 },
      { token: " chemical", logprob: -1.1 },
      { token: " energy", logprob: -0.2 },
      { token: ".", logprob: -0.3 },
      { token: " They", logprob: -0.8 },
      { token: " use", logprob: -0.9 },
      { token: " carbon", logprob: -0.7 },
      { token: " dioxide", logprob: -0.05 },
      { token: " and", logprob: -0.2 },
      { token: " water", logprob: -0.3 },
      { token: " to", logprob: -0.4 },
      { token: " produce", logprob: -0.8 },
      { token: " glucose", logprob: -0.6 },
      { token: " and", logprob: -0.5 },
      { token: " release", logprob: -0.7 },
      { token: " oxygen", logprob: -0.1 },
      { token: ".", logprob: -0.2 },
    ],
  },
];

// --- math helpers ---------------------------------------------------------
const surprisal = (logprob) => -logprob;
const pp = (s) => Math.exp(s);
const prob = (logprob) => Math.exp(logprob) * 100;
const meanSurprisal = (tokens) =>
  tokens.reduce((a, t) => a + surprisal(t.logprob), 0) / tokens.length;

function colorFor(s) {
  const t = Math.max(0, Math.min(1, s / MAX_SURPRISAL));
  const hue = 165 - 165 * t; // teal (confident) -> red (surprised)
  return {
    bg: `hsl(${hue} 78% 91%)`,
    border: `hsl(${hue} 60% 72%)`,
    text: `hsl(${hue} 55% 24%)`,
  };
}

function groupWords(tokens) {
  const words = [];
  tokens.forEach((tk, i) => {
    const startsNew = i === 0 || /^\s/.test(tk.token);
    if (startsNew || words.length === 0)
      words.push({ idxs: [i], tokens: [tk] });
    else {
      const w = words[words.length - 1];
      w.idxs.push(i);
      w.tokens.push(tk);
    }
  });
  return words.map((w) => {
    const sMean = meanSurprisal(w.tokens);
    const text = w.tokens
      .map((t) => t.token)
      .join("")
      .replace(/^\s+/, "");
    return { ...w, sMean, wordPP: pp(sMean), text: text === "" ? "·" : text };
  });
}

function buildResult({
  prompt,
  modelLabel,
  tokens,
  illustrative = false,
  note = "",
}) {
  const norm = tokens.map((t) => ({
    token: t.token,
    logprob: t.logprob,
    alts: (t.alts || []).filter((a) => a.token !== t.token).slice(0, 2),
  }));
  const meanS = meanSurprisal(norm);
  return {
    prompt,
    modelLabel,
    illustrative,
    note,
    tokens: norm,
    words: groupWords(norm),
    meanS,
    overallPP: pp(meanS),
    text: norm
      .map((t) => t.token)
      .join("")
      .replace(/^\s+/, ""),
  };
}

const fmt = (n) =>
  n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2);
const showTok = (t) => t.replace(/\n/g, "⏎").replace(/\t/g, "⇥");

// --- small components -----------------------------------------------------
function PPChip({ value, big }) {
  const c = colorFor(Math.log(Math.max(value, 1)));
  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold tabular-nums ${big ? "px-2.5 py-1 text-base rounded-lg" : "px-1.5 py-0.5 text-xs"}`}
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {fmt(value)}
    </span>
  );
}

function Pills({ items, mono, onEnter, onLeave }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap gap-1 leading-relaxed">
      {items.map((it, i) => {
        const c = colorFor(it.s);
        return (
          <span
            key={i}
            onMouseEnter={(e) => onEnter(e, it.tip)}
            onMouseLeave={onLeave}
            className={`inline-block rounded px-1 py-0.5 text-sm cursor-default ${mono ? "font-mono whitespace-pre" : ""}`}
            style={{
              background: c.bg,
              color: c.text,
              border: `1px solid ${c.border}`,
            }}
          >
            {it.display}
          </span>
        );
      })}
    </div>
  );
}

export default function PerplexityLab() {
  const [model, setModel] = useState(MODELS[0].id);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(() =>
    buildResult({
      ...EXAMPLES[1],
      modelLabel: "illustrative",
      illustrative: true,
    }),
  );
  const [history, setHistory] = useState([]);
  const [showMath, setShowMath] = useState(false);
  const [tip, setTip] = useState(null);

  const showTip = (e, content) => {
    const r = e.currentTarget.getBoundingClientRect();
    const below = r.top < 90; // flip under the pill when near the top
    setTip({
      left: r.left + r.width / 2,
      top: below ? r.bottom + 8 : r.top - 8,
      below,
      content,
    });
  };
  const hideTip = () => setTip(null);

  async function run() {
    if (!prompt.trim()) return setError("Type a prompt.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/logprobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt }),
      });
      if (res.status === 0)
        throw new Error("Request blocked — an ad blocker may be filtering this request. Try disabling it for this site.");
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.error?.message || `Request failed (${res.status})`,
        );
      const content = data.choices?.[0]?.logprobs?.content;
      if (!content?.length)
        throw new Error(
          "That model returned no logprobs. OpenAI models are the most reliable here.",
        );
      const r = buildResult({
        prompt,
        modelLabel: MODELS.find((m) => m.id === model)?.label || model,
        tokens: content.map((c) => ({
          token: c.token,
          logprob: c.logprob,
          alts: c.top_logprobs || [],
        })),
      });
      setResult(r);
      setHistory((h) => [{ ...r, ts: Date.now() }, ...h]);
    } catch (e) {
      setError(e.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  const wordItems = result.words.map((w) => ({
    s: w.sMean,
    display: w.text,
    tip: (
      <>
        <span className="font-semibold">“{w.text}”</span>
        <br />
        perplexity {fmt(w.wordPP)}
        <br />
        avg surprisal {w.sMean.toFixed(2)} nats · {w.tokens.length} token
        {w.tokens.length > 1 ? "s" : ""}
      </>
    ),
  }));

  const tokenItems = result.tokens.map((t) => {
    const s = surprisal(t.logprob);
    return {
      s,
      display: showTok(t.token),
      tip: (
        <>
          <span className="font-semibold font-mono">“{showTok(t.token)}”</span>
          <br />
          perplexity {fmt(pp(s))} · prob {prob(t.logprob).toFixed(1)}%<br />
          logprob {t.logprob.toFixed(3)} · surprisal {s.toFixed(2)} nats
          {t.alts.length > 0 && (
            <>
              <br />
              <span className="text-slate-400">also considered: </span>
              {t.alts.map((a, j) => (
                <span key={j} className="font-mono">
                  “{showTok(a.token)}” ({prob(a.logprob).toFixed(0)}%)
                  {j < t.alts.length - 1 ? ", " : ""}
                </span>
              ))}
            </>
          )}
        </>
      ),
    };
  });

  return (
    <div className="flex h-[660px] w-full bg-slate-50 text-slate-800 rounded-xl overflow-hidden border border-slate-200 font-sans">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
        <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
          <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Examples
          </span>
        </div>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            onClick={() => {
              setError("");
              setResult(
                buildResult({
                  ...ex,
                  modelLabel: "illustrative",
                  illustrative: true,
                }),
              );
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2"
          >
            <PPChip value={pp(meanSurprisal(ex.tokens))} />
            <span className="text-xs text-slate-600 leading-snug">
              {ex.label}
            </span>
          </button>
        ))}

        <div className="px-4 pt-4 pb-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Your runs
          </span>
        </div>
        {history.length === 0 && (
          <p className="px-4 py-1 text-xs text-slate-400">
            Live runs appear here.
          </p>
        )}
        {history.map((h) => (
          <button
            key={h.ts}
            onClick={() => {
              setError("");
              setResult(h);
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2"
          >
            <PPChip value={h.overallPP} />
            <span className="text-xs text-slate-600 leading-snug line-clamp-2">
              {h.prompt}
            </span>
          </button>
        ))}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="px-5 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h1 className="text-sm font-bold text-slate-800">Perplexity Lab</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Perplexity measures how{" "}
            <span className="font-medium">surprised</span> the model was by its
            own words — not whether they're correct, good, or true. Confident
            nonsense scores low; an unusual-but-right phrasing scores high.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 pt-10 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Generating + reading
              logprobs…
            </div>
          )}

          {result && !loading && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Overall perplexity
                  </span>
                  <PPChip value={result.overallPP} big />
                  <span className="text-[11px] text-slate-400">
                    geometric mean · {result.modelLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>confident</span>
                  <span
                    className="h-2.5 w-28 rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, hsl(165 78% 80%), hsl(82 78% 80%), hsl(0 78% 80%))",
                    }}
                  />
                  <span>surprised</span>
                </div>
              </div>

              {result.illustrative && (
                <div className="text-[11px] text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 leading-relaxed">
                  <span className="font-semibold">Illustrative example</span> —
                  logprobs are hand-authored to show the pattern, not measured
                  live.
                  {result.note && (
                    <>
                      <br />
                      {result.note}
                    </>
                  )}
                </div>
              )}

              <section>
                <div className="text-xs font-semibold text-slate-500 mb-1.5">
                  Response — by word
                </div>
                <Pills items={wordItems} onEnter={showTip} onLeave={hideTip} />
              </section>

              <section>
                <div className="text-xs font-semibold text-slate-500 mb-1.5">
                  Response — by token
                </div>
                <Pills
                  items={tokenItems}
                  mono
                  onEnter={showTip}
                  onLeave={hideTip}
                />
              </section>

              <section className="text-xs">
                <button
                  onClick={() => setShowMath((v) => !v)}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-700"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${showMath ? "rotate-180" : ""}`}
                  />
                  How this is computed
                </button>
                {showMath && (
                  <div className="mt-2 bg-slate-100 rounded-lg p-3 space-y-1.5 text-slate-600 font-mono leading-relaxed">
                    <div>surprisal sᵢ = −ln p(tokenᵢ)&nbsp;&nbsp;(nats)</div>
                    <div>token perplexity = e^(sᵢ)</div>
                    <div>
                      word perplexity = e^( (1/k)·Σ sᵢ )&nbsp;&nbsp;over the
                      word's k tokens
                    </div>
                    <div>
                      overall perplexity = e^( (1/N)·Σ sᵢ )&nbsp;&nbsp;over all
                      N tokens
                    </div>
                    <div className="font-sans text-slate-500 pt-1 flex gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Word and overall scores are the{" "}
                        <span className="font-medium">geometric mean</span> of
                        their token perplexities (e raised to the mean
                        surprisal), not an arithmetic average.
                      </span>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Input dock */}
        <div className="border-t border-slate-200 bg-white px-5 py-3 space-y-2">
          <div className="flex items-end gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
              }}
              rows={2}
              placeholder="Type a one-off prompt…  (⌘/Ctrl + Enter to send)"
              className="flex-1 resize-none text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400"
            />
            <button
              onClick={run}
              disabled={loading}
              className="shrink-0 h-10 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </main>

      {tip && (
        <div
          style={{
            position: "fixed",
            left: tip.left,
            top: tip.top,
            transform: tip.below
              ? "translate(-50%, 0)"
              : "translate(-50%, -100%)",
            zIndex: 9999,
            pointerEvents: "none",
          }}
          className="w-max max-w-xs rounded-lg bg-slate-900 text-slate-100 text-xs leading-relaxed px-3 py-2 shadow-lg"
        >
          {tip.content}
        </div>
      )}
    </div>
  );
}
