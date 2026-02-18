// AgentRunLog — placeholder for live run output / history.
// Wire this to your agent backend or a streaming API route when ready.

interface AgentRunLogProps {
  agentId: string;
}

const PLACEHOLDER_RUNS = [
  { id: "run-3", ts: "Today 09:14 AM", status: "success", summary: "Scanned 340 parcels · 3 new leads queued" },
  { id: "run-2", ts: "Yesterday 06:00 PM", status: "success", summary: "Scanned 280 parcels · 1 new lead queued" },
  { id: "run-1", ts: "Yesterday 12:00 PM", status: "error", summary: "MLS API timeout after 120 s" },
];

const statusDot: Record<string, string> = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  running: "bg-yellow-400 animate-pulse",
};

export default function AgentRunLog({ agentId: _ }: AgentRunLogProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Run History</h4>

      <ul className="space-y-3">
        {PLACEHOLDER_RUNS.map((run) => (
          <li key={run.id} className="flex items-start gap-3">
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${statusDot[run.status] ?? "bg-gray-600"}`} />
            <div className="min-w-0">
              <p className="text-sm text-gray-100">{run.summary}</p>
              <p className="text-xs text-gray-500 mt-0.5">{run.ts}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-gray-600 border-t border-gray-800 pt-3">
        Connect <code className="font-mono">AgentRunLog</code> to your backend for live data.
      </p>
    </div>
  );
}
