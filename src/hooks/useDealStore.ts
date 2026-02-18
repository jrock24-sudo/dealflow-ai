"use client";
import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { Deal, ChatMessage, OutreachEntry, PipelineStage } from "@/types/deals";

const genId = () =>
  `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const ensureId = (deal: Deal): Deal =>
  deal.id ? deal : { ...deal, id: genId() };

const MAX_CHAT_MESSAGES = 100;
const MAX_QUERIES = 30;
const MAX_SESSIONS = 20;

export interface QueryEntry {
  id: string;
  query: string;
  agentId: string;
  market: string;
  timestamp: string;
}

export interface SavedSession {
  id: string;
  title: string;        // auto-generated from first user message
  agentId: string;
  market: string;
  timestamp: string;
  messages: ChatMessage[];
}

export function useDealStore() {
  const [chatHistory, setChatHistory] = useLocalStorage<Record<string, ChatMessage[]>>(
    "dealflow_chat_v1",
    {}
  );
  const [leadsQueue, setLeadsQueue] = useLocalStorage<Deal[]>("dealflow_leads_v1", []);
  const [pipeline, setPipeline] = useLocalStorage<Deal[]>("dealflow_pipeline_v1", []);
  const [geocache, setGeocache] = useLocalStorage<Record<string, { lat: number; lng: number } | null>>(
    "dealflow_geocache_v1",
    {}
  );
  const [queryHistory, setQueryHistory] = useLocalStorage<QueryEntry[]>(
    "dealflow_queries_v1",
    []
  );
  const [savedSessions, setSavedSessions] = useLocalStorage<SavedSession[]>(
    "dealflow_sessions_v1",
    []
  );

  // ---- Chat ----
  const getChatForAgent = useCallback(
    (agentId: string): ChatMessage[] => chatHistory[agentId] ?? [],
    [chatHistory]
  );

  const setChatForAgent = useCallback(
    (agentId: string, messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setChatHistory((prev) => {
        const current = prev[agentId] ?? [];
        const next =
          typeof messages === "function" ? messages(current) : messages;
        // Cap to prevent unbounded growth
        const capped = next.length > MAX_CHAT_MESSAGES ? next.slice(-80) : next;
        return { ...prev, [agentId]: capped };
      });
    },
    [setChatHistory]
  );

  const clearChatForAgent = useCallback(
    (agentId: string) => {
      setChatHistory((prev) => ({ ...prev, [agentId]: [] }));
    },
    [setChatHistory]
  );

  // ---- Leads Queue ----
  const addToLeadsQueue = useCallback(
    (deals: Deal[]) => {
      setLeadsQueue((prev) => {
        const existing = new Set(prev.map((d) => d.address.toLowerCase()));
        const fresh = deals
          .filter((d) => !existing.has(d.address.toLowerCase()))
          .map(ensureId);
        return [...fresh, ...prev];
      });
    },
    [setLeadsQueue]
  );

  const removeFromLeads = useCallback(
    (dealId: string) => setLeadsQueue((prev) => prev.filter((d) => d.id !== dealId)),
    [setLeadsQueue]
  );

  // ---- Pipeline ----
  const saveToPipeline = useCallback(
    (deal: Deal) => {
      const withId = ensureId(deal);
      setPipeline((prev) => {
        if (prev.some((d) => d.id === withId.id || d.address.toLowerCase() === withId.address.toLowerCase()))
          return prev;
        return [
          { ...withId, pipelineStage: "new", savedAt: new Date().toISOString(), outreachLog: [] },
          ...prev,
        ];
      });
    },
    [setPipeline]
  );

  const movePipelineStage = useCallback(
    (dealId: string, stage: PipelineStage) => {
      setPipeline((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, pipelineStage: stage } : d))
      );
    },
    [setPipeline]
  );

  const addOutreach = useCallback(
    (dealId: string, entry: Omit<OutreachEntry, "id" | "createdAt">) => {
      setPipeline((prev) =>
        prev.map((d) => {
          if (d.id !== dealId) return d;
          const newEntry: OutreachEntry = {
            ...entry,
            id: genId(),
            createdAt: new Date().toISOString(),
          };
          return { ...d, outreachLog: [newEntry, ...(d.outreachLog ?? [])] };
        })
      );
    },
    [setPipeline]
  );

  const removeFromPipeline = useCallback(
    (dealId: string) => setPipeline((prev) => prev.filter((d) => d.id !== dealId)),
    [setPipeline]
  );

  // ---- Query History ----
  const addQuery = useCallback(
    (agentId: string, market: string, query: string) => {
      setQueryHistory((prev) => {
        const entry: QueryEntry = {
          id: genId(),
          query,
          agentId,
          market,
          timestamp: new Date().toISOString(),
        };
        // Dedupe exact same query for same agent, keep newest first, cap total
        const filtered = prev.filter(
          (e) => !(e.query === query && e.agentId === agentId)
        );
        return [entry, ...filtered].slice(0, MAX_QUERIES);
      });
    },
    [setQueryHistory]
  );

  const getQueriesForAgent = useCallback(
    (agentId: string): QueryEntry[] =>
      queryHistory.filter((e) => e.agentId === agentId),
    [queryHistory]
  );

  const clearQueryHistory = useCallback(
    (agentId: string) => {
      setQueryHistory((prev) => prev.filter((e) => e.agentId !== agentId));
    },
    [setQueryHistory]
  );

  // ---- Sessions (saved chat threads) ----
  const saveSession = useCallback(
    (agentId: string, market: string, messages: ChatMessage[]) => {
      if (messages.length === 0) return;
      const firstUserMsg = messages.find((m) => m.role === "user");
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 80) + (firstUserMsg.content.length > 80 ? "…" : "")
        : "Session " + new Date().toLocaleTimeString();
      const session: SavedSession = {
        id: genId(),
        title,
        agentId,
        market,
        timestamp: new Date().toISOString(),
        messages,
      };
      setSavedSessions((prev) => [session, ...prev].slice(0, MAX_SESSIONS));
    },
    [setSavedSessions]
  );

  const getSessionsForAgent = useCallback(
    (agentId: string): SavedSession[] =>
      savedSessions.filter((s) => s.agentId === agentId),
    [savedSessions]
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSavedSessions((prev) => prev.filter((s) => s.id !== sessionId));
    },
    [setSavedSessions]
  );

  // ---- Geocache ----
  const cacheCoords = useCallback(
    (address: string, coords: { lat: number; lng: number } | null) => {
      setGeocache((prev) => ({ ...prev, [address]: coords }));
    },
    [setGeocache]
  );

  const isPipelined = useCallback(
    (deal: Deal) =>
      pipeline.some(
        (d) =>
          d.id === deal.id ||
          d.address.toLowerCase() === deal.address.toLowerCase()
      ),
    [pipeline]
  );

  return {
    // Chat
    chatHistory,
    getChatForAgent,
    setChatForAgent,
    clearChatForAgent,
    // Leads
    leadsQueue,
    setLeadsQueue,
    addToLeadsQueue,
    removeFromLeads,
    // Pipeline
    pipeline,
    setPipeline,
    saveToPipeline,
    movePipelineStage,
    addOutreach,
    removeFromPipeline,
    isPipelined,
    // Geocache
    geocache,
    cacheCoords,
    // Query History
    queryHistory,
    addQuery,
    getQueriesForAgent,
    clearQueryHistory,
    // Sessions
    savedSessions,
    saveSession,
    getSessionsForAgent,
    deleteSession,
  };
}
