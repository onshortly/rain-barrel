import React, { useEffect, useState } from 'react';
import { useRainBarrel } from "../hooks/useRainBarrel";

export const FlowTicker: React.FC = () => {
    const context = useRainBarrel();
    const [displayRate, setDisplayRate] = useState(0);

    useEffect(() => {
        if (!context) return;

        const interval = setInterval(() => {
            setDisplayRate(context.dispensingRate);
        }, 100);

        return () => clearInterval(interval);
    }, [context]);

    return (
        <div className="flow-ticker">
            <h3>Current Flow Rate</h3>
            <div className="ticker-display">
                {displayRate.toFixed(2)} GPM
            </div>
        </div>
    );
};