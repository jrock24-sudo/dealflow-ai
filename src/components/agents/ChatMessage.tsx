"use client";

import type { CSSProperties } from "react";
import type { Deal } from "@/types/deals";
import { parseMessageSegments } from "@/lib/parseDealBlocks";
import { DealCard } from "./DealCard";

interface ChatMessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  agentColor: string;
  isMobile?: boolean;
  onLookup: (deal: Deal) => void;
  onSaveToPipeline?: (deal: Deal) => void;
  isPipelined?: (deal: Deal) => boolean;
  onResearch?: (deal: Deal) => void;
}

export function ChatMessageBubble({
  role,
  content,
  agentColor,
  isMobile = false,
  onLookup,
  onSaveToPipeline,
  isPipelined,
  onResearch,
}: ChatMessageBubbleProps) {
  if (role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <div style={{
          maxWidth: isMobile ? "90%" : "75%",
          padding: "12px 16px",
          borderRadius: "16px 16px 4px 16px",
          background: agentColor,
          color: "#0a0a0a",
          fontSize: 13,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {content}
        </div>
      </div>
    );
  }

  // Parse assistant message for embedded deal blocks
  const segments = parseMessageSegments(content);
  const hasDealCards = segments.some((seg) => seg.type === "deal");

  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
      <div style={{ maxWidth: isMobile ? "95%" : "85%", width: hasDealCards ? "100%" : undefined }}>
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            const trimmed = seg.content.trim();
            if (!trimmed) return null;
            return (
              <div key={i} style={s.textBubble}>
                {trimmed}
              </div>
            );
          }

          // Deal card segment
          const deal = seg.deal;
          const saved = isPipelined ? isPipelined(deal) : false;
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              <DealCard
                deal={deal}
                onLookup={onLookup}
                onSaveToPipeline={onSaveToPipeline}
                isSaved={saved}
                onResearch={onResearch}
                color={agentColor}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  textBubble: {
    padding: "12px 16px",
    borderRadius: "16px 16px 16px 4px",
    background: "rgba(255,255,255,0.05)",
    color: "#f0ece2",
    fontSize: 13,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: 6,
  },
};
