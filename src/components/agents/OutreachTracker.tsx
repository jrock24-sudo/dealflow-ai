"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { Deal, OutreachEntry } from "@/types/deals";

const ENTRY_TYPES: { value: OutreachEntry["type"]; label: string; icon: string; color: string }[] = [
  { value: "call", label: "Call", icon: "📞", color: "#4CAF50" },
  { value: "email", label: "Email", icon: "✉️", color: "#2196F3" },
  { value: "text", label: "Text", icon: "💬", color: "#9C27B0" },
  { value: "note", label: "Note", icon: "📝", color: "#C8A23C" },
  { value: "follow_up", label: "Follow-up", icon: "🔔", color: "#FF9800" },
];

interface OutreachTrackerProps {
  deal: Deal;
  onClose: () => void;
  onAddOutreach: (dealId: string, entry: Omit<OutreachEntry, "id" | "createdAt">) => void;
}

export function OutreachTracker({ deal, onClose, onAddOutreach }: OutreachTrackerProps) {
  const [entryType, setEntryType] = useState<OutreachEntry["type"]>("call");
  const [content, setContent] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);

  const log = deal.outreachLog ?? [];

  const handleSubmit = () => {
    if (!content.trim()) return;
    setSaving(true);
    onAddOutreach(deal.id, {
      type: entryType,
      content: content.trim(),
      followUpDate: followUpDate || undefined,
    });
    setContent("");
    setFollowUpDate("");
    setSaving(false);
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
              Outreach Tracker
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#f0ece2", fontFamily: "'Playfair Display', serif" }}>
              {deal.owner?.name || "Unknown Owner"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{deal.address}</div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        <div style={s.body}>
          {/* Log Form */}
          <div style={s.section}>
            <div style={s.sectionTitle}>Log Activity</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {ENTRY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setEntryType(t.value)}
                  style={{
                    fontSize: 12,
                    fontWeight: entryType === t.value ? 700 : 400,
                    color: entryType === t.value ? t.color : "rgba(255,255,255,0.4)",
                    background: entryType === t.value ? `${t.color}15` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${entryType === t.value ? `${t.color}50` : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "all .2s",
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Notes about this interaction..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              style={s.textarea}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 4 }}>
                  Follow-up Date (optional)
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  style={s.dateInput}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || saving}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: content.trim() ? "#0a0a0a" : "rgba(255,255,255,0.2)",
                  background: content.trim() ? "#C8A23C" : "rgba(255,255,255,0.06)",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 20px",
                  cursor: content.trim() ? "pointer" : "default",
                  fontFamily: "'DM Sans', sans-serif",
                  alignSelf: "flex-end",
                  transition: "all .2s",
                }}
              >
                {saving ? "Saving..." : "Log Activity"}
              </button>
            </div>
          </div>

          {/* History */}
          <div style={s.section}>
            <div style={s.sectionTitle}>
              Activity Log
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: 8, fontWeight: 400 }}>
                {log.length} {log.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            {log.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 20px", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                No activity logged yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {log.map((entry) => {
                  const t = ENTRY_TYPES.find((et) => et.value === entry.type) || ENTRY_TYPES[0];
                  return (
                    <div key={entry.id} style={s.logEntry(t.color)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{t.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: t.color }}>{t.label}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: "#f0ece2", marginTop: 6, lineHeight: 1.5 }}>
                        {entry.content}
                      </div>
                      {entry.followUpDate && (
                        <div style={{ fontSize: 11, color: "#FF9800", marginTop: 6 }}>
                          🔔 Follow-up: {new Date(entry.followUpDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
    background: "rgba(0,0,0,0.8)",
    backdropFilter: "blur(8px)",
    zIndex: 1000,
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
    maxWidth: 680,
    maxHeight: "92vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  } as CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "22px 24px 18px",
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
    overflowY: "auto",
    flex: 1,
    padding: "18px 24px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  } as CSSProperties,
  section: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 16,
  } as CSSProperties,
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#f0ece2",
    marginBottom: 14,
    fontFamily: "'Playfair Display', serif",
  } as CSSProperties,
  textarea: {
    width: "100%",
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#f0ece2",
    fontSize: 13,
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
    minHeight: 80,
  } as CSSProperties,
  dateInput: {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    padding: "8px 10px",
    color: "#f0ece2",
    fontSize: 12,
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    colorScheme: "dark",
    width: "100%",
  } as CSSProperties,
  logEntry: (color: string): CSSProperties => ({
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${color}20`,
    borderLeft: `3px solid ${color}`,
    borderRadius: 8,
    padding: "10px 12px",
  }),
};
