"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import * as XLSX from "xlsx";
import type { Deal } from "@/types/deals";
import { DealCard } from "./DealCard";

interface LeadsQueueProps {
  deals: Deal[];
  onLookup: (deal: Deal) => void;
  onClear: () => void;
  onSaveToPipeline: (deal: Deal) => void;
  isPipelined: (deal: Deal) => boolean;
  onRemove: (dealId: string) => void;
  onResearch?: (deal: Deal) => void;
}

export function LeadsQueue({
  deals,
  onLookup,
  onClear,
  onSaveToPipeline,
  isPipelined,
  onRemove,
  onResearch,
}: LeadsQueueProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "strong" | "marginal" | "rejected">("all");
  const [agentFilter, setAgentFilter] = useState<"all" | "land_acquisition" | "fix_and_flip">("all");

  const filtered = deals.filter((d) => {
    const matchSearch =
      !search ||
      d.address.toLowerCase().includes(search.toLowerCase()) ||
      d.owner?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.details?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchAgent = agentFilter === "all" || d.agentId === agentFilter;
    return matchSearch && matchStatus && matchAgent;
  });

  const downloadExcel = () => {
    if (!deals.length) return;
    const headers = [
      "Date Found", "Agent", "Address", "Details", "Status", "QCT", "OZ",
      "Risk Score", "Feasibility", "Source", "Owner Name", "Owner Type",
      "APN", "Asking/List", "Profit/Land%", "ARV/Per Acre", "Listing URL",
    ];
    const rows = deals.map((d) => {
      const fin = (label: string) =>
        d.financials?.find((f) => f.label.toLowerCase().includes(label.toLowerCase()))?.value || "";
      return [
        d.foundAt ? new Date(d.foundAt).toLocaleString() : "",
        d.agentId === "land_acquisition" ? "Land Acquisition" : "Fix & Flip",
        d.address,
        d.details,
        d.statusLabel,
        d.isQCT ? "Yes" : d.isQCT === false ? "No" : "",
        d.isOZ ? "Yes" : d.isOZ === false ? "No" : "",
        d.riskScore || "",
        d.feasibilityScore !== undefined ? `${d.feasibilityScore}/10` : "",
        d.source || "",
        d.owner?.name || "",
        d.owner?.ownerType || "",
        d.owner?.apn || "",
        fin("asking") || fin("list"),
        fin("profit") || fin("land %"),
        fin("arv") || fin("per acre"),
        d.listingUrl || "",
      ];
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, "DealFlow Leads");
    XLSX.writeFile(wb, `dealflow-leads-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const strongCount = deals.filter((d) => d.status === "strong").length;
  const inPipelineCount = deals.filter((d) => isPipelined(d)).length;

  return (
    <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f0ece2", fontFamily: "'Playfair Display', serif" }}>
            Leads Queue
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {deals.length} deal{deals.length !== 1 ? "s" : ""}
            {strongCount > 0 && <span style={{ color: "#4A9C6D", marginLeft: 8 }}>· {strongCount} strong</span>}
            {inPipelineCount > 0 && <span style={{ color: "#C8A23C", marginLeft: 8 }}>· {inPipelineCount} in pipeline</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={downloadExcel}
            disabled={!deals.length}
            style={s.headerBtn(deals.length > 0, "#4A9C6D")}
          >
            ⬇ Excel
          </button>
          {deals.length > 0 && (
            <button onClick={onClear} style={s.headerBtn(true, "rgba(255,255,255,0.35)")}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search address, owner, details..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={s.searchInput}
        />
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "strong", "marginal", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={s.filterBtn(statusFilter === f)}
            >
              {f === "all" ? "All" : f === "strong" ? "✅" : f === "marginal" ? "⚠️" : "❌"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setAgentFilter("all")} style={s.filterBtn(agentFilter === "all")}>All</button>
          <button onClick={() => setAgentFilter("land_acquisition")} style={s.filterBtn(agentFilter === "land_acquisition")}>🏗️</button>
          <button onClick={() => setAgentFilter("fix_and_flip")} style={s.filterBtn(agentFilter === "fix_and_flip")}>🏠</button>
        </div>
      </div>

      {/* Deals */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.25)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>
            {deals.length === 0 ? "🔍" : "🚫"}
          </div>
          <div style={{ fontSize: 14 }}>
            {deals.length === 0
              ? 'No leads yet. Enable auto-scan or click "Run Now" on an agent.'
              : "No deals match your filters."}
          </div>
        </div>
      ) : (
        filtered.map((d) => (
          <div key={d.id} style={{ position: "relative" }}>
            <DealCard
              deal={d}
              onLookup={onLookup}
              onSaveToPipeline={onSaveToPipeline}
              isSaved={isPipelined(d)}
              onResearch={onResearch}
            />
            <button
              onClick={() => onRemove(d.id)}
              title="Remove from queue"
              style={s.removeBtn}
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
}

const s = {
  headerBtn: (enabled: boolean, color: string): CSSProperties => ({
    fontSize: 12,
    fontWeight: 600,
    color: enabled ? color : "rgba(255,255,255,0.2)",
    background: enabled ? `${color}18` : "rgba(255,255,255,0.03)",
    border: `1px solid ${enabled ? `${color}40` : "rgba(255,255,255,0.08)"}`,
    borderRadius: 8,
    padding: "8px 14px",
    cursor: enabled ? "pointer" : "default",
    fontFamily: "'DM Sans', sans-serif",
  }),
  searchInput: {
    flex: 1,
    minWidth: 180,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#f0ece2",
    fontSize: 12,
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
  } as CSSProperties,
  filterBtn: (active: boolean): CSSProperties => ({
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    color: active ? "#f0ece2" : "rgba(255,255,255,0.35)",
    background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`,
    borderRadius: 6,
    padding: "6px 10px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  }),
  removeBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    fontSize: 10,
    color: "rgba(255,255,255,0.2)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "2px 4px",
    borderRadius: 4,
    transition: "color .2s",
  } as CSSProperties,
};
