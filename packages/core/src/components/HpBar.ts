import React from 'react';

export interface HpBarProps {
  current: number;
  max: number;
  width?: number;
  height?: number;
  barColor?: string;
  bgColor?: string;
  bufferColor?: string;
  bufferValue?: number;
  showText?: boolean;
  label?: string;
}

export function HpBar(props: HpBarProps) {
  const {
    current, max, width = 200, height = 20,
    barColor = '#44cc44', bgColor = '#1a1a2e',
    bufferColor = '#ffcc0066', bufferValue,
    showText = true, label,
  } = props;

  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const bufPct = bufferValue !== undefined && max > 0 ? Math.max(0, Math.min(1, bufferValue / max)) : 0;
  const fillW = Math.round(width * pct);
  const bufW = Math.round(width * bufPct);

  return React.createElement('ui-view', {
    width, height, tint: bgColor,
  },
    bufferValue !== undefined ? React.createElement('ui-view', {
      width: bufW, height,
      tint: bufferColor,
      position: 'absolute', left: 0, top: 0,
    }) : null,
    React.createElement('ui-view', {
      width: fillW, height,
      tint: barColor,
      position: 'absolute', left: 0, top: 0,
    }),
    showText ? React.createElement('ui-text', {
      text: label ?? `${current}/${max}`,
      fontSize: Math.max(10, height - 6),
      color: '#ffffff',
      width, height,
      align: 'center',
      position: 'absolute', left: 0, top: 0,
    }) : null,
  );
}
