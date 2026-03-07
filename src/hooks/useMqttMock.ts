import { useState, useCallback, useEffect, useRef } from "react";
import type { DeviceState, BarrelStatus } from "./useMqtt";
import { BARREL_PROFILES } from "../consts/rainBarrels";

const TICK_INTERVAL = 1000;
const COMMAND_LATENCY = [200, 800] as const;

const profile = BARREL_PROFILES[0];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createInitialStatus(): BarrelStatus {
  return {
    led: false,
    uptime: 0,
    rssi: Math.round(randomBetween(-70, -40)),
    waterLevelInches: profile.heightInches * 0.75,
    flowRate: 0,
    flowPulses: 0,
  };
}

export function useMqttMock() {
  const statusRef = useRef<BarrelStatus>(createInitialStatus());
  const [deviceState, setDeviceState] = useState<DeviceState>({
    status: statusRef.current,
    lwt: { online: true },
    connected: true,
  });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const s = statusRef.current;
      s.uptime += 1;

      s.rssi = Math.round(
        Math.min(-30, Math.max(-80, s.rssi + randomBetween(-2, 2))),
      );

      if (s.led) {
        // Valve open — drain at ~1.2 GPM
        const flowGallonsPerSec = 1.2 / 60;
        const inchesPerSec = flowGallonsPerSec / profile.gallonsPerInch;

        s.waterLevelInches = Math.max(0, s.waterLevelInches - inchesPerSec);
        s.flowRate = Math.round(450 * (flowGallonsPerSec / 0.2642));
        s.flowPulses += s.flowRate;

        if (s.waterLevelInches <= 0) {
          s.led = false;
          s.flowRate = 0;
          s.waterLevelInches = 0;
        }
      } else {
        s.flowRate = 0;

        // Rain fill only when valve is closed
        if (s.waterLevelInches < profile.heightInches) {
          s.waterLevelInches = Math.min(
            profile.heightInches,
            s.waterLevelInches + 0.008,
          );
        }
      }

      setDeviceState((prev) => ({
        ...prev,
        status: { ...s },
      }));
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const sendCommand = useCallback((command: "on" | "off") => {
    console.log(`[MOCK MQTT] Command received: ${command}`);
    setPending(true);

    const latency = randomBetween(...COMMAND_LATENCY);

    setTimeout(() => {
      const s = statusRef.current;
      s.led = command === "on";
      if (!s.led) {
        s.flowRate = 0;
      }

      setDeviceState((prev) => ({
        ...prev,
        status: { ...s },
      }));
      setPending(false);
      console.log(`[MOCK MQTT] State confirmed after ${Math.round(latency)}ms`);
    }, latency);
  }, []);

  return { deviceState, sendCommand, pending };
}
