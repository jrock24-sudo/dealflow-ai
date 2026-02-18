"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { Deal, PipelineStage, OutreachEntry } from "@/types/deals";
import { PIPELINE_STAGES } from "@/types/deals";
import { OutreachTracker } from "./OutreachTracker";

interface KanbanPipelineProps {
  pipeline: Deal[];
  onMoveStage: (dealId: string, stage: PipelineStage) => void;
  onRemove: (dealId: string) => void;
  onLookup: (deal: Deal) => void;
  onAddOutreach: (dealId: string, entry: Omit<OutreachEntry, "id" | "createdAt">) => void;
  onResearch?: (deal: Deal) => void;
}

export function KanbanPipeline({
  pipeline,
  onMoveStage,
  onRemove,
  onLookup,
  onAddOutreach,
  onResearch,
}: KanbanPipelineProps) {
  const [outreachDeal, setOutreachDeal] = useState<Deal | null>(null);

  const getDealsForStage = (stage: PipelineStage) =>
    pipeline.filter((d) => (d.pipelineStage ?? "new") === stage);

  const getNextStage = (current: PipelineStage): PipelineStage | null => {
    const idx = PIPELINE_STAGES.findIndex((s) => s.id === current);
    return idx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[idx + 1].id : null;
  };

  const getPrevStage = (current: PipelineStage): PipelineStage | null => {
    const idx = PIPELINE_STAGES.findIndex((s) => s.id === current);
    return idx > 0 ? PIPELINE_STAGES[idx - 1].id : null;
  };

  return (
    <div style={s.wrapper}>
      {outreachDeal && (
        <OutreachTracker
          deal={outreachDeal}
          onClose={() => setOutreachDeal(null)}
          onAddOutreach={(dealId, entry) => {
            onAddOutreach(dealId, entry);
            // Refresh the deal reference in state
            setOutreachDeal((prev) =>
              prev
                ? {
                    ...prev,
                    outreachLog: [
                      {
                        ...entry,
                        id: `tmp_${Date.now()}`,
                        createdAt: new Date().toISOString(),
                      },
                      ...(prev.outreachLog ?? []),
                    ],
                  }
                : null
            );
          }}
        />
      )}

      <div style={s.header}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f0ece2", fontFamily: "'Playfair Display', serif" }}>
          Deal Pipeline
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          {pipeline.length} deal{pipeline.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div style={s.board}>
        {PIPELINE_STAGES.map((stage) => {
          const deals = getDealsForStage(stage.id);
          return (
            <div key={stage.id} style={s.column}>
              {/* Column Header */}
              <div style={s.colHeader(stage.color)}>
                <span style={{ fontSize: 14 }}>{stage.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.label}</span>
                <span style={s.colBadge(stage.color)}>{deals.length}</span>
              </div>

              {/* Cards */}
              <div style={s.colBody}>
                {deals.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 10px", color: "rgba(255,255,255,0.15)", fontSize: 12 }}>
                    Drop deals here
                  </div>
                ) : (
                  deals.map((deal) => {
                    const current = deal.pipelineStage ?? "new";
                    const next = getNextStage(current);
                    const prev = getPrevStage(current);
                    const logCount = deal.outreachLog?.length ?? 0;

                    return (
                      <div key={deal.id} style={s.kanbanCard}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#f0ece2", marginBottom: 4, lineHeight: 1.3 }}>
                          {deal.address}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8, lineHeight: 1.4 }}>
                          {deal.details?.slice(0, 80)}{(deal.details?.length ?? 0) > 80 ? "..." : ""}
                        </div>
                        {deal.owner?.name && (
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                            {deal.owner.name}
                          </div>
                        )}
                        {deal.savedAt && (
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>
                            Added {new Date(deal.savedAt).toLocaleDateString()}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button
                            onClick={() => setOutreachDeal(deal)}
                            style={s.actionBtn("#C8A23C")}
                          >
                            📋 Log{logCount > 0 ? ` (${logCount})` : ""}
                          </button>
                          {onResearch && (
                            <button
                              onClick={() => onResearch(deal)}
                              style={s.actionBtn("#7B9ECC")}
                              title="Research this deal"
                            >
                              🔬
                            </button>
                          )}
                          <button
                            onClick={() => onLookup(deal)}
                            style={s.actionBtn("rgba(255,255,255,0.4)")}
                          >
                            🔎
                          </button>
                          <button
                            onClick={() => onRemove(deal.id)}
                            style={s.actionBtn("#E74C3C")}
                            title="Remove from pipeline"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Stage movement */}
                        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                          {prev && (
                            <button
                              onClick={() => onMoveStage(deal.id, prev)}
                              style={s.stageBtn}
                              title={`Move back to ${PIPELINE_STAGES.find((s) => s.id === prev)?.label}`}
                            >
                              ← Back
                            </button>
                          )}
                          {next && (
                            <button
                              onClick={() => onMoveStage(deal.id, next)}
                              style={{ ...s.stageBtn, background: `${stage.color}15`, borderColor: `${stage.color}40`, color: stage.color }}
                              title={`Advance to ${PIPELINE_STAGES.find((s) => s.id === next)?.label}`}
                            >
                              {PIPELINE_STAGES.find((s) => s.id === next)?.label} →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  wrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  } as CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  } as CSSProperties,
  board: {
    flex: 1,
    display: "flex",
    gap: 10,
    overflowX: "auto",
    overflowY: "hidden",
    padding: "16px 16px 20px",
  } as CSSProperties,
  column: {
    flex: "0 0 240px",
    display: "flex",
    flexDirection: "column",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 12,
    overflow: "hidden",
  } as CSSProperties,
  colHeader: (color: string): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 12px",
    borderBottom: `1px solid ${color}20`,
    background: `${color}08`,
  }),
  colBadge: (color: string): CSSProperties => ({
    fontSize: 10,
    fontWeight: 700,
    color,
    background: `${color}20`,
    borderRadius: 10,
    padding: "2px 7px",
    marginLeft: "auto",
  }),
  colBody: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  } as CSSProperties,
  kanbanCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 10,
    padding: "12px 10px",
  } as CSSProperties,
  actionBtn: (color: string): CSSProperties => ({
    fontSize: 10,
    fontWeight: 600,
    color,
    background: `${color}10`,
    border: `1px solid ${color}30`,
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all .2s",
  }),
  stageBtn: {
    flex: 1,
    fontSize: 10,
    fontWeight: 600,
    color: "rgba(255,255,255,0.35)",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    padding: "5px 8px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all .2s",
    textAlign: "center" as const,
  } as CSSProperties,
};
