export interface Owner {
  name: string;
  address?: string;
  apn?: string;
  ownerType?: string;
  yearsOwned?: string;
  city?: string;
}

export interface Financial {
  label: string;
  value: string;
  highlight?: boolean;
}

export type PipelineStage = "new" | "researching" | "contacted" | "loi_sent" | "closed";

export interface OutreachEntry {
  id: string;
  type: "call" | "email" | "text" | "note" | "follow_up";
  content: string;
  followUpDate?: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  address: string;
  details: string;
  status: "strong" | "marginal" | "rejected";
  statusLabel: string;
  isQCT?: boolean;
  isOZ?: boolean;
  source?: string;
  listingUrl?: string;
  riskScore?: "Low" | "Medium" | "High";
  feasibilityScore?: number;
  dealSignals?: string[];
  owner: Owner;
  financials?: Financial[];
  // Metadata
  foundAt?: string;
  savedAt?: string;
  agentId?: string;
  // Pipeline
  pipelineStage?: PipelineStage;
  outreachLog?: OutreachEntry[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Market {
  id: string;
  name: string;
  county: string;
  state: string;
  stateAbbr: string;
}

export const PIPELINE_STAGES: { id: PipelineStage; label: string; color: string; icon: string }[] = [
  { id: "new",         label: "New Leads",   color: "#888",    icon: "🆕" },
  { id: "researching", label: "Researching", color: "#C8A23C", icon: "🔍" },
  { id: "contacted",   label: "Contacted",   color: "#2196F3", icon: "📞" },
  { id: "loi_sent",    label: "LOI Sent",    color: "#9C27B0", icon: "📄" },
  { id: "closed",      label: "Closed",      color: "#4A9C6D", icon: "✅" },
];
