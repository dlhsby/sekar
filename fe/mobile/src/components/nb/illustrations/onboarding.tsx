/**
 * Onboarding scene illustrations — Phase 4 M0 / ADR-042 / Hifi OB-1-3
 *
 * Three branded Neo-Brutalist SVG scenes ported from design/project/illustrations.html:
 * - OnbClockIn: worker + map + GPS waves (280x220)
 * - OnbPhoto: report card + camera (280x220)
 * - OnbMonitor: big map plate with markers (280x220)
 *
 * Each accepts optional width/height props (default: 280x220 aspect).
 * Colors come from design tokens (no inline hex — ESLint `no-inline-hex-colors`).
 *
 * @see specs/ui-ux/design-tokens.md
 */

import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { nbColors } from '../../../constants/nbTokens';

// ─── Color tokens (mapped from design hex) ────────────────────────────────────
const INK = nbColors.black;
const WHITE = nbColors.white;
const SAGE = nbColors.primary;
const MINT = nbColors.bgAccentMint;
const YELLOW = nbColors.bgAccentYellow;
const GREEN = nbColors.bgAccentGreen;
const CANVAS = nbColors.bgCanvas;
const DANGER = nbColors.plantOverdue; // #DC2626
const SUCCESS_DARK = nbColors.successDark; // #15803D
const SECONDARY = nbColors.secondary; // #8B7355 (brown)
const GRAY = nbColors.gray300; // #D6D3D1

export interface OnboardingIllustrationProps {
  width?: number;
  height?: number;
}

/**
 * OnbClockIn — Worker holding phone with GPS map + waves.
 * Represents the clock-in workflow with live location tracking.
 */
export function OnbClockIn({ width = 280, height = 220 }: OnboardingIllustrationProps): React.JSX.Element {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 220">
      {/* Dotted ground line */}
      <Line x1={20} y1={198} x2={260} y2={198} stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="6 6" />

      {/* Map plate (back layer with shadow offset) */}
      <G transform="translate(150 60) rotate(-6)">
        <Rect x={0} y={0} width={120} height={100} rx={8} fill={INK} />
        <Rect x={-4} y={-4} width={120} height={100} rx={8} fill={MINT} stroke={INK} strokeWidth={3} />

        {/* Streets (white base + dashed overlay) */}
        <Path d="M-4 30 L116 30" stroke={WHITE} strokeWidth={6} />
        <Path d="M-4 30 L116 30" stroke={INK} strokeWidth={1.5} strokeDasharray="3 5" />
        <Path d="M60 -4 L60 96" stroke={WHITE} strokeWidth={6} />
        <Path d="M60 -4 L60 96" stroke={INK} strokeWidth={1.5} strokeDasharray="3 5" />

        {/* Geofence circle */}
        <Circle cx={58} cy={58} r={26} fill={SAGE} fillOpacity={0.35} stroke={SUCCESS_DARK} strokeWidth={2} strokeDasharray="4 3" />

        {/* Marker pin */}
        <Path d="M58 30 Q44 30 44 44 Q44 58 58 70 Q72 58 72 44 Q72 30 58 30 Z" fill={DANGER} stroke={INK} strokeWidth={2.5} />
        <Circle cx={58} cy={44} r={5} fill={WHITE} stroke={INK} strokeWidth={2} />
      </G>

      {/* Worker figure */}
      <G transform="translate(48 88)">
        {/* Shadow */}
        <Ellipse cx={22} cy={110} rx={40} ry={5} fill={INK} opacity={0.25} />

        {/* Body */}
        <Rect x={-8} y={32} width={60} height={62} rx={4} fill={SAGE} stroke={INK} strokeWidth={3} />

        {/* Pocket on shirt */}
        <Rect x={6} y={56} width={14} height={14} rx={2} fill={YELLOW} stroke={INK} strokeWidth={2} />

        {/* Head */}
        <Circle cx={22} cy={14} r={18} fill={CANVAS} stroke={INK} strokeWidth={3} />

        {/* Hard hat */}
        <Path d="M2 4 Q2 -10 22 -10 Q42 -10 42 4 L2 4 Z" fill={YELLOW} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <Line x1={0} y1={4} x2={44} y2={4} stroke={INK} strokeWidth={3} strokeLinecap="round" />

        {/* ID badge */}
        <Rect x={2} y={38} width={26} height={14} rx={2} fill={WHITE} stroke={INK} strokeWidth={2} />
        <Rect x={6} y={42} width={14} height={2} fill={INK} />
        <Rect x={6} y={46} width={10} height={2} fill={INK} />

        {/* Arm holding phone */}
        <Rect x={36} y={38} width={14} height={32} rx={3} fill={SAGE} stroke={INK} strokeWidth={3} />

        {/* Phone (shadow) */}
        <Rect x={50} y={32} width={20} height={36} rx={3} fill={INK} />

        {/* Phone (body) */}
        <Rect x={48} y={30} width={20} height={36} rx={3} fill={WHITE} stroke={INK} strokeWidth={2.5} />

        {/* Phone button */}
        <Circle cx={58} cy={48} r={6} fill={SAGE} stroke={INK} strokeWidth={2} />

        {/* Checkmark on phone */}
        <Path d="M55 48 L57 50 L61 46" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </G>

      {/* GPS waves */}
      <G transform="translate(208 110)" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round">
        <Path d="M0 0 Q6 -6 12 0" />
        <Path d="M-4 4 Q6 -10 16 4" />
        <Path d="M-8 8 Q6 -14 20 8" />
      </G>
    </Svg>
  );
}

