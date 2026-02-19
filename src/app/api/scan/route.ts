import { NextRequest, NextResponse } from "next/server";

const NO_FABRICATION = `
STRICT DATA INTEGRITY RULES — FOLLOW EXACTLY:
1. NEVER invent, fabricate, or guess ANY data. Every field must come from an actual web search result you found.
2. NEVER make up owner names, APN numbers, addresses, prices, or DOM counts. Use "" (empty string) for any field you cannot find.
3. NEVER include a deal unless you found it via actual web search with a real listing URL or verifiable source.
4. ADDRESS FORMAT — CRITICAL: Every "address" field MUST be a real street address with a building number (e.g. "4821 W Sahara Ave, Las Vegas, NV 89102"). NEVER use intersection format ("Main St & Flamingo Rd"). Skip deals that only have intersection addresses.
5. CURRENCY — CRITICAL: Only return CURRENT listings from the current year or previous year. NEVER return listings from 2+ years ago. Always search with the current year in your query.
6. If you cannot find real qualifying current deals, return []. Do NOT invent deals.
7. QCT/OZ: only mark true if confirmed via search. Default to false.
8. ACREAGE — HARD MINIMUM: For land deals, NEVER include any parcel under 2.0 acres. If a listing says 0.5 acres, 1.5 acres, or any number below 2.0, SKIP IT. Only include parcels that are confirmed 2.0 acres or larger from the actual listing. This is non-negotiable.`;

