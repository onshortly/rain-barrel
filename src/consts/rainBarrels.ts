export interface InstalledBarrel extends BarrelProfile {
  id: string;
}

export interface BarrelProfile {
  containerId: string;
  label: string;
  maxCapacity: number; // gallons
  heightInches: number; // interior height
  gallonsPerInch: number; // capacity / height (for pressure → fill conversion)
}

export const BARREL_PROFILES: BarrelProfile[] = [
  {
    containerId: "drum-55",
    label: "55-Gallon Drum",
    maxCapacity: 55,
    heightInches: 33.5,
    gallonsPerInch: 55 / 33.5, // ≈ 1.642
  },
  {
    containerId: "ibc-275",
    label: "275-Gallon IBC Tote",
    maxCapacity: 275,
    heightInches: 46,
    gallonsPerInch: 275 / 46, // ≈ 5.978
  },
];

export const DEFAULT_BARREL_PROFILE = BARREL_PROFILES[0];
