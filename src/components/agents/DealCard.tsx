"use client";

import type { CSSProperties } from "react";
import type { Deal } from "@/types/deals";

const STATUS_COLOR: Record<string, string> = {
  strong: "#4A9C6D",
  marginal: "#C8A23C",
  rejected: "#E74C3C",
};
const STATUS_ICON: Record<string, string> = {
  strong: "✅",
  marginal: "⚠️",
  rejected: "❌",
};

const AGENT_COLOR: Record<string, string> = {
  land_acquisition: "#C8A23C",
  fix_and_flip: "#4A9C6D",
};

interface DealCardProps {
  deal: Deal;
  onLookup: (deal: Deal) => void;
  color?: string;
  compact?: boolean;
  onSaveToPipeline?: (deal: Deal) => void;
  isSaved?: boolean;
  onResearch?: (deal: Deal) => void;
  onAiLookup?: (query: string) => void;
}

export function DealCard({
  deal,
  onLookup,
  color,
  compact = false,
  onSaveToPipeline,
  isSaved = false,
  onResearch,
  onAiLookup,
}: DealCardProps) {
  const resolvedColor = color ?? AGENT_COLOR[deal.agentId ?? "land_acquisition"] ?? "#C8A23C";
  const c = STATUS_COLOR[deal.status] || "#888";

  return (
    <div style={{ ...dealCardStyle, borderLeft: `3px solid ${c}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f0ece2" }}>{deal.address}</div>
            {deal.isQCT && (
              <span style={badge("QCT", "#C8A23C")}>QCT</span>
            )}
            {deal.isOZ && (
              <span style={badge("OZ", "#4A9C6D")}>OZ</span>
            )}
            {deal.riskScore && (
              <span style={badge("risk", deal.riskScore === "Low" ? "#4A9C6D" : deal.riskScore === "High" ? "#E74C3C" : "#C8A23C")}>
                {deal.riskScore} Risk
              </span>
            )}
            {deal.isQCT === false && deal.agentId === "land_acquisition" && (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", borderRadius: 4, padding: "2px 6px" }}>Not in QCT</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4, lineHeight: 1.5 }}>{deal.details}</div>
          {deal.source && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
              via{" "}
              {deal.listingUrl ? (
                <a href={deal.listingUrl} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "underline", textDecorationStyle: "dotted" }}>
                  {deal.source}
                </a>
              ) : (
                deal.source
              )}
              {deal.foundAt ? ` · ${new Date(deal.foundAt).toLocaleDateString()}` : ""}
            </div>
          )}
          {deal.owner?.name && (
            <div style={{ fontSize: 12, marginTop: 6 }}>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>Owner: </span>
              <span style={{ color: resolvedColor, fontWeight: 600 }}>{deal.owner.name}</span>
              {deal.owner.ownerType && (
                <span style={{ color: "rgba(255,255,255,0.25)", marginLeft: 6 }}>({deal.owner.ownerType})</span>
              )}
            </div>
          )}
          {deal.dealSignals && deal.dealSignals.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {deal.dealSignals.map((sig, i) => (
                <span key={i} style={{ fontSize: 10, color: resolvedColor, background: `${resolvedColor}10`, border: `1px solid ${resolvedColor}30`, borderRadius: 4, padding: "2px 6px" }}>
                  {sig}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c, background: `${c}15`, padding: "4px 10px", borderRadius: 6 }}>
            {STATUS_ICON[deal.status]} {deal.statusLabel}
          </div>
          {deal.feasibilityScore !== undefined && (
            <div style={{ fontSize: 11, color: resolvedColor, fontWeight: 700 }}>
              Score: {deal.feasibilityScore}/10
            </div>
          )}
          <button
            onClick={() => onLookup(deal)}
            style={actionBtnStyle("#C8A23C")}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,162,60,0.15)"; e.currentTarget.style.borderColor = "#C8A23C"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
          >
            🔎 Lookup Owner
          </button>
          {onResearch && (
            <button
              onClick={() => onResearch(deal)}
              style={actionBtnStyle("#7B9ECC")}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(123,158,204,0.15)"; e.currentTarget.style.borderColor = "#7B9ECC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
            >
              🔬 Research
            </button>
          )}
          {onSaveToPipeline && (
            <button
              onClick={() => !isSaved && onSaveToPipeline(deal)}
              disabled={isSaved}
              style={{
                ...actionBtnStyle(isSaved ? "#4A9C6D" : resolvedColor),
                opacity: isSaved ? 0.7 : 1,
                cursor: isSaved ? "default" : "pointer",
              }}
              onMouseEnter={(e) => { if (!isSaved) { e.currentTarget.style.background = `${resolvedColor}15`; e.currentTarget.style.borderColor = resolvedColor; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
            >
              {isSaved ? "✓ In Pipeline" : "＋ Save to Pipeline"}
            </button>
          )}
          {deal.listingUrl && (
            <a
              href={deal.listingUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#4A9C6D",
                background: "rgba(74,156,109,0.1)",
                border: "1px solid rgba(74,156,109,0.3)",
                borderRadius: 8,
                padding: "7px 12px",
                textDecoration: "none",
                whiteSpace: "nowrap",
                display: "inline-block",
                transition: "all .2s",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              ↗ View Listing
            </a>
          )}
        </div>
      </div>

      {!compact && deal.financials && deal.financials.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, marginTop: 14 }}>
          {deal.financials.map((f, i) => (
            <div key={i} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1 }}>{f.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: f.highlight ? c : "#f0ece2", marginTop: 3 }}>{f.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* AI-powered property research buttons */}
      {!compact && onAiLookup && (
        <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            🤖 AI Property Research — click to search &amp; pull data
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              { label: "Zillow", icon: "🏠", q: `Search Zillow for "${deal.address}". Find the listing and report: list price, Zestimate, days on market, price history, property details (sqft, beds, baths, year built), and any photos or condition notes. Include the URL.` },
              { label: "Crexi", icon: "🏢", q: `Search Crexi.com for a listing at or near "${deal.address}". Report: asking price, price per acre/sqft, days on market, property type, zoning, and listing URL.` },
              { label: "LoopNet", icon: "📊", q: `Search LoopNet.com for the property at "${deal.address}". Report: listing price, property details, days on market, cap rate if available, and listing URL.` },
              { label: "County Records", icon: "🏛️", q: `Search Clark County Assessor records for "${deal.address}". Report: APN, assessed value, owner name, tax status, lot size, zoning, and any tax delinquency.` },
              { label: "Tax Records", icon: "📋", q: `Search public tax records for "${deal.address}" in Clark County Nevada. Report: annual taxes, assessed value, tax delinquency status, owner of record, and parcel number (APN).` },
              { label: "Comps", icon: "📈", q: `Find comparable sales within 0.5–1 mile of "${deal.address}" sold in the last 12 months. Report: address, sale price, sqft, price/sqft, and days on market for each comp. Calculate average price/sqft.` },
            ].map(({ label, icon, q }) => (
              <button
                key={label}
                onClick={() => onAiLookup(q)}
                style={{ fontSize: 10, fontWeight: 600, color: resolvedColor, background: `${resolvedColor}0d`, border: `1px solid ${resolvedColor}30`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all .15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${resolvedColor}20`; e.currentTarget.style.borderColor = resolvedColor; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = `${resolvedColor}0d`; e.currentTarget.style.borderColor = `${resolvedColor}30`; }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const dealCardStyle: CSSProperties = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  padding: 16,
  marginBottom: 10,
};

const badge = (_type: string, color: string): CSSProperties => ({
  fontSize: 10,
  fontWeight: 700,
  color,
  background: `${color}12`,
  border: `1px solid ${color}30`,
  borderRadius: 4,
  padding: "2px 6px",
});

const actionBtnStyle = (color: string): CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  color,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "7px 12px",
  cursor: "pointer",
  transition: "all .2s",
  whiteSpace: "nowrap",
  fontFamily: "'DM Sans', sans-serif",
});
