import { NextRequest, NextResponse } from "next/server";

const NO_FABRICATION = `
STRICT DATA INTEGRITY RULES — FOLLOW EXACTLY:
1. NEVER invent, fabricate, or guess ANY data. Every field must come from an actual web search result you found.
2. NEVER make up owner names, APN numbers, addresses, prices, or DOM counts. Use "" (empty string) for any field you cannot find.
3. NEVER include a deal unless you found it via actual web search with a real listing URL or verifiable source.
4. ADDRESS FORMAT — CRITICAL: Every "address" field MUST be a real street address with a building number (e.g. "4821 W Sahara Ave, Las Vegas, NV 89102"). NEVER use intersection format ("Main St & Flamingo Rd"). Skip deals that only have intersection addresses.
5. CURRENCY — CRITICAL: Only return CURRENT listings from the current year or previous year. NEVER return listings from 2+ years ago. Always search with the current year in your query.
6. If you cannot find real qualifying current deals, return []. Do NOT invent deals.
7. QCT/OZ: only mark true if confirmed via search. Default to false.`;

const AGENT_PROMPTS: Record<string, string> = {
  land_acquisition: `You are a land acquisition specialist in AUTO-SCAN mode. Use web search to find REAL land opportunities — especially OFF-MARKET and distressed parcels — in the target market.
${NO_FABRICATION}

OFF-MARKET & DISTRESSED SEARCH TACTICS (use these first):
- Search Regrid.com for parcel data: "regrid [city] vacant land" or "site:regrid.com [city] parcel"
- Search PropertyRadar.com for distress signals: "propertyradar [city] tax default" or "site:propertyradar.com [city]"
- Search "[city] tax delinquent land sale" or "[county] tax lien properties"
- Search "[city] surplus land auction" or "[county] land disposition program"
- Search "[city] blighted property" or "[city] brownfield redevelopment land"
- Search Crexi.com for land 180+ days listed (motivated sellers)
- Search LoopNet.com for land with "price reduced" in listing

ON-MARKET SEARCH SOURCES:
- Regrid.com — parcel maps, APN, ownership data
- PropertyRadar.com — distress indicators, foreclosure, NOD data
- Crexi.com land listings — search "land for sale [market]"
- LoopNet.com — search "land [market] acres"
- Zillow land/lot listings — search "land lots for sale [market]"
- Auction.com or Ten-X for distressed/REO land

CRITERIA:
- Minimum 2 acres, target land basis ≤$700,000/acre, land cost ≤10% of total project cost
- QCT/OZ: check by searching "[address] opportunity zone" or HUD QCT map

DEAL SIGNALS (only if confirmed by search):
- "Off-market" / "Long-held" / "Tax delinquent" / "Price reduced" / "Estate/probate" / "QCT eligible" / "OZ eligible"

Return ONLY a valid JSON array. If no real deals found, return [].
[
  {
    "address": "REAL numbered street address — e.g. 4821 W Sahara Ave, Las Vegas, NV 89102",
    "details": "X acres · zoning · details from listing",
    "status": "strong",
    "statusLabel": "Strong Opportunity",
    "isQCT": false,
    "isOZ": false,
    "riskScore": "Low",
    "feasibilityScore": 7,
    "dealSignals": ["only confirmed signals"],
    "source": "Crexi | LoopNet | County Records | etc",
    "listingUrl": "actual URL from your search",
    "owner": {
      "name": "owner name if found, else ''",
      "address": "owner mailing address if found, else ''",
      "apn": "APN if found, else ''",
      "ownerType": "type if found, else ''",
      "yearsOwned": "years if found, else ''"
    },
    "financials": [
      { "label": "Asking", "value": "actual asking price from listing" },
      { "label": "Per Acre", "value": "calculated from actual price/acres" },
      { "label": "Est. Units", "value": "estimate based on acreage" },
      { "label": "Land %", "value": "calculated", "highlight": true }
    ]
  }
]`,

  fix_and_flip: `You are a fix & flip deal analyst in AUTO-SCAN mode. Use web search to find REAL residential properties — especially OFF-MARKET and distressed — in the target market.
${NO_FABRICATION}

OFF-MARKET & DISTRESSED SEARCH TACTICS (use these first):
- Search Regrid.com for owner data on distressed properties: "regrid [address]" or "site:regrid.com [city] foreclosure"
- Search PropertyRadar.com for pre-foreclosures and NOD: "propertyradar [city] foreclosure"
- Search "[city] pre-foreclosure homes" or "[city] notice of default"
- Search "[city] foreclosure listings" or "[city] bank-owned REO homes"
- Search Auction.com and Hubzu for distressed residential properties
- Search "[city] probate sale homes" or "[city] estate sale properties"
- Search Zillow for homes 90+ DOM with price reductions

ON-MARKET SEARCH SOURCES:
- Regrid.com — parcel + owner data
- PropertyRadar.com — distress / foreclosure data
- Zillow: "[market] homes for sale" sort by days listed (90+ DOM)
- Redfin: "[market] homes" sort by days on market
- Auction.com / Hubzu for REO/foreclosure
- Realtor.com for long-DOM listings

FINANCIAL MODEL: Purchase ~$1,100,000, Reno $70-$90/sqft, ARV ~$1,780,000, Target Profit ≥$300,000

DEAL SIGNALS (only if confirmed by search):
- "90+ DOM" / "Price reduced X%" / "REO/Bank-owned" / "Estate sale" / "Pre-foreclosure" / "Absentee owner"

Return ONLY a valid JSON array. If no real deals found, return [].
[
  {
    "address": "REAL numbered street address — e.g. 2847 Pinto Ln, Las Vegas, NV 89107",
    "details": "sqft · year built · DOM · condition from listing",
    "status": "strong",
    "statusLabel": "Strong Deal",
    "isQCT": false,
    "isOZ": false,
    "riskScore": "Low",
    "feasibilityScore": 7,
    "dealSignals": ["only confirmed signals"],
    "source": "Zillow | Redfin | Auction.com | etc",
    "listingUrl": "actual URL from your search",
    "owner": {
      "name": "owner name if shown, else ''",
      "address": "owner address if found, else ''",
      "apn": "APN if shown, else ''",
      "ownerType": "type if found, else ''",
      "yearsOwned": "years if found, else ''"
    },
    "financials": [
      { "label": "List", "value": "actual list price from listing" },
      { "label": "Reno", "value": "sqft × $80 estimate" },
      { "label": "ARV", "value": "estimated from comps if searched" },
      { "label": "Profit", "value": "ARV minus total in", "highlight": true }
    ]
  }
]`,
};

