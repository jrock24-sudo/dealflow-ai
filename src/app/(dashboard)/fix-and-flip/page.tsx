import AgentRunLog from "@/components/agents/AgentRunLog";

export const metadata = { title: "Fix & Flip — DealFlow AI" };

export default function FixAndFlipPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Fix &amp; Flip Agent</h2>
          <p className="mt-1 text-sm text-gray-400">
            Distressed property scanner with ARV analysis.
          </p>
        </div>
        <button className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 transition-colors">
          Run Now
        </button>
      </div>

      {/* Config summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "ARV Margin", value: "70%" },
          { label: "Max Purchase", value: "$350k" },
          { label: "Min Equity", value: "25%" },
          { label: "Target Markets", value: "8" },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <AgentRunLog agentId="fix-and-flip" />
    </div>
  );
}
