import { NextRequest, NextResponse } from "next/server";

// ── Acreage filter — applied to every land response ───────────────────────
// Parses <<<DEAL>>> blocks and removes any parcel under minAcres.
function extractAcreage(details: string): number | null {
  const m = details.match(/(\d+\.?\d*)\s*acre/i);
  return m ? parseFloat(m[1]) : null;
}

function filterDealBlocks(text: string, minAcres: number): string {
  // Split into deal blocks and surrounding text
  const parts = text.split(/(<<<DEAL>>>[\s\S]*?<<<END_DEAL>>>)/g);
  return parts
    .map((part) => {
      if (!part.startsWith("<<<DEAL>>>")) return part;
      try {
        const jsonStr = part.replace("<<<DEAL>>>", "").replace("<<<END_DEAL>>>", "").trim();
        const deal = JSON.parse(jsonStr);
        const acres = extractAcreage(deal.details || "");
        if (acres !== null && acres < minAcres) {
          // Replace with a note so the user knows it was filtered
          return `\n*[Skipped: ${deal.address} — ${acres} acres is below the 2-acre minimum]*\n`;
        }
      } catch {
        // Can't parse → keep as-is
      }
      return part;
    })
    .join("");
}

// ── Token budget ──────────────────────────────────────────────────────────
// Groq free tier: 12,000 TPM. Cap history at ~6k chars to leave room for
// system prompt + search results + output.
const HISTORY_BUDGET_CHARS = 6000;

function trimMessages(
  messages: Array<{ role: string; content: string }>,
  budgetChars: number
): Array<{ role: string; content: string }> {
  if (!messages.length) return messages;
  const result: typeof messages = [];
  let used = 0;
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
  if (!process.env.TAVILY_API_KEY) return "";
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
    return (data.answer ? `ANSWER: ${data.answer}\n\n` : "") + (lines || "");
  } catch {
    return "";
  }
}

// ── Groq: single call, no tool loop (for formatting search results) ───────
async function groqFormat(prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Groq: full tool-calling loop ──────────────────────────────────────────
interface GroqMsg {
  role: string;
  content: string | null;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

const SEARCH_TOOL = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the web for real-time property listings, parcel records, foreclosures, owner data. " +
        "Search Regrid.com for parcel/APN data. Search PropertyRadar.com for distress data.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query including city, state, and current year" },
        },
        required: ["query"],
      },
    },
  },
];

type GroqResult = { text: string; tokenError: boolean };

