import dynamic from "next/dynamic";

const DealFlowDashboard = dynamic(
  () => import("@/components/agents/DealFlowDashboard"),
  { ssr: false, loading: () => null }
);

export default function DashboardPage() {
  return <DealFlowDashboard />;
}
