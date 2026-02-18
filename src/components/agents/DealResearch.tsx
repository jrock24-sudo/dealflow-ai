"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import type { Deal } from "@/types/deals";
import { parseMessageSegments } from "@/lib/parseDealBlocks";
import { DealCard } from "./DealCard";

interface ResearchMessage {
  role: "user" | "assistant";
  content: string;
}

interface DealResearchProps {
  deal: Deal;
  agentColor: string;
  agentName: string;
  market: string;
  onClose: () => void;
  onSaveToPipeline: (deal: Deal) => void;
  isPipelined: (deal: Deal) => boolean;
}

const RESEARCH_PROMPTS = [
  "Find owner contact info (phone/email) from public records",
  "Check if this parcel is in a QCT or Opportunity Zone",
  "Find comparable sales near this property in the last 12 months",
  "Research any liens, code violations, or distress signals",
  "What's the development potential and current zoning?",
  "Search for the owner's other properties",
];

export function DealResearch({
  deal,
  agentColor,
  agentName,
  market,
  onClose,
  onSaveToPipeline,
  isPipelined,
}: DealResearchProps) {
  const [messages, setMessages] = useState<ResearchMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const dealContext = JSON.stringify({
    address: deal.address,
    details: deal.details,
    status: deal.statusLabel,
    isQCT: deal.isQCT,
    isOZ: deal.isOZ,
    source: deal.source,
    owner: deal.owner,
    financials: deal.financials,
    dealSignals: deal.dealSignals,
  }, null, 2);

  const systemPrompt = `You are a real estate research specialist. You are researching a specific property for a deal analyst.

PROPERTY UNDER RESEARCH:
${dealContext}

MARKET: ${market}

YOUR JOB:
Use web_search to research this specific property and answer the user's questions. Focus on:
1. Owner identity and contact information — search county assessor, TruePeopleSearch, public records for the address
2. QCT/Opportunity Zone status — search "[address] opportunity zone" and HUD maps
3. Comparable sales — search recent sold listings near this address
4. Zoning and development rights — search county zoning maps
5. Any liens, foreclosures, code violations, or distress — search public records
6. Owner's other holdings — search county assessor by owner name

DATA INTEGRITY:
- Only report what you actually find via web search
- If you find a field (owner name, phone, APN) — state the source clearly
- Mark anything estimated/calculated as "Est."
- If you cannot find something, say exactly what you searched and what turned up

If you discover additional similar properties while researching, you may present them as:
<<<DEAL>>>
{ ...deal JSON... }
<<<END_DEAL>>>

Be thorough, specific, and cite your sources.`;

  const send = useCallback(async (queryOverride?: string) => {
    const msg = (queryOverride ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [
            ...messages.filter((m) => m.role === "user" || m.role === "assistant"),
            { role: "user", content: msg },
          ],
        }),
      });
      if (r.status === 429) {
        setMessages((prev) => [...prev, { role: "assistant", content: "⏳ Rate limited — the AI is busy. Wait 30–60 seconds and try again." }]);
        setLoading(false);
        return;
      }
      const d = await r.json();
      if (d.error?.type === "rate_limit_error" || d.type === "error") {
        setMessages((prev) => [...prev, { role: "assistant", content: `⏳ ${d.error?.message || "Rate limited. Wait a moment and retry."}` }]);
        setLoading(false);
        return;
      }
      const text = (d.content as Array<{ type: string; text?: string }>)
        ?.map((i) => (i.type === "text" ? i.text : ""))
        .filter(Boolean)
        .join("\n");
      setMessages((prev) => [...prev, { role: "assistant", content: text || "No response. Try rephrasing." }]);
    } catch (e) {
      const err = e as Error;
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ Error: ${err.message}` }]);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, messages, systemPrompt]);

  // No auto-run — user clicks to start (avoids 429 rate limit errors)

  const statusColor: Record<string, string> = { strong: "#4A9C6D", marginal: "#C8A23C", rejected: "#E74C3C" };
  const sc = statusColor[deal.status] || "#888";

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
              {agentName} · Deal Research
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f0ece2", fontFamily: "'Playfair Display', serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {deal.address}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: `${sc}15`, padding: "2px 8px", borderRadius: 4 }}>
                {deal.statusLabel}
              </span>
              {deal.isQCT && <span style={{ fontSize: 10, color: "#C8A23C", background: "rgba(200,162,60,0.12)", border: "1px solid rgba(200,162,60,0.3)", borderRadius: 4, padding: "1px 6px" }}>QCT</span>}
              {deal.isOZ && <span style={{ fontSize: 10, color: "#4A9C6D", background: "rgba(74,156,109,0.12)", border: "1px solid rgba(74,156,109,0.3)", borderRadius: 4, padding: "1px 6px" }}>OZ</span>}
              {deal.source && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>via {deal.source}</span>}
            </div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        <div style={s.body}>
          {/* Deal summary strip */}
          {deal.financials && deal.financials.length > 0 && (
            <div style={s.finRow}>
              {deal.financials.map((f, i) => (
                <div key={i} style={s.finCell(f.highlight ? sc : undefined)}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1 }}>{f.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{f.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Start Research CTA or quick buttons */}
          {messages.length === 0 ? (
            <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <button
                onClick={() => send("Research this property thoroughly. Search for: 1) verify the address and current status, 2) owner name and contact info from public records/county assessor, 3) QCT and Opportunity Zone status, 4) any distress signals (liens, foreclosure, long ownership), 5) comparable sales. Report everything you find with sources.")}
                disabled={loading}
                style={{ fontSize: 14, fontWeight: 700, color: "#0a0a0a", background: agentColor, border: "none", borderRadius: 10, padding: "12px 28px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "opacity .2s" }}
              >
                🔬 Start Full Research
              </button>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                Or ask a specific question below
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {RESEARCH_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => send(p)} disabled={loading} style={s.quickBtn(agentColor)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : messages.length <= 3 ? (
            <div style={{ padding: "12px 16px 0", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {RESEARCH_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => send(p)} disabled={loading} style={s.quickBtn(agentColor)}>
                  {p}
                </button>
              ))}
            </div>
          ) : null}

          {/* Chat */}
          <div style={s.chatArea}>
            {messages.map((m, i) => {
              if (m.role === "user") {
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: "14px 14px 4px 14px", background: agentColor, color: "#0a0a0a", fontSize: 13, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
                      {m.content}
                    </div>
                  </div>
                );
              }

              const segments = parseMessageSegments(m.content);
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  {segments.map((seg, si) => {
                    if (seg.type === "text") {
                      const trimmed = seg.content.trim();
                      if (!trimmed) return null;
                      return (
                        <div key={si} style={s.assistantBubble}>{trimmed}</div>
                      );
                    }
                    return (
                      <div key={si} style={{ marginBottom: 8 }}>
                        <DealCard
                          deal={seg.deal}
                          onLookup={() => {}}
                          onSaveToPipeline={onSaveToPipeline}
                          isSaved={isPipelined(seg.deal)}
                          color={agentColor}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {loading && (
              <div style={{ display: "flex", gap: 5, padding: "10px 0" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: agentColor, animation: "pulse 1.4s infinite", animationDelay: `${i * 0.2}s`, opacity: 0.4 }} />
                ))}
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          {/* Input */}
          <div style={s.inputArea}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about this property... (owner info, comps, zoning, liens)"
                style={s.input}
                autoFocus
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                style={{ width: 44, height: 44, borderRadius: 10, border: "none", fontSize: 18, fontWeight: 700, cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s", background: input.trim() ? agentColor : "rgba(255,255,255,0.06)", color: input.trim() ? "#0a0a0a" : "rgba(255,255,255,0.2)" }}>
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(10px)",
    zIndex: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  } as CSSProperties,
  panel: {
    background: "#141414",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18,
    width: "100%",
    maxWidth: 780,
    maxHeight: "94vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  } as CSSProperties,
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "20px 22px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  } as CSSProperties,
  closeBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.35)",
    fontSize: 16,
    cursor: "pointer",
    padding: "4px 6px",
    flexShrink: 0,
  } as CSSProperties,
  body: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  } as CSSProperties,
  finRow: {
    display: "flex",
    gap: 1,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.2)",
    flexWrap: "wrap",
  } as CSSProperties,
  finCell: (highlight?: string): CSSProperties => ({
    flex: "1 0 80px",
    padding: "10px 16px",
    color: highlight || "#f0ece2",
  }),
  quickBtn: (_color: string): CSSProperties => ({
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    padding: "6px 10px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all .2s",
    textAlign: "left",
    lineHeight: 1.3,
  }),
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
  } as CSSProperties,
  assistantBubble: {
    padding: "10px 14px",
    borderRadius: "14px 14px 14px 4px",
    background: "rgba(255,255,255,0.04)",
    color: "#f0ece2",
    fontSize: 13,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: 6,
  } as CSSProperties,
  inputArea: {
    padding: "12px 16px 16px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.3)",
  } as CSSProperties,
  input: {
    flex: 1,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "11px 14px",
    color: "#f0ece2",
    fontSize: 13,
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    minWidth: 0,
    width: "100%",
  } as CSSProperties,
};