const CURRENT_YEAR = new Date().getFullYear();

async function runGroqScan(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) return "[]";

  // Simple Tavily search for the scan
  async function search(query: string): Promise<string> {
    if (!process.env.TAVILY_API_KEY) return `[No TAVILY_API_KEY — cannot search for: ${query}]`;
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
        }),
      });
      const data = await r.json();
      const results = (data.results || []) as Array<{ title: string; url: string; content: string }>;
      return results.map((res) => `TITLE: ${res.title}\nURL: ${res.url}\nSNIPPET: ${res.content}`).join("\n\n---\n\n");
    } catch {
      return `[Search error for: ${query}]`;
    }
  }

  const messages: Array<{ role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string }> = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const tools = [{ type: "function", function: { name: "web_search", description: "Search the web for current real estate listings and records", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }];

  for (let i = 0; i < 8; i++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, tools, tool_choice: "auto", max_tokens: 3000, temperature: 0.1 }),
    });

    if (res.status === 429) return "[]";
    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice) break;

    const assistantMsg = choice.message;
    messages.push(assistantMsg);
    if (choice.finish_reason === "stop" || !assistantMsg.tool_calls?.length) {
      return assistantMsg.content || "[]";
    }

    for (const tc of assistantMsg.tool_calls) {
      const args = JSON.parse(tc.function.arguments || "{}");
      const result = await search(args.query || "");
      messages.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
  }

  const last = [...messages].reverse().find((m) => m.role === "assistant");
  return (last?.content as string) || "[]";
}

export async function POST(req: NextRequest) {
  try {
    const { agentType, market } = await req.json();

    const systemPrompt = AGENT_PROMPTS[agentType];
    if (!systemPrompt) {
      return NextResponse.json({ error: "Unknown agent type" }, { status: 400 });
    }

    const userPrompt =
      agentType === "land_acquisition"
        ? `Use web_search NOW to find real land opportunities in ${market} — current ${CURRENT_YEAR} listings only. PRIORITIZE off-market and distressed: search "${market} tax delinquent land ${CURRENT_YEAR}", "${market} surplus land auction ${CURRENT_YEAR}", then search Crexi and LoopNet for 2+ acre parcels. ONLY return listings dated ${CURRENT_YEAR} or ${CURRENT_YEAR - 1}. Return ONLY deals with REAL NUMBERED STREET ADDRESSES. Provide real listing URLs. Do NOT fabricate — return [] if no qualifying deals found.`
        : `Use web_search NOW to find real residential investment properties in ${market} — current ${CURRENT_YEAR} listings only. PRIORITIZE off-market and distressed: search "${market} foreclosure listings ${CURRENT_YEAR}", "${market} REO bank-owned ${CURRENT_YEAR}", then search Zillow/Redfin for 90+ DOM listings. ONLY return active listings from ${CURRENT_YEAR} or ${CURRENT_YEAR - 1}. Return ONLY deals with REAL NUMBERED STREET ADDRESSES. Provide real listing URLs. Do NOT fabricate — return [] if no qualifying deals found.`;

    let text = "";

    // ── Groq path ──
    if (process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant")) {
      text = await runGroqScan(systemPrompt + `\n\nCURRENT MARKET: ${market}\nCURRENT YEAR: ${CURRENT_YEAR}`, userPrompt);
    } else {
      // ── Anthropic path ──
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "web-search-2025-03-05",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 3000,
          system: systemPrompt + `\n\nCURRENT MARKET: ${market}\nCURRENT YEAR: ${CURRENT_YEAR}`,
          messages: [{ role: "user", content: userPrompt }],
          tools: [{ type: "web_search_20250305", name: "web_search" }],
        }),
      });

      if (response.status === 429) {
        return NextResponse.json({ deals: [], error: "Rate limited — try again in a moment", market, agentType }, { status: 200 });
      }

      const data = await response.json();
      text = (data.content as Array<{ type: string; text?: string }>)
        ?.map((i) => (i.type === "text" ? i.text : ""))
        .filter(Boolean)
        .join("") || "";
    }

    // Extract the JSON array from the response
    // Try greedy match first, then fallback to non-greedy
    const jsonMatch = text?.match(/\[[\s\S]*\]/) || text?.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        const deals = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          deals,
          scannedAt: new Date().toISOString(),
          market,
          agentType,
        });
      } catch {
        // JSON parse failed
      }
    }

    return NextResponse.json({
      deals: [],
      scannedAt: new Date().toISOString(),
      market,
      agentType,
      rawResponse: text?.slice(0, 500),
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ error: "Scan failed", deals: [] }, { status: 500 });
  }
}
