import { useEffect, useState } from "react";

type HealthStatus = { status: string };
type AdminOverview = {
  threads: { total: number };
  knowledge: { total: number };
  analytics: { totalInteractions: number; avgLatencyMs: number };
  model: { mode: string };
  adapters: { mode: string; name: string; available: boolean }[];
};

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  useEffect(() => {
    fetch("/api/healthz").then(r => r.json()).then(setHealth).catch(() => null);
    fetch("/api/admin/overview").then(r => r.json()).then(setOverview).catch(() => null);
  }, []);

  const isUp = health?.status === "ok";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0f0f0f", minHeight: "100vh", color: "#e5e5e5", padding: "48px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: isUp ? "#22c55e" : health ? "#ef4444" : "#6b7280" }} />
          <span style={{ fontSize: 13, color: isUp ? "#22c55e" : "#6b7280" }}>
            {isUp ? "operational" : health ? "degraded" : "connecting…"}
          </span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 4px", color: "#fff" }}>Cat-Bot AI Platform</h1>
        <p style={{ fontSize: 15, color: "#9ca3af", margin: "0 0 40px" }}>
          Self-hosted AI backend · zero external provider dependencies
        </p>

        {overview && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
            {[
              { label: "Threads", value: overview.threads.total },
              { label: "Knowledge Entries", value: overview.knowledge.total },
              { label: "Interactions", value: overview.analytics.totalInteractions },
              { label: "Avg Latency", value: `${overview.analytics.avgLatencyMs}ms` },
              { label: "Inference Mode", value: overview.model.mode },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#1a1a1a", borderRadius: 8, padding: "16px 20px", border: "1px solid #2a2a2a" }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: "#fff" }}>{value}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Adapters</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(overview?.adapters ?? []).map(a => (
              <span key={a.mode} style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: a.available ? "#14532d" : "#1a1a1a",
                color: a.available ? "#86efac" : "#6b7280",
                border: `1px solid ${a.available ? "#16a34a" : "#2a2a2a"}`
              }}>
                {a.name}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>API Endpoints</h2>
          <div style={{ display: "grid", gap: 1 }}>
            {[
              ["POST", "/api/chat", "Send a message, get an AI response"],
              ["GET", "/api/threads", "List conversation threads"],
              ["GET/POST", "/api/knowledge", "Knowledge base management"],
              ["GET", "/api/memory/:threadId", "Per-thread memory"],
              ["GET", "/api/models/config", "Inference configuration"],
              ["GET", "/api/analytics/summary", "Usage analytics"],
              ["GET", "/api/diagnostics", "System health"],
              ["GET", "/api/docs", "Swagger UI"],
            ].map(([method, path, desc]) => (
              <div key={path} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "#1a1a1a", borderRadius: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", minWidth: 64, fontFamily: "monospace" }}>{method}</span>
                <span style={{ fontSize: 13, color: "#e5e5e5", fontFamily: "monospace", minWidth: 240 }}>{path}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #2a2a2a", display: "flex", gap: 24 }}>
          <a href="/api/docs" style={{ fontSize: 13, color: "#818cf8", textDecoration: "none" }}>Swagger UI →</a>
          <a href="/api/healthz" style={{ fontSize: 13, color: "#818cf8", textDecoration: "none" }}>Health check →</a>
          <a href="/api/admin/overview" style={{ fontSize: 13, color: "#818cf8", textDecoration: "none" }}>Admin overview →</a>
        </div>
      </div>
    </div>
  );
}
