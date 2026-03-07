// src/hooks/useMqtt.ts
import { useEffect, useRef, useState, useCallback } from "react";
import mqtt from "mqtt";
import type { MqttClient } from "mqtt";

export interface BarrelStatus {
  led: boolean;
  uptime: number;
  rssi: number;
  waterLevelInches: number | null;
  flowRate: number;
  flowPulses: number;
}

export interface LwtStatus {
  online: boolean;
}

export interface DeviceState {
  status: BarrelStatus | null;
  lwt: LwtStatus | null;
  connected: boolean;
}

const DEVICE_ID = import.meta.env.VITE_DEVICE_ID ?? "barrel-001";

const MQTT_CONFIG = {
  url: import.meta.env.VITE_MQTT_URL,
  username: import.meta.env.VITE_MQTT_USERNAME,
  password: import.meta.env.VITE_MQTT_PASSWORD,
};

const TOPICS = {
  command: `barrel/${DEVICE_ID}/command`,
  status: `barrel/${DEVICE_ID}/status`,
  lwt: `barrel/${DEVICE_ID}/lwt`,
};

export function useMqtt() {
  const clientRef = useRef<MqttClient | null>(null);
  const [deviceState, setDeviceState] = useState<DeviceState>({
    status: null,
    lwt: null,
    connected: false,
  });
  const [pending, setPending] = useState(false);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectMqtt = useCallback(() => {
    const client = mqtt.connect(MQTT_CONFIG.url, {
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
      protocolVersion: 5,
      clean: true,
      reconnectPeriod: 5000,
    });

    clientRef.current = client;

    client.on("connect", () => {
      console.log("[MQTT] Connected");
      setDeviceState((prev) => ({ ...prev, connected: true }));
      client.subscribe([TOPICS.status, TOPICS.lwt], { qos: 1 });
    });

    client.on("close", () => {
      setDeviceState((prev) => ({ ...prev, connected: false }));
    });

    client.on("message", (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString());

        if (topic === TOPICS.status) {
          setDeviceState((prev) => ({
            ...prev,
            status: {
              led: data.led ?? false,
              uptime: data.uptime ?? 0,
              rssi: data.rssi ?? 0,
              waterLevelInches: data.waterLevelInches ?? null,
              flowRate: data.flowRate ?? 0,
              flowPulses: data.flowPulses ?? 0,
            },
          }));
          // Status arrived — command was confirmed
          setPending(false);
          if (pendingTimeout.current) {
            clearTimeout(pendingTimeout.current);
            pendingTimeout.current = null;
          }
        }

        if (topic === TOPICS.lwt) {
          setDeviceState((prev) => ({
            ...prev,
            lwt: { online: data.online ?? false },
          }));
        }
      } catch (err) {
        console.error("[MQTT] Failed to parse message:", err);
      }
    });

    return () => {
      client.end();
      if (pendingTimeout.current) {
        clearTimeout(pendingTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const cleanup = connectMqtt();
    return cleanup;
  }, [connectMqtt]);

  const sendCommand = useCallback((command: "on" | "off") => {
    if (!clientRef.current?.connected) return;

    clientRef.current.publish(TOPICS.command, command, { qos: 1 });
    console.log(`[MQTT] Sent command: ${command}`);
    setPending(true);

    // Timeout: if no status confirmation within 5s, clear pending
    if (pendingTimeout.current) {
      clearTimeout(pendingTimeout.current);
    }
    pendingTimeout.current = setTimeout(() => {
      console.warn("[MQTT] Command timed out — no confirmation received");
      setPending(false);
      pendingTimeout.current = null;
    }, 5000);
  }, []);

  return { deviceState, sendCommand, pending };
}
