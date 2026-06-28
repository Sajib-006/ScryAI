// ── InsForge Model Gateway client ────────────────────────────────
// InsForge provisions an OpenRouter key (covered by the Pro plan's model
// credits); we call Claude through OpenRouter's OpenAI-compatible API.
// Shared by the classifier and the verdict synthesizer.

export const GATEWAY_MODEL = "anthropic/claude-haiku-4.5";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export function gatewayLive(): boolean {
  return Boolean(process.env.INSFORGE_BASE_URL && process.env.INSFORGE_API_KEY);
}

let cachedKey: string | null = null;

async function openRouterKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const res = await fetch(
    `${process.env.INSFORGE_BASE_URL}/api/ai/openrouter/api-key`,
    { headers: { Authorization: `Bearer ${process.env.INSFORGE_API_KEY}` } }
  );
  if (!res.ok) throw new Error(`InsForge key provisioning failed: ${res.status}`);
  const data = await res.json();
  if (!data?.apiKey) throw new Error("No apiKey from InsForge gateway");
  cachedKey = data.apiKey as string;
  return cachedKey;
}

export async function gatewayChat(
  messages: Msg[],
  opts: { maxTokens?: number; model?: string } = {}
): Promise<string> {
  const key = await openRouterKey();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: opts.model ?? GATEWAY_MODEL,
      max_tokens: opts.maxTokens ?? 800,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Empty completion from gateway");
  return text;
}
