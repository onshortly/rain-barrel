import React, {
  createContext,
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useBarrelMqtt as useMqtt } from "../hooks/useBarrelMqtt";
import type { InstalledBarrel } from "../consts/rainBarrels";

export interface RainBarrelContextType {
  currentInstalledBarrel: InstalledBarrel | null;
  valveOpenTime: number;
  waterDispensed: number;
  currentCapacity: number;
  maxCapacity: number;
  dispensingRate: number;
  timeUntilEmpty: number;
  isValveOpen: boolean;
  isOnline: boolean;
  pending: boolean;
  sendCommand: (cmd: "on" | "off") => void;
  setMaxCapacity: (capacity: number) => void;
  setCurrentInstalledBarrel: (barrel: InstalledBarrel | null) => void;
}

export const RainBarrelContext = createContext<
  RainBarrelContextType | undefined
>(undefined);

// Flow sensor: YF-S201 outputs ~450 pulses per liter
// 1 liter ≈ 0.2642 gallons
const GALLONS_PER_PULSE = 0.2642 / 450;

export const RainBarrelProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentInstalledBarrel, setCurrentInstalledBarrel] =
    useState<InstalledBarrel | null>(null);
  const [maxCapacity, setMaxCapacity] = useState(55);

  const { deviceState, sendCommand: mqttSendCommand, pending } = useMqtt();

  // ── Valve open time tracking ──────────────────────────────
  const valveOpenUptimeStart = useRef<number | null>(null);
  const [valveOpenTime, setValveOpenTime] = useState(0);

  const isValveOpen = useMemo(() => {
    return deviceState.status?.led ?? false;
  }, [deviceState.status?.led]);

  const isOnline = deviceState.lwt?.online ?? false;

  useEffect(() => {
    if (isValveOpen) {
      if (valveOpenUptimeStart.current === null) {
        valveOpenUptimeStart.current = deviceState.status?.uptime ?? 0;
      }
      // Each status update from ESP32 includes uptime in seconds
      const elapsed =
        (deviceState.status?.uptime ?? 0) -
        (valveOpenUptimeStart?.current || 0);
      setValveOpenTime(Math.max(0, elapsed));
    } else {
      valveOpenUptimeStart.current = null;
      setValveOpenTime(0);
    }
  }, [isValveOpen, deviceState.status?.uptime]);

  // ── Fill level from pressure sensor ───────────────────────
  // ESP32 publishes waterLevelInches from the analog pressure reading
  const currentCapacity = useMemo(() => {
    const inches = deviceState.status?.waterLevelInches;
    if (inches == null) return maxCapacity; // assume full until first reading
    return Math.min(
      maxCapacity,
      Math.max(0, inches * (currentInstalledBarrel?.gallonsPerInch || 0)),
    );
  }, [
    currentInstalledBarrel?.gallonsPerInch,
    deviceState.status?.waterLevelInches,
    maxCapacity,
  ]);

  // ── Flow rate and dispensed volume from flow sensor ───────
  // ESP32 publishes flowPulses (cumulative) and flowRate (pulses/sec)
  const sessionStartPulses = useRef<number | null>(null);

  const dispensingRate = useMemo(() => {
    const pulsesPerSec = deviceState.status?.flowRate ?? 0;
    return pulsesPerSec * GALLONS_PER_PULSE;
  }, [deviceState.status?.flowRate]);

  const waterDispensed = useMemo(() => {
    const totalPulses = deviceState.status?.flowPulses ?? 0;
    if (!isValveOpen) return 0;
    if (sessionStartPulses.current === null) {
      sessionStartPulses.current = totalPulses;
    }
    return (totalPulses - sessionStartPulses.current) * GALLONS_PER_PULSE;
  }, [deviceState.status?.flowPulses, isValveOpen]);

  // Reset session pulse counter when valve closes
  useEffect(() => {
    if (!isValveOpen) {
      sessionStartPulses.current = null;
    }
  }, [isValveOpen]);

  // ── Derived: time until empty ─────────────────────────────
  const timeUntilEmpty = useMemo(() => {
    if (dispensingRate <= 0) return Infinity;
    return Math.ceil(currentCapacity / dispensingRate);
  }, [currentCapacity, dispensingRate]);

  // ── Command wrapper ───────────────────────────────────────
  const sendCommand = useCallback(
    (cmd: "on" | "off") => {
      mqttSendCommand(cmd);
    },
    [mqttSendCommand],
  );

  const value: RainBarrelContextType = {
    currentInstalledBarrel,
    valveOpenTime,
    waterDispensed,
    currentCapacity,
    maxCapacity,
    dispensingRate,
    timeUntilEmpty,
    isValveOpen,
    isOnline,
    pending,
    sendCommand,
    setMaxCapacity,
    setCurrentInstalledBarrel,
  };

  return (
    <RainBarrelContext.Provider value={value}>
      {children}
    </RainBarrelContext.Provider>
  );
};
