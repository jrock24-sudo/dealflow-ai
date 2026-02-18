import { NextRequest, NextResponse } from "next/server";

// ── Tavily search (used by Groq path) ────────────────────────────────────
async function searchWeb(query: string): Promise<string> {
  if (!process.env.TAVILY_API_KEY) {
    return `[No TAVILY_API_KEY set. Query: "${query}"]`;
  }
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
  maxTokens: number
): Promise<string> {
  const groqMessages: GroqMsg[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

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

  for (let i = 0; i < 10; i++) {
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
        max_tokens: maxTokens,
        temperature: 0.15,
      }),
    });

    if (res.status === 429) return "⏳ AI is busy — wait 30 seconds and try again.";
    const data = await res.json();
    if (data.error) return `⚠️ ${data.error.message || "AI error"}`;

    const choice = data.choices?.[0];
    if (!choice) break;

    const msg = choice.message as GroqMsg;
    groqMessages.push(msg);

    if (choice.finish_reason === "stop" || !msg.tool_calls?.length) {
      return msg.content || "No response generated.";
    }

    // Execute tool calls
    const results = await Promise.all(
      msg.tool_calls.map(async (tc) => {
        const args = JSON.parse(tc.function.arguments || "{}");
        return { id: tc.id, result: await searchWeb(args.query || "") };
      })
    );
    for (const { id, result } of results) {
      groqMessages.push({ role: "tool", tool_call_id: id, content: result });
    }
  }

  const last = [...groqMessages].reverse().find((m) => m.role === "assistant");
  return last?.content || "No response.";
}

// ── Anthropic call ────────────────────────────────────────────────────────
async function callAnthropic(body: Record<string, unknown>) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
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
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { system, messages, max_tokens = 4000 } = body;

    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant");
    const hasGroq = !!process.env.GROQ_API_KEY;

    // ── Try Anthropic first ──
    if (hasAnthropic) {
      const res = await callAnthropic(body);
      const data = await res.json();

      // If rate limited or credit error → fall through to Groq
      const isRateLimited = res.status === 429;
      const isCreditError =
        data?.error?.type === "authentication_error" ||
        data?.error?.message?.toLowerCase().includes("credit") ||
        data?.error?.message?.toLowerCase().includes("billing");

      if (!isRateLimited && !isCreditError) {
        // Success or other error — return as-is
        return NextResponse.json(data, { status: res.status });
      }

      // Log fallback reason
      console.warn(`Anthropic unavailable (${isRateLimited ? "429" : "credit"}) — falling back to Groq`);

      if (!hasGroq) {
        const msg = isRateLimited
          ? "⏳ Rate limited — wait 30–60 seconds and retry."
          : "⚠️ Anthropic credit balance too low. Add GROQ_API_KEY to .env.local for a free fallback.";
        return NextResponse.json({ content: [{ type: "text", text: msg }] });
      }
    }

    // ── Groq path (fallback or primary when no Anthropic) ──
    if (hasGroq) {
      const text = await runGroq(system || "", messages || [], max_tokens);
      return NextResponse.json({
        content: [{ type: "text", text }],
        model: "groq/llama-3.3-70b-versatile",
      });
    }

    return NextResponse.json(
      { content: [{ type: "text", text: "⚠️ No AI API configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY to .env.local" }] }
    );
  } catch (error) {
    console.error("Chat proxy error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
