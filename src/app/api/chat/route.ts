import { NextRequest, NextResponse } from "next/server";

// ── Token estimation ──────────────────────────────────────────────────────
// Rough estimate: 1 token ≈ 4 chars. Groq free tier TPM limit: 12,000.
// We cap input at 7,000 tokens to leave room for output + system prompt.
const MAX_INPUT_CHARS = 7000 * 4; // ~28,000 chars for history

function trimMessages(
  messages: Array<{ role: string; content: string }>,
  budgetChars: number
): Array<{ role: string; content: string }> {
  // Always keep the last message (the new user question)
  if (!messages.length) return messages;
  const result: typeof messages = [];
  let used = 0;
  // Walk from newest to oldest, keep what fits
  for (let i = messages.length - 1; i >= 0; i--) {
    const len = (messages[i].content || "").length;
    if (used + len > budgetChars && result.length > 0) break;
    result.unshift(messages[i]);
    used += len;
  }
  return result;
}

// ── Tavily search ─────────────────────────────────────────────────────────
async function searchWeb(query: string): Promise<string> {
  if (!process.env.TAVILY_API_KEY) return `[No TAVILY_API_KEY. Query: "${query}"]`;
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        max_results: 6,
        include_answer: true,
        include_raw_content: false,
      }),
    });
    const data = await r.json();
    const results = (data.results || []) as Array<{ title: string; url: string; content: string }>;
    const lines = results
      .map((res) => `TITLE: ${res.title}\nURL: ${res.url}\nSNIPPET: ${res.content}`)
      .join("\n\n---\n\n");
    return (data.answer ? `ANSWER: ${data.answer}\n\n` : "") + (lines || "No results.");
  } catch {
    return `[Search failed for: "${query}"]`;
  }
}

// ── Tavily-only fallback (no AI, just raw search results) ─────────────────
async function tavilyFallback(userMessage: string): Promise<string> {
  const results = await searchWeb(userMessage);
  if (!results || results.startsWith("[")) {
    return "⚠️ All AI providers are unavailable right now and search also failed. Please try again in a moment.";
  }
  return `Here are the latest search results for your query:\n\n${results}\n\n---\n*Results from Tavily web search — AI summarization unavailable at this moment.*`;
}

// ── Groq tool-calling loop ────────────────────────────────────────────────
interface GroqMsg {
  role: string;
  content: string | null;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

async function runGroq(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  retryWithFewerMessages = false
): Promise<{ text: string; tokenError: boolean }> {
  // Trim history to fit token budget. On retry, be even more aggressive.
  const budget = retryWithFewerMessages ? MAX_INPUT_CHARS / 4 : MAX_INPUT_CHARS;
  const trimmed = trimMessages(messages, budget);

  const groqMessages: GroqMsg[] = [
    { role: "system", content: systemPrompt },
    ...trimmed.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Cap output tokens to leave headroom under TPM limit
  const cappedTokens = Math.min(maxTokens, 2000);

  const tools = [
    {
      type: "function",
      function: {
        name: "web_search",
        description:
          "Search the web for real-time property listings, parcel records, foreclosures, owner data. " +
          "Search Regrid.com for parcel/APN data. Search PropertyRadar.com for distress data. " +
          "Always use to find current, real information.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Specific search query including city, state and current year" },
          },
          required: ["query"],
        },
      },
    },
  ];

  for (let i = 0; i < 8; i++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        tools,
        tool_choice: "auto",
        max_tokens: cappedTokens,
        temperature: 0.15,
      }),
    });

    if (res.status === 429) return { text: "RATE_LIMITED", tokenError: false };

    const data = await res.json();

    // Detect token-too-large errors
    if (data.error) {
      const msg: string = data.error.message || "";
      if (msg.includes("too large") || msg.includes("tokens per minute") || msg.includes("TPM")) {
        return { text: "", tokenError: true };
      }
      return { text: `⚠️ ${msg}`, tokenError: false };
    }

    const choice = data.choices?.[0];
    if (!choice) break;

    const msg = choice.message as GroqMsg;
    groqMessages.push(msg);

    if (choice.finish_reason === "stop" || !msg.tool_calls?.length) {
      return { text: msg.content || "", tokenError: false };
    }

    // Execute tool calls (web search)
    const toolResults = await Promise.all(
      msg.tool_calls.map(async (tc) => {
        const args = JSON.parse(tc.function.arguments || "{}");
        return { id: tc.id, result: await searchWeb(args.query || "") };
      })
    );
    for (const { id, result } of toolResults) {
      groqMessages.push({ role: "tool", tool_call_id: id, content: result });
    }
  }

  const last = [...groqMessages].reverse().find((m) => m.role === "assistant");
  return { text: last?.content || "", tokenError: false };
}

