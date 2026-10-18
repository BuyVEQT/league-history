"use client";

import { Target } from "lucide-react";
import { useSpotlight } from "./SpotlightProvider";

/** The header band's "Spotlight" select, with an orange "Name ✕" chip that clears it. */
export function SpotlightPicker() {
  const { spot, setSpot, managers } = useSpotlight();
  const name = managers.find((m) => m.id === spot)?.name;
  return (
    <div className="spot">
      <label className="spot-l" htmlFor="spot-sel">
        <Target aria-hidden strokeWidth={2} />
        <span>Spotlight</span>
      </label>
      <select id="spot-sel" aria-label="Spotlight a manager" value={spot ?? ""} onChange={(e) => setSpot(e.target.value || null)}>
        <option value="">Nobody</option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {name && (
        <button type="button" className="spot-chip" onClick={() => setSpot(null)} aria-label={`Clear spotlight on ${name}`}>
          {name} ✕
        </button>
      )}
    </div>
  );
}