/**
 * OnbPhoto — Report card + camera with flash.
 * Represents the photo submission workflow for work reports.
 */
export function OnbPhoto({ width = 280, height = 220 }: OnboardingIllustrationProps): React.JSX.Element {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 220">
      {/* Dotted ground line */}
      <Line x1={20} y1={198} x2={260} y2={198} stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="6 6" />

      {/* Report card (back layer with shadow offset) */}
      <G transform="translate(40 50) rotate(-4)">
        <Rect x={4} y={4} width={120} height={140} rx={6} fill={INK} />
        <Rect x={0} y={0} width={120} height={140} rx={6} fill={WHITE} stroke={INK} strokeWidth={3} />

        {/* Photo area */}
        <Rect x={10} y={10} width={100} height={60} rx={3} fill={GREEN} stroke={INK} strokeWidth={2.5} />

        {/* Tree placeholder in photo */}
        <Path d="M40 60 L40 50 Q40 40 50 40 L60 40 Q70 40 70 50 L70 60 Z" fill={SAGE} stroke={INK} strokeWidth={2} />
        <Rect x={52} y={60} width={6} height={6} fill={SECONDARY} stroke={INK} strokeWidth={1.5} />

        {/* Sun in corner */}
        <Circle cx={92} cy={20} r={6} fill={YELLOW} stroke={INK} strokeWidth={2} />

        {/* Text lines (light gray) */}
        <Line x1={10} y1={82} x2={80} y2={82} stroke={GRAY} strokeWidth={3} strokeLinecap="round" />
        <Line x1={10} y1={92} x2={100} y2={92} stroke={GRAY} strokeWidth={3} strokeLinecap="round" />
        <Line x1={10} y1={102} x2={70} y2={102} stroke={GRAY} strokeWidth={3} strokeLinecap="round" />

        {/* Status stamp */}
        <Rect x={10} y={116} width={50} height={14} rx={2} fill={SAGE} stroke={INK} strokeWidth={2} />
        <SvgText
          x={35}
          y={126}
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize={9}
          fontWeight="700"
          fill={INK}
        >
          SELESAI
        </SvgText>
      </G>

      {/* Camera (foreground) */}
      <G transform="translate(150 80)">
        {/* Body shadow */}
        <Rect x={4} y={14} width={100} height={74} rx={8} fill={INK} />

        {/* Body */}
        <Rect x={0} y={10} width={100} height={74} rx={8} fill={YELLOW} stroke={INK} strokeWidth={3} />

        {/* Top hump (flash) */}
        <Rect x={30} y={0} width={40} height={14} rx={3} fill={YELLOW} stroke={INK} strokeWidth={3} />

        {/* Lens outer */}
        <Circle cx={50} cy={48} r={22} fill={INK} />

        {/* Lens middle */}
        <Circle cx={50} cy={48} r={18} fill={SAGE} stroke={INK} strokeWidth={2.5} />

        {/* Lens inner */}
        <Circle cx={50} cy={48} r={9} fill={INK} />

        {/* Lens shine */}
        <Circle cx={46} cy={44} r={3} fill={WHITE} />

        {/* Flash bulb */}
        <Rect x={78} y={20} width={14} height={8} rx={2} fill={WHITE} stroke={INK} strokeWidth={2} />

        {/* Shutter button */}
        <Circle cx={84} cy={68} r={5} fill={DANGER} stroke={INK} strokeWidth={2} />
      </G>

      {/* Flash sparkle (lines) */}
      <G transform="translate(232 56)" stroke={INK} strokeWidth={2.5} strokeLinecap="round">
        <Line x1={0} y1={0} x2={0} y2={-14} />
        <Line x1={-10} y1={6} x2={-20} y2={6} />
        <Line x1={-8} y1={-6} x2={-16} y2={-14} />
      </G>
    </Svg>
  );
}