const AGENT_PROMPTS: Record<string, string> = {
  land_acquisition: `You are an institutional land acquisition analyst in AUTO-SCAN mode — operate like a top-tier hedge fund real estate desk. Search exhaustively and aggressively. NEVER give up after 1–2 searches. Run ALL searches listed below before returning results.
${NO_FABRICATION}

MANDATORY SEARCH SEQUENCE — run every one of these:
1. "land for sale [market] 2 acres site:crexi.com"
2. "land for sale [market] 2+ acres site:loopnet.com"
3. "[market] vacant land 2 acres for sale 2025"
4. "Clark County tax delinquent land 2024 2025"
5. "Clark County surplus land disposition sale"
6. "City of Las Vegas surplus land program"
7. "Nevada tax lien sale Clark County vacant parcel"
8. "BLM Bureau of Land Management Nevada auction Las Vegas 2025"
9. "Henderson NV land 2 acres for sale 2025"
10. "North Las Vegas land parcel acres for sale 2025"
11. "site:zillow.com land Las Vegas acres"
12. "site:regrid.com Clark County vacant land parcel"

CLARK COUNTY — SEARCH ALL JURISDICTIONS SEPARATELY:
Las Vegas · Henderson · North Las Vegas · Unincorporated Clark County · Boulder City

DATA SOURCES (search all):
Crexi.com · LoopNet.com · Zillow Land · Realtor.com · LandWatch · LandAndFarm · ListingHaven
Clark County Assessor (assessor.clarkcountynv.gov) · Clark County Treasurer (tax delinquent)
City of Las Vegas Land Management · BLM Nevada · Nevada SOS
PropertyRadar.com · Regrid.com · Auction.com · BatchLeads · ATTOM

CRITERIA:
- MINIMUM 2.0 ACRES — hard floor. Skip anything under 2.0 acres, no exceptions.
- Target land basis ≤ $700,000/acre · Land cost ≤ 10% of total project cost
- Zoning: R-3, R-4, C-1, C-2, MUD, TOD corridor, or rezoning potential

FEASIBILITY CALC (compute for every deal):
- Est. Units = acres × 30 (R-3), ×50 (R-4), ×60 (mixed-use)
- Est. Construction = units × 1,000 sqft × $200/sqft
- Soft Costs = Construction × 22%
- Total Project = Construction + Soft + Land
- Land % = Land ÷ Total × 100 → ✅ ≤10% · ⚠️ 10–15% · ❌ >15%

DEAL SIGNALS: Tax delinquent · Long-held · Absentee owner · Price reduced · 180+ DOM · Gov surplus · BLM auction · OZ/QCT · TOD corridor · Assemblage play

Return ONLY a valid JSON array. Try hard to find real deals — only return [] if every search above returns nothing relevant.
[
  {
    "address": "REAL numbered street address — e.g. 4821 W Sahara Ave, Las Vegas, NV 89102",
    "details": "X.X acres · Zoning · Key details from listing",
    "status": "strong",
    "statusLabel": "Strong Development Opportunity",
    "isQCT": false,
    "isOZ": false,
    "riskScore": "Low",
    "feasibilityScore": 8,
    "dealSignals": ["Tax Delinquent", "Long-held", "OZ Eligible"],
    "source": "Crexi | LoopNet | County Records | BLM | etc",
    "listingUrl": "actual URL from your search",
    "owner": {
      "name": "owner name if found, else ''",
      "address": "owner mailing address if found, else ''",
      "apn": "APN if found, else ''",
      "ownerType": "Private / Corporate / Government / ''",
      "yearsOwned": "years if found, else ''"
    },
    "financials": [
      { "label": "Asking", "value": "actual asking price from listing" },
      { "label": "Per Acre", "value": "calculated from actual price/acres" },
      { "label": "Est. Units", "value": "calculated estimate" },
      { "label": "Land %", "value": "calculated", "highlight": true }
    ]
  }
]`,

  fix_and_flip: `You are an institutional fix & flip analyst in AUTO-SCAN mode — operate like a high-performing hedge fund real estate desk. Search exhaustively and aggressively across all distress channels. NEVER give up after 1–2 searches.
${NO_FABRICATION}

MANDATORY SEARCH SEQUENCE — run every one of these:
1. "[market] homes for sale 90 days on market 2025"
2. "[market] price reduced homes for sale"
3. "[market] foreclosure listings REO bank owned 2025"
4. "[market] pre-foreclosure notice of default 2025"
5. "site:zillow.com [market] homes for sale"
6. "site:redfin.com [market] homes price drop"
7. "[market] probate sale estate sale homes"
8. "site:auction.com [market] residential"
9. "site:hubzu.com [market]"
10. "[market] absentee owner single family distressed"

FINANCIAL MODEL:
- Target Purchase: ~$1,100,000
- Reno: $70–$90/sqft ($70 cosmetic · $90 full gut)
- Target ARV: ~$1,780,000
- Target Profit: ≥ $300,000

DEAL MATH (calculate for EVERY deal):
1. Est. Reno = sqft × $80
2. Holding/Closing = purchase × 9%
3. Total In = Purchase + Reno + Holding
4. Est. Profit = ARV − Total In
5. ROI = Profit ÷ Total In × 100
6. ✅ Strong ≥ $300K · ⚠️ Marginal $200–299K · ❌ Not Qualified < $200K

ARV: Search "[market] renovated homes sold [sqft] 2024 2025" for comps. ARV = avg $/sqft × sqft.

DEAL SIGNALS: 90+ DOM · Price reduced · REO/Bank-owned · Pre-foreclosure · Estate/Probate · Absentee owner · Long-held · Below tax assessed value

Return ONLY a valid JSON array. Try hard to find real deals — only return [] if every search above returns nothing relevant.
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
        ? `Use web_search NOW to find real land opportunities ONLY in ${market} — current ${CURRENT_YEAR} listings only. MARKET LOCK: Every deal MUST be physically located in ${market}. NEVER return deals from other cities or states. ACREAGE: Only include parcels that are 2.0 acres or larger — confirmed from the actual listing. Skip any parcel under 2.0 acres. PRIORITIZE off-market and distressed: search "${market} tax delinquent land ${CURRENT_YEAR}", "${market} surplus land auction ${CURRENT_YEAR}", then search Crexi and LoopNet for 2+ acre parcels in ${market}. ONLY return listings dated ${CURRENT_YEAR} or ${CURRENT_YEAR - 1}. Return ONLY deals with REAL NUMBERED STREET ADDRESSES in ${market}. Provide real listing URLs. Do NOT fabricate — return [] if no qualifying deals found.`
        : `Use web_search NOW to find real residential investment properties ONLY in ${market} — current ${CURRENT_YEAR} listings only. MARKET LOCK: Every deal MUST be physically located in ${market}. NEVER return deals from other cities or states. PRIORITIZE off-market and distressed: search "${market} foreclosure listings ${CURRENT_YEAR}", "${market} REO bank-owned ${CURRENT_YEAR}", then search Zillow/Redfin for 90+ DOM listings in ${market}. ONLY return active listings from ${CURRENT_YEAR} or ${CURRENT_YEAR - 1}. Return ONLY deals with REAL NUMBERED STREET ADDRESSES in ${market}. Provide real listing URLs. Do NOT fabricate — return [] if no qualifying deals found.`;

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
        const rawDeals = JSON.parse(jsonMatch[0]) as Array<{ details?: string }>;

        // Hard server-side filter: remove any land deal under 2 acres
        const deals = agentType === "land_acquisition"
          ? rawDeals.filter((d) => {
              const m = (d.details || "").match(/(\d+\.?\d*)\s*acre/i);
              if (!m) return true; // can't determine — keep for now
              return parseFloat(m[1]) >= 2.0;
            })
          : rawDeals;

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
