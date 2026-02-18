"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      inviteCode,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid invite code. Please try again.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">DealFlow AI</h1>
          <p className="mt-1 text-sm text-gray-400">Enter your invite code to access the dashboard</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-xl space-y-5"
        >
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-300 mb-1.5">
              Invite Code
            </label>
            <input
              id="inviteCode"
              type="password"
              autoComplete="off"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3.5 py-2.5 text-sm
                         placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !inviteCode}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
                       text-white font-semibold text-sm py-2.5 transition-colors"
          >
            {loading ? "Verifying…" : "Access Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
