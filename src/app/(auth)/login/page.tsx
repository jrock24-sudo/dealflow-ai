"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      inviteCode: code,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid access code. Please try again.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Background glow */}
      <div style={s.glow} />

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoRow}>
          <div style={s.logoIcon}>⚡</div>
          <div>
            <div style={s.logoTitle}>DealFlow AI</div>
            <div style={s.logoSub}>AGENT NETWORK</div>
          </div>
        </div>

        <div style={s.divider} />

        <div style={s.tagline}>Enter your access code to launch</div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={{ position: "relative" }}>
            <input
              type={showCode ? "text" : "password"}
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access code"
              required
              style={s.input}
            />
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              style={s.eyeBtn}
            >
              {showCode ? "🙈" : "👁"}
            </button>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading || !code}
            style={{ ...s.submitBtn, opacity: !code || loading ? 0.5 : 1 }}
          >
            {loading ? "Verifying…" : "Launch DealFlow →"}
          </button>
        </form>

        <div style={s.footer}>
          Authorized access only · DealFlow AI v3
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:focus { outline: none; border-color: rgba(200,162,60,0.5) !important; box-shadow: 0 0 0 3px rgba(200,162,60,0.1); }
      `}</style>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0c0c0c",
    fontFamily: "'DM Sans', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: "20%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 600,
    height: 400,
    background: "radial-gradient(ellipse, rgba(200,162,60,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    background: "#141414",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 400,
    position: "relative",
    zIndex: 1,
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    justifyContent: "center",
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "linear-gradient(135deg, #C8A23C, #8B6914)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },
  logoTitle: {
    fontSize: 22,
    fontWeight: 900,
    color: "#f0ece2",
    fontFamily: "'Playfair Display', serif",
    lineHeight: 1.1,
  },
  logoSub: {
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: 1,
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    marginBottom: 24,
  },
  tagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    marginBottom: 24,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  input: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "13px 44px 13px 16px",
    color: "#f0ece2",
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box",
    transition: "border-color .2s",
    letterSpacing: 2,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    padding: 4,
    lineHeight: 1,
  },
  error: {
    fontSize: 12,
    color: "#E74C3C",
    background: "rgba(231,76,60,0.1)",
    border: "1px solid rgba(231,76,60,0.2)",
    borderRadius: 8,
    padding: "10px 14px",
  },
  submitBtn: {
    background: "linear-gradient(135deg, #C8A23C, #8B6914)",
    border: "none",
    borderRadius: 10,
    padding: "14px 24px",
    color: "#0a0a0a",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "opacity .2s",
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 24,
    fontSize: 10,
    color: "rgba(255,255,255,0.15)",
    textAlign: "center",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
};
