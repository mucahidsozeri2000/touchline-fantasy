import React from "react";
import Svg, { Path, Circle, Polyline, Rect } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function Stroke({ size = 20, color = "currentColor", strokeWidth = 2, children }: React.PropsWithChildren<IconProps>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Stroke {...p}>
      <Path d="M9 18l6-6-6-6" />
    </Stroke>
  );
}

export function BackIcon(p: IconProps) {
  return (
    <Stroke {...p}>
      <Path d="M19 12H5" />
      <Path d="m12 19-7-7 7-7" />
    </Stroke>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Stroke {...p} strokeWidth={p.strokeWidth ?? 1.5}>
      <Circle cx={12} cy={12} r={10} />
      <Polyline points="12 6 12 12 16 14" />
    </Stroke>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Stroke {...p} strokeWidth={p.strokeWidth ?? 2.5}>
      <Polyline points="20 6 9 17 4 12" />
    </Stroke>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <Stroke {...p} strokeWidth={p.strokeWidth ?? 2.5}>
      <Path d="M5 12h14" />
      <Path d="M12 5v14" />
    </Stroke>
  );
}

export function LockIcon(p: IconProps) {
  return (
    <Stroke {...p}>
      <Rect width={18} height={11} x={3} y={11} rx={2} ry={2} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Stroke>
  );
}

export function TrendUpIcon(p: IconProps) {
  return (
    <Stroke {...p} strokeWidth={p.strokeWidth ?? 2.5}>
      <Path d="M7 7h10v10" />
      <Path d="M7 17 17 7" />
    </Stroke>
  );
}

export function HomeIcon(p: IconProps) {
  return (
    <Stroke {...p}>
      <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </Stroke>
  );
}

export function SquadTabIcon(p: IconProps) {
  return (
    <Stroke {...p}>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={4} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Stroke>
  );
}

export function TransfersTabIcon(p: IconProps) {
  return (
    <Stroke {...p}>
      <Path d="m17 2 4 4-4 4" />
      <Path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <Path d="m7 22-4-4 4-4" />
      <Path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Stroke>
  );
}

export function LeaguesTabIcon(p: IconProps) {
  return (
    <Stroke {...p}>
      <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <Path d="M4 22h16" />
      <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <Path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </Stroke>
  );
}

export function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.86c2.26-2.08 3.59-5.16 3.59-8.81z" />
      <Path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.86-3.01c-1.07.72-2.45 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.97H1.24v3.11C3.2 21.3 7.26 24 12 24z" />
      <Path fill="#FBBC05" d="M5.25 14.25a7.19 7.19 0 0 1 0-4.5V6.64H1.24a11.98 11.98 0 0 0 0 10.72l4.01-3.11z" />
      <Path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.26 0 3.2 2.7 1.24 6.64l4.01 3.11C6.2 6.9 8.86 4.75 12 4.75z" />
    </Svg>
  );
}
