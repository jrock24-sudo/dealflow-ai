import AgentCard from "@/components/agents/AgentCard";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Overview</h2>
        <p className="mt-1 text-sm text-gray-400">Monitor your active deal-finding agents.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AgentCard
          name="Land Acquisition"
          description="Scans for off-market land parcels and motivated sellers matching your buy-box criteria."
          href="/land-acquisition"
          status="active"
          lastRun="2 hours ago"
          dealsFound={14}
        />
        <AgentCard
          name="Fix &amp; Flip"
          description="Identifies distressed properties with strong ARV upside and below-market entry points."
          href="/fix-and-flip"
          status="active"
          lastRun="45 minutes ago"
          dealsFound={7}
        />
      </div>
    </div>
  );
}