async function runGroq(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  budgetChars: number
): Promise<GroqResult> {
  const trimmed = trimMessages(messages, budgetChars);
  const groqMessages: GroqMsg[] = [
    { role: "system", content: systemPrompt },
    ...trimmed.map((m) => ({ role: m.role, content: m.content })),
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
        tools: SEARCH_TOOL,
        tool_choice: "auto",
        max_tokens: 2000,
        temperature: 0.15,
      }),
    });

    if (res.status === 429) return { text: "RATE_LIMITED", tokenError: false };

    const data = await res.json();
    if (data.error) {
      const msg: string = data.error.message || "";
      const isTokenError =
        msg.includes("too large") ||
        msg.includes("tokens per minute") ||
        msg.includes("TPM") ||
        msg.includes("Request too large");
      return { text: isTokenError ? "" : `⚠️ ${msg}`, tokenError: isTokenError };
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

// ── Search-then-format fallback (Tavily → Groq format, no history) ────────
// Used when the full Groq loop is blocked by token limits or rate limits.
// Searches Tavily, then asks Groq to format results as deal blocks with no history baggage.
async function searchAndFormat(systemPrompt: string, userMessage: string): Promise<string> {
  const query = userMessage.slice(0, 300);
  const searchResults = await searchWeb(query);

  if (!searchResults) {
    return "⚠️ Search is unavailable right now. Please try again in a moment.";
  }

  if (!process.env.GROQ_API_KEY) {
    return `Search results (AI formatting unavailable):\n\n${searchResults}`;
  }

  // Extract only the deal output format rules from the system prompt
  const dealFormat = systemPrompt.includes("<<<DEAL>>>")
    ? systemPrompt.slice(systemPrompt.indexOf("<<<DEAL>>>") - 200)
    : `Format each real property as:
<<<DEAL>>>
{ "address":"full numbered street address","details":"size/type/details","status":"strong","statusLabel":"Strong Opportunity","isQCT":false,"isOZ":false,"riskScore":"Low","feasibilityScore":8,"dealSignals":["signal"],"source":"source name","listingUrl":"url","owner":{"name":"","address":"","apn":"","ownerType":"","yearsOwned":""},"financials":[{"label":"Asking","value":"$X"},{"label":"Per Acre","value":"$X"},{"label":"Est. Units","value":"X"},{"label":"Land %","value":"X%","highlight":true}] }
<<<END_DEAL>>>`;

  const formatPrompt = `You are a real estate deal analyst. The user asked: "${userMessage}"

Below are real web search results. Extract every property that matches what the user asked for and format each one as a <<<DEAL>>> block. Only include properties with real numbered street addresses (not intersections). Only include current listings.

SEARCH RESULTS:
${searchResults.slice(0, 10000)}

${dealFormat}

Output only deal blocks plus a brief summary sentence. Do not invent data — use only what the search results contain.`;

  const formatted = await groqFormat(formatPrompt);
  return formatted || `I found search results but couldn't format them. Here's what was found:\n\n${searchResults.slice(0, 2000)}`;
}

// ── Anthropic call ────────────────────────────────────────────────────────
async function callAnthropic(body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
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

    const lastUserMsg =
      [...(messages || [])].reverse().find((m: { role: string }) => m.role === "user")?.content || "";

    // Is this a land search? Apply 2-acre minimum filter to responses.
    const isLandAgent = (system || "").toLowerCase().includes("land acquisition") ||
      (system || "").toLowerCase().includes("acre");
    const applyAcreFilter = (txt: string) =>
      isLandAgent ? filterDealBlocks(txt, 2) : txt;

    // ── 1. Anthropic (primary) ─────────────────────────────────────────────
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

    // ── 2. Groq with full tool-calling loop ────────────────────────────────
    if (hasGroq) {
      // First attempt: normal history budget
      let result = await runGroq(system || "", messages || [], HISTORY_BUDGET_CHARS);

      // Second attempt: token error → cut history in half
      if (result.tokenError) {
        console.warn("Groq token limit — retrying with shorter history");
        result = await runGroq(system || "", messages || [], HISTORY_BUDGET_CHARS / 3);
      }

      // Third attempt: still token error or rate limited → search-and-format (no history)
      if (result.tokenError || result.text === "RATE_LIMITED") {
        console.warn("Groq blocked — switching to search-and-format fallback");
        if (hasTavily) {
          const text = applyAcreFilter(await searchAndFormat(system || "", lastUserMsg));
          return NextResponse.json({ content: [{ type: "text", text }], model: "tavily+groq/format" });
        }
        return NextResponse.json({
          content: [{ type: "text", text: "⏳ AI is busy. Please start a new chat to clear history, then try again." }],
        });
      }

      return NextResponse.json({
        content: [{ type: "text", text: applyAcreFilter(result.text) || "⚠️ No response received. Please try again." }],
        model: "groq/llama-3.3-70b-versatile",
      });
    }

    // ── 3. Tavily + Groq format (no Groq chat loop available) ─────────────
    if (hasTavily) {
      const text = await searchAndFormat(system || "", lastUserMsg);
      return NextResponse.json({ content: [{ type: "text", text }], model: "tavily+groq/format" });
    }

    return NextResponse.json({
      content: [{ type: "text", text: "⚠️ No AI API configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY to .env.local" }],
    });
  } catch (error) {
    console.error("Chat proxy error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
