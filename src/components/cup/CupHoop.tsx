"use client";

import * as d3 from "d3";
import { useCallback, useEffect, useRef } from "react";
import { reducedMotion, ResetIcon } from "./shared";

/** The hero's rim-out: a shot arcs in, rattles round the rim and drops off the side. */
export function CupHoop() {
  const ref = useRef<SVGSVGElement>(null);
  const play = useCallback(() => {
    const svg = d3.select(ref.current);
    const ball = svg.select<SVGGElement>("#cup-ball");
    const net = svg.select<SVGGElement>("#cup-net");
    const cap = svg.select<SVGTextElement>("#cup-cap");
    // Piecewise path: release → arc to the front rim → pop up → roll on the rim → off the side and down.
    const segs: { d: number; f: (t: number) => [number, number] }[] = [
      { d: 900, f: (t) => [10 + t * 106, 250 - Math.sin(t * Math.PI * 0.86) * 230 + t * 52] },
      { d: 260, f: (t) => [116 + t * 28, 116 - Math.sin(t * Math.PI) * 38] },
      { d: 380, f: (t) => [144 + Math.sin(t * Math.PI) * 14, 116 - Math.sin(t * Math.PI) * 6] },
      { d: 700, f: (t) => [160 + t * 118, 112 + t * t * 128] },
    ];
    ball.interrupt().attr("transform", "translate(10,250)").attr("opacity", 1);
    cap.attr("opacity", 0);
    if (reducedMotion()) {
      ball.attr("transform", "translate(278,240)");
      cap.attr("opacity", 1);
      return;
    }
    let chain = ball.transition().duration(0);
    segs.forEach((s, i) => {
      chain = chain
        .transition()
        .duration(s.d)
        .ease(i === 0 ? d3.easeQuadOut : i === 3 ? d3.easeQuadIn : d3.easeSinInOut)
        .attrTween("transform", () => (t) => {
          const [x, y] = s.f(t);
          return `translate(${x},${y}) rotate(${(i * 90 + t * 120) % 360})`;
        });
      if (i === 1) chain.on("start", () => void net.transition().duration(120).attr("transform", "translate(0,2)").transition().duration(240).attr("transform", "translate(0,0)"));
    });
    chain.on("end", () => void cap.transition().duration(300).attr("opacity", 1));
  }, []);
  useEffect(() => play(), [play]);
  return (
    <div className="cup-hoop">
      <svg ref={ref} viewBox="0 0 320 300" role="img" aria-label="A ball rims out of the hoop">
        <rect x="196" y="40" width="12" height="120" rx="3" fill="#dbe3ee" />
        <rect x="120" y="62" width="88" height="62" rx="4" fill="none" stroke="#dbe3ee" strokeWidth="4" />
        <rect x="150" y="84" width="34" height="26" fill="none" stroke="#dbe3ee" strokeWidth="3" />
        <g id="cup-net" stroke="#f3f6fa" strokeWidth="1.6" fill="none" opacity=".85">
          <path d="M104 128 L114 176 M118 128 L122 178 M132 128 L131 178 M146 128 L140 178 M160 128 L149 176" />
          <path d="M106 140 Q132 150 158 140 M110 156 Q132 164 154 156 M113 170 Q132 176 150 170" />
        </g>
        <ellipse cx="132" cy="128" rx="30" ry="7" fill="none" stroke="var(--accent)" strokeWidth="5" />
        <g id="cup-ball" transform="translate(278,240)">
          <circle r="17" fill="#e0601c" />
          <path d="M-17 0 H17 M0 -17 V17 M-12 -12 Q0 0 -12 12 M12 -12 Q0 0 12 12" stroke="rgba(0,0,0,.45)" strokeWidth="1.6" fill="none" />
        </g>
        <text x="20" y="288" className="cup-hoop-cap" id="cup-cap">
          One six-footer
        </text>
      </svg>
      <button type="button" className="cup-btn" onClick={play}>
        <ResetIcon />
        <span>Replay</span>
      </button>
    </div>
  );
}
