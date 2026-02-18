import Link from "next/link";

interface AgentCardProps {
  name: string;
  description: string;
  href: string;
  status: "active" | "idle" | "error";
  lastRun: string;
  dealsFound: number;
}

const statusStyles: Record<AgentCardProps["status"], string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-800",
  idle: "bg-gray-700/30 text-gray-400 border-gray-700",
  error: "bg-red-500/10 text-red-400 border-red-800",
};

export default function AgentCard({
  name,
  description,
  href,
  status,
  lastRun,
  dealsFound,
}: AgentCardProps) {
  return (
    <Link
      href={href}
      className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-700 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
          {name}
        </h3>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${statusStyles[status]}`}
        >
          {status}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-400 leading-relaxed">{description}</p>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span>Last run: {lastRun}</span>
        <span className="text-emerald-400 font-medium">{dealsFound} deals found</span>
      </div>
    </Link>
  );
}
