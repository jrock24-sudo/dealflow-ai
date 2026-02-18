"use client";

import { signOut } from "next-auth/react";

export default function Header() {
  return (
    <header className="h-14 shrink-0 bg-gray-900 border-b border-gray-800 flex items-center justify-end px-6">
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        Sign out
      </button>
    </header>
  );
}