/**
 * OnbMonitor — Large map with grid, markers, park polygons, and stats card.
 * Represents real-time monitoring and dashboard overview of workers.
 */
export function OnbMonitor({ width = 280, height = 220 }: OnboardingIllustrationProps): React.JSX.Element {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 220">
      {/* Dotted ground line */}
      <Line x1={20} y1={198} x2={260} y2={198} stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="6 6" />

      {/* Big map plate */}
      <G transform="translate(30 30)">
        {/* Shadow */}
        <Rect x={4} y={4} width={220} height={150} rx={8} fill={INK} />

        {/* Map background */}
        <Rect x={0} y={0} width={220} height={150} rx={8} fill={MINT} stroke={INK} strokeWidth={3} />

        {/* Grid */}
        <G stroke={GREEN} strokeWidth={1.5}>
          <Line x1={0} y1={38} x2={220} y2={38} />
          <Line x1={0} y1={76} x2={220} y2={76} />
          <Line x1={0} y1={114} x2={220} y2={114} />
          <Line x1={55} y1={0} x2={55} y2={150} />
          <Line x1={110} y1={0} x2={110} y2={150} />
          <Line x1={165} y1={0} x2={165} y2={150} />
        </G>

        {/* Streets (white base + dashed overlay) */}
        <Path d="M0 76 L220 76" stroke={WHITE} strokeWidth={8} />
        <Path d="M0 76 L220 76" stroke={INK} strokeWidth={1.5} strokeDasharray="4 6" />
        <Path d="M110 0 L110 150" stroke={WHITE} strokeWidth={8} />
        <Path d="M110 0 L110 150" stroke={INK} strokeWidth={1.5} strokeDasharray="4 6" />

        {/* Park polygons (filled green areas) */}
        <Path d="M22 22 L74 30 L70 64 L18 56 Z" fill={SAGE} stroke={SUCCESS_DARK} strokeWidth={2} />
        <Path d="M138 90 L186 92 L188 132 L140 130 Z" fill={SAGE} stroke={SUCCESS_DARK} strokeWidth={2} />

        {/* Markers — RA (green) */}
        <G transform="translate(56 40)">
          <Circle r={14} fill={WHITE} stroke={SUCCESS_DARK} strokeWidth={4} />
          <SvgText y={4} textAnchor="middle" fontFamily="Space Grotesk" fontWeight="700" fontSize={11} fill={INK}>
            RA
          </SvgText>
        </G>

        {/* Markers — YS (green) */}
        <G transform="translate(150 110)">
          <Circle r={14} fill={WHITE} stroke={SUCCESS_DARK} strokeWidth={4} />
          <SvgText y={4} textAnchor="middle" fontFamily="Space Grotesk" fontWeight="700" fontSize={11} fill={INK}>
            YS
          </SvgText>
        </G>

        {/* Markers — DP (orange) */}
        <G transform="translate(90 96)">
          <Circle r={14} fill={WHITE} stroke={nbColors.plantDue} strokeWidth={4} />
          <SvgText y={4} textAnchor="middle" fontFamily="Space Grotesk" fontWeight="700" fontSize={11} fill={INK}>
            DP
          </SvgText>
        </G>

        {/* Markers — HM (purple) */}
        <G transform="translate(186 36)">
          <Circle r={14} fill={WHITE} stroke={nbColors.roleAdminData} strokeWidth={4} />
          <SvgText y={4} textAnchor="middle" fontFamily="Space Grotesk" fontWeight="700" fontSize={11} fill={INK}>
            HM
          </SvgText>
        </G>
      </G>

      {/* Stat card (bottom right, popping out) */}
      <G transform="translate(178 130)">
        {/* Shadow */}
        <Rect x={4} y={4} width={80} height={64} rx={6} fill={INK} />

        {/* Card body */}
        <Rect x={0} y={0} width={80} height={64} rx={6} fill={YELLOW} stroke={INK} strokeWidth={3} />

        {/* Label */}
        <SvgText x={10} y={20} fontFamily="JetBrains Mono" fontSize={8} fontWeight="700" fill={nbColors.gray700} letterSpacing={0.5}>
          AKTIF
        </SvgText>

        {/* Big number */}
        <SvgText x={10} y={46} fontFamily="Space Grotesk" fontSize={28} fontWeight="700" fill={INK}>
          28
        </SvgText>

        {/* Uptrend indicator */}
        <SvgText x={44} y={46} fontFamily="JetBrains Mono" fontSize={8} fontWeight="700" fill={SUCCESS_DARK}>
          ▲ 3
        </SvgText>
      </G>
    </Svg>
  );
}