// ── Anthropic call ────────────────────────────────────────────────────────
async function callAnthropic(body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout
  try {
    return await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        ...body,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });
  } finally {
    clearTimeout(timeout);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { system, messages, max_tokens = 2000 } = body;

    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant");
    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasTavily = !!process.env.TAVILY_API_KEY;

    // Extract last user message for Tavily fallback
    const lastUserMsg = [...(messages || [])].reverse().find((m: { role: string }) => m.role === "user")?.content || "";

    // ── 1. Try Anthropic ──────────────────────────────────────────────────
    if (hasAnthropic) {
      try {
        const res = await callAnthropic(body);
        const data = await res.json();

        const isRateLimited = res.status === 429;
        const isCreditError =
          data?.error?.type === "authentication_error" ||
          data?.error?.message?.toLowerCase().includes("credit") ||
          data?.error?.message?.toLowerCase().includes("billing");

        if (!isRateLimited && !isCreditError) {
          return NextResponse.json(data, { status: res.status });
        }
        console.warn(`Anthropic unavailable (${isRateLimited ? "429" : "credit"}) — trying Groq`);
      } catch (err) {
        console.warn("Anthropic network error — trying Groq:", (err as Error).message);
      }
    }

    // ── 2. Try Groq ───────────────────────────────────────────────────────
    if (hasGroq) {
      let result = await runGroq(system || "", messages || [], max_tokens, false);

      // If token limit hit, retry with shorter history
      if (result.tokenError) {
        console.warn("Groq token limit hit — retrying with trimmed history");
        result = await runGroq(system || "", messages || [], max_tokens, true);
      }

      // If still token error, try Tavily fallback
      if (result.tokenError) {
        console.warn("Groq still over limit — falling back to Tavily direct search");
        if (hasTavily) {
          const text = await tavilyFallback(lastUserMsg);
          return NextResponse.json({ content: [{ type: "text", text }], model: "tavily/direct" });
        }
        return NextResponse.json({ content: [{ type: "text", text: "⚠️ Request too large. Please start a new chat to clear history and try again." }] });
      }

      if (result.text === "RATE_LIMITED") {
        // Groq rate limited — try Tavily
        console.warn("Groq rate limited — falling back to Tavily");
        if (hasTavily) {
          const text = await tavilyFallback(lastUserMsg);
          return NextResponse.json({ content: [{ type: "text", text }], model: "tavily/direct" });
        }
        return NextResponse.json({ content: [{ type: "text", text: "⏳ All AI providers are busy. Wait 30 seconds and try again." }] });
      }

      return NextResponse.json({
        content: [{ type: "text", text: result.text || "⚠️ No response. Please try again." }],
        model: "groq/llama-3.3-70b-versatile",
      });
    }

    // ── 3. Tavily-only fallback ───────────────────────────────────────────
    if (hasTavily) {
      const text = await tavilyFallback(lastUserMsg);
      return NextResponse.json({ content: [{ type: "text", text }], model: "tavily/direct" });
    }

    return NextResponse.json({
      content: [{ type: "text", text: "⚠️ No AI API configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY to .env.local" }],
    });
  } catch (error) {
    console.error("Chat proxy error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
