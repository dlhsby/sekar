/**
 * Empty-state illustrations — branded Neo-Brutalist SVGs ported from
 * specs/design-system/mockups/project/illustrations.html (#illo-*). Each renders at a square `size`
 * (default 120) and is consumed via NBEmptyState's `illustration` prop.
 *
 * Colors come from design tokens (no inline hex — ESLint `no-inline-hex-colors`).
 */

import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { nbColors, withAlpha } from '../../../constants/nbTokens';

const INK = nbColors.black;
const WHITE = nbColors.white;
const SAGE = nbColors.primary;
const YELLOW = nbColors.bgAccentYellow;
const LINE = nbColors.gray300;
const RED = nbColors.danger;
const FAINT = withAlpha(nbColors.primary, 0.5);

export interface EmptyIllustrationProps {
  size?: number;
}

const Frame = ({ size = 120, children }: EmptyIllustrationProps & { children: React.ReactNode }) => (
  <Svg width={size} height={size} viewBox="0 0 200 200">
    {children}
  </Svg>
);

export function IlloReports({ size }: EmptyIllustrationProps): React.JSX.Element {
  return (
    <Frame size={size}>
      <Rect x={46} y={46} width={100} height={130} rx={6} fill={INK} />
      <Rect x={42} y={42} width={100} height={130} rx={6} fill={WHITE} stroke={INK} strokeWidth={3} />
      <Rect x={74} y={28} width={36} height={22} rx={3} fill={YELLOW} stroke={INK} strokeWidth={3} />
      <Rect x={80} y={22} width={24} height={14} rx={2} fill={WHITE} stroke={INK} strokeWidth={2.5} />
      <Line x1={58} y1={78} x2={126} y2={78} stroke={LINE} strokeWidth={3} strokeLinecap="round" />
      <Line x1={58} y1={92} x2={110} y2={92} stroke={LINE} strokeWidth={3} strokeLinecap="round" />
      <Line x1={58} y1={106} x2={120} y2={106} stroke={LINE} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={148} cy={148} r={26} fill={SAGE} stroke={INK} strokeWidth={3} />
      <Path d="M137 148 L145 156 L160 140" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

export function IlloShifts({ size }: EmptyIllustrationProps): React.JSX.Element {
  return (
    <Frame size={size}>
      <Circle cx={98} cy={106} r={60} fill={INK} />
      <Circle cx={94} cy={102} r={60} fill={WHITE} stroke={INK} strokeWidth={3} />
      <Line x1={94} y1={46} x2={94} y2={56} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Line x1={94} y1={148} x2={94} y2={158} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Line x1={34} y1={102} x2={44} y2={102} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Line x1={144} y1={102} x2={154} y2={102} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Line x1={94} y1={102} x2={94} y2={68} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <Line x1={94} y1={102} x2={124} y2={116} stroke={SAGE} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={94} cy={102} r={5} fill={INK} />
      <Circle cx={150} cy={56} r={20} fill={YELLOW} stroke={INK} strokeWidth={3} />
      <Line x1={150} y1={46} x2={150} y2={66} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={140} y1={56} x2={160} y2={56} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
    </Frame>
  );
}

const CLOUD = 'M58 138 Q34 138 34 116 Q34 96 56 92 Q60 70 84 70 Q108 70 114 90 Q140 90 142 114 Q142 138 122 138 Z';

export function IlloOffline({ size }: EmptyIllustrationProps): React.JSX.Element {
  return (
    <Frame size={size}>
      <G x={4} y={4}>
        <Path d={CLOUD} fill={INK} />
      </G>
      <Path d={CLOUD} fill={WHITE} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <Line x1={58} y1={112} x2={68} y2={112} stroke={LINE} strokeWidth={3} strokeLinecap="round" />
      <Line x1={80} y1={112} x2={100} y2={112} stroke={LINE} strokeWidth={3} strokeLinecap="round" />
      <Line x1={112} y1={112} x2={124} y2={112} stroke={LINE} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={152} cy={148} r={24} fill={RED} stroke={INK} strokeWidth={3} />
      <Line x1={142} y1={138} x2={162} y2={158} stroke={WHITE} strokeWidth={4} strokeLinecap="round" />
      <Line x1={162} y1={138} x2={142} y2={158} stroke={WHITE} strokeWidth={4} strokeLinecap="round" />
    </Frame>
  );
}

const PIN_SHADOW = 'M100 184 Q56 130 56 92 Q56 56 100 56 Q144 56 144 92 Q144 130 100 184 Z';
const PIN = 'M100 180 Q56 126 56 88 Q56 52 100 52 Q144 52 144 88 Q144 126 100 180 Z';

export function IlloLocation({ size }: EmptyIllustrationProps): React.JSX.Element {
  return (
    <Frame size={size}>
      <G x={4} y={4}>
        <Path d={PIN_SHADOW} fill={INK} />
      </G>
      <Path d={PIN} fill={SAGE} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <Circle cx={100} cy={90} r={20} fill={WHITE} stroke={INK} strokeWidth={3} />
      <Line x1={91} y1={81} x2={109} y2={99} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={109} y1={81} x2={91} y2={99} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      <Ellipse cx={100} cy={186} rx={22} ry={5} fill={INK} opacity={0.25} />
    </Frame>
  );
}

export function IlloSearch({ size }: EmptyIllustrationProps): React.JSX.Element {
  return (
    <Frame size={size}>
      <Line x1={128} y1={130} x2={172} y2={174} stroke={INK} strokeWidth={14} strokeLinecap="round" />
      <Circle cx={92} cy={92} r={48} fill={INK} />
      <Circle cx={88} cy={88} r={48} fill={YELLOW} stroke={INK} strokeWidth={3} />
      <Circle cx={88} cy={88} r={22} fill="none" stroke={INK} strokeWidth={3} />
      <Line x1={68} y1={108} x2={108} y2={68} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Line x1={124} y1={126} x2={166} y2={168} stroke={WHITE} strokeWidth={14} strokeLinecap="round" />
      <Line x1={124} y1={126} x2={166} y2={168} stroke={INK} strokeWidth={3} strokeLinecap="round" />
    </Frame>
  );
}

export function IlloPersonnel({ size }: EmptyIllustrationProps): React.JSX.Element {
  return (
    <Frame size={size}>
      <G x={116} y={70}>
        <G x={4} y={4}>
          <Circle cx={0} cy={0} r={20} fill={INK} />
        </G>
        <Circle cx={0} cy={0} r={20} fill={FAINT} stroke={INK} strokeWidth={3} />
        <Path d="M-26 60 Q-26 32 0 32 Q26 32 26 60 Z" fill={FAINT} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      </G>
      <G x={78} y={90}>
        <G x={4} y={4}>
          <Circle cx={0} cy={0} r={22} fill={INK} />
        </G>
        <Circle cx={0} cy={0} r={22} fill={SAGE} stroke={INK} strokeWidth={3} />
        <Path d="M-30 68 Q-30 36 0 36 Q30 36 30 68 Z" fill={SAGE} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <Path d="M-18 -10 Q-18 -24 0 -24 Q18 -24 18 -10 L-18 -10 Z" fill={YELLOW} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <Line x1={-20} y1={-10} x2={20} y2={-10} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      </G>
      <Circle cx={158} cy={46} r={20} fill={RED} stroke={INK} strokeWidth={3} />
      <Line x1={146} y1={58} x2={170} y2={34} stroke={WHITE} strokeWidth={3.5} strokeLinecap="round" />
    </Frame>
  );
}

export const ILLUSTRATIONS = {
  'illo-reports': IlloReports,
  'illo-shifts': IlloShifts,
  'illo-offline': IlloOffline,
  'illo-location': IlloLocation,
  'illo-search': IlloSearch,
  'illo-personnel': IlloPersonnel,
} as const;

export type EmptyIllustrationKey = keyof typeof ILLUSTRATIONS;
