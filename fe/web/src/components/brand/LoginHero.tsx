import * as React from 'react';

import { SekarMark } from './SekarMark';

const STROKE = 'var(--color-nb-black)';

/**
 * LoginHero — decorative NB illustration for the login brand panel: a stylised
 * RTH (green-space) monitoring scene — pinwheel "sun", park trees, a tracked
 * location pin, and a small performance-bars card (the "evaluasi kinerja"
 * motif). Colours come from design tokens via CSS vars (lint-clean, themable).
 * Purely decorative — hidden from assistive tech.
 */
export function LoginHero({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={className} aria-hidden="true">
      <div className="relative mx-auto w-full max-w-[360px]">
        <svg viewBox="0 0 360 300" fill="none" className="w-full">
          <g stroke={STROKE} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
            {/* Back hill */}
            <path
              d="M -10 230 Q 90 170 190 210 Q 280 244 370 196 L 370 310 L -10 310 Z"
              fill="var(--color-nb-success-light)"
            />
            {/* Front hill */}
            <path
              d="M -10 268 Q 110 222 210 256 Q 300 286 370 250 L 370 310 L -10 310 Z"
              fill="var(--color-nb-primary)"
            />

            {/* Trees */}
            {[
              { x: 70, y: 232, r: 26, fill: 'var(--color-nb-success-light)' },
              { x: 250, y: 244, r: 22, fill: 'var(--color-nb-white)' },
            ].map((t) => (
              <g key={t.x}>
                <rect x={t.x - 5} y={t.y} width={10} height={34} rx={3} fill="var(--color-nb-white)" />
                <circle cx={t.x} cy={t.y} r={t.r} fill={t.fill} />
              </g>
            ))}

            {/* Tracked location pin */}
            <g transform="translate(178 150)">
              <ellipse cx={0} cy={92} rx={26} ry={7} fill="var(--color-nb-black)" opacity={0.12} stroke="none" />
              <path
                d="M 0 86 C -26 52 -28 30 -28 16 A 28 28 0 1 1 28 16 C 28 30 26 52 0 86 Z"
                fill="var(--color-nb-white)"
              />
              <circle cx={0} cy={14} r={12} fill="var(--color-nb-primary)" />
            </g>

            {/* Performance-bars card (evaluasi kinerja) */}
            <g transform="translate(238 96)">
              <rect x={4} y={6} width={92} height={70} rx={8} fill="var(--color-nb-black)" stroke="none" />
              <rect x={0} y={0} width={92} height={70} rx={8} fill="var(--color-nb-white)" />
              <rect x={14} y={38} width={16} height={20} rx={2} fill="var(--color-nb-info-light)" />
              <rect x={38} y={26} width={16} height={32} rx={2} fill="var(--color-nb-warning-light)" />
              <rect x={62} y={16} width={16} height={42} rx={2} fill="var(--color-nb-primary)" />
            </g>
          </g>
        </svg>

        {/* Pinwheel "sun" — reuses the canonical brand mark */}
        <div className="absolute left-2 top-0 sm:left-6">
          <span
            className="inline-flex rounded-full border-[3px] border-nb-black p-3 shadow-nb-md"
            style={{ backgroundColor: 'var(--color-bg-accent-yellow)' }}
          >
            <SekarMark size={64} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default LoginHero;
