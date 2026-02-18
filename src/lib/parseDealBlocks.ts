import type { Deal } from "@/types/deals";

export type MessageSegment =
  | { type: "text"; content: string }
  | { type: "deal"; deal: Deal };

const OPEN = "<<<DEAL>>>";
const CLOSE = "<<<END_DEAL>>>";

const genId = () =>
  `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function parseMessageSegments(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    const openIdx = remaining.indexOf(OPEN);
    if (openIdx === -1) {
      if (remaining.trim()) segments.push({ type: "text", content: remaining });
      break;
    }

    // Text before the block
    const before = remaining.slice(0, openIdx);
    if (before.trim()) segments.push({ type: "text", content: before });

    const afterOpen = remaining.slice(openIdx + OPEN.length);
    const closeIdx = afterOpen.indexOf(CLOSE);

    if (closeIdx === -1) {
      // No closing tag — treat rest as text
      if (remaining.slice(openIdx).trim())
        segments.push({ type: "text", content: remaining.slice(openIdx) });
      break;
    }

    const jsonStr = afterOpen.slice(0, closeIdx).trim();
    try {
      const deal = JSON.parse(jsonStr) as Partial<Deal>;
      segments.push({
        type: "deal",
        deal: {
          id: genId(),
          status: "strong",
          statusLabel: "Deal",
          owner: { name: "Unknown" },
          ...deal,
        } as Deal,
      });
    } catch {
      // Invalid JSON — render as text so nothing is lost
      segments.push({ type: "text", content: OPEN + jsonStr + CLOSE });
    }

    remaining = afterOpen.slice(closeIdx + CLOSE.length);
  }

  return segments;
}
