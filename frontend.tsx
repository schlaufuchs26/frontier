import { useState } from "react";
import { createRoot } from "react-dom/client";

export function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1 style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🦊</h1>
      <h2
        style={{ fontWeight: 400, color: "var(--muted)", marginBottom: "2rem" }}
      >
        Bun + TypeScript + React
      </h2>
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        style={{
          background: "var(--accent)",
          color: "var(--bg)",
          border: "none",
          padding: "12px 32px",
          fontSize: "1rem",
          fontWeight: 600,
          borderRadius: "8px",
          cursor: "pointer",
          transition: "opacity 0.15s",
        }}
      >
        clicks: {count}
      </button>
    </div>
  );
}

const el = document.getElementById("root");
if (el) {
  const root = createRoot(el);
  root.render(<App />);
}
