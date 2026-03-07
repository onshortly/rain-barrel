import { useEffect } from "react";
import { FillMeter } from "./components/FillMeter";
import { FlowTicker } from "./components/FlowTicker";
import { useMqtt } from "./hooks/useMqtt";
import { useRainBarrel } from "./hooks/useRainBarrel";
import { BARREL_PROFILES } from "./consts/rainBarrels";

function App() {
  const { deviceState, sendCommand } = useMqtt();
  const { connected, lwt, status } = deviceState;
  const { setCurrentInstalledBarrel, isValveOpen } = useRainBarrel();

  useEffect(() => {
    // For demo purposes, we can auto-set a barrel profile on load
    setCurrentInstalledBarrel({
      id: "demo-barrel-001",
      ...BARREL_PROFILES[0],
    });
  }, [setCurrentInstalledBarrel]);

  return (
    <div
      style={{
        padding: 32,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 400,
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Rain Barrel Controller</h1>

      {/* Connection indicators */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <StatusDot label="MQTT" active={connected} />
        <StatusDot label="Device" active={lwt?.online || false} />
      </div>

      {/* LED toggle */}
      <button
        onClick={() => sendCommand(isValveOpen ? "off" : "on")}
        disabled={!connected || !lwt?.online}
        style={{
          width: "100%",
          padding: "16px 24px",
          fontSize: 18,
          fontWeight: 600,
          border: "none",
          borderRadius: 12,
          cursor: connected && lwt?.online ? "pointer" : "not-allowed",
          background: status?.led ? "#22c55e" : "#334155",
          color: "#fff",
          opacity: connected && lwt?.online ? 1 : 0.5,
          transition: "background 0.2s",
        }}
      >
        {status?.led
          ? "💡 LED ON — Tap to turn off"
          : "LED OFF — Tap to turn on"}
      </button>

      {/* Device info */}
      {status && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "#f1f5f9",
            borderRadius: 8,
            fontSize: 14,
            color: "#475569",
            lineHeight: 2,
          }}
        >
          <div>
            <strong>Uptime:</strong> {formatUptime(status.uptime)}
          </div>
          <div>
            <strong>WiFi signal:</strong> {status.rssi} dBm{" "}
            {status.rssi > -50 ? "🟢" : status.rssi > -70 ? "🟡" : "🔴"}
          </div>
        </div>
      )}

      {!connected && (
        <p style={{ marginTop: 16, color: "#94a3b8", fontSize: 14 }}>
          Connecting to MQTT broker...
        </p>
      )}

      {connected && !lwt?.online && (
        <p style={{ marginTop: 16, color: "#f59e0b", fontSize: 14 }}>
          Broker connected, waiting for device to come online...
        </p>
      )}
      <FlowTicker />
      <FillMeter />
    </div>
  );
}

function StatusDot({ label, active }: { label: string; active: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: active ? "#22c55e" : "#94a3b8",
          transition: "background 0.2s",
        }}
      />
      <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default App;
