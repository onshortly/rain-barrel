import React from "react";
import { useRainBarrel } from "../hooks/useRainBarrel";

export const FillMeter: React.FC = () => {
  const { currentCapacity, maxCapacity } = useRainBarrel();

  const fillPercentage =
    maxCapacity > 0
      ? Math.min(100, Math.max(0, (currentCapacity / maxCapacity) * 100))
      : 0;

  // SVG arc math for a half-donut (180° sweep)
  const size = 200;
  const strokeWidth = 28;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;

  const describeArc = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Arc goes from 180° (left) to 0° (right) — a top-facing half circle
  const bgPath = describeArc(180, 360);
  const fillAngle = 180 + (fillPercentage / 100) * 180;
  const fillPath = fillPercentage > 0 ? describeArc(180, fillAngle) : "";

  // Color shifts from red (empty) → yellow (mid) → blue (full)
  const getFillColor = (pct: number) => {
    if (pct < 25) return "#ef4444";
    if (pct < 50) return "#f59e0b";
    if (pct < 75) return "#3b82f6";
    return "#2563eb";
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
      >
        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {fillPercentage > 0 && (
          <path
            d={fillPath}
            fill="none"
            stroke={getFillColor(fillPercentage)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Center label */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          className="text-2xl font-bold"
          fontSize="32"
          fontWeight="700"
          fill="#111827"
        >
          {fillPercentage.toFixed(1)}%
        </text>
      </svg>
      <p className="text-sm text-gray-500 mt-1">
        {currentCapacity.toFixed(2)} / {maxCapacity} gal
      </p>
    </div>
  );
};
