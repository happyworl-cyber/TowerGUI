import React from 'react';

export interface DamageNumberProps {
  value: number;
  x: number;
  y: number;
  critical?: boolean;
  heal?: boolean;
  fontSize?: number;
  opacity?: number;
}

export function DamageNumber(props: DamageNumberProps) {
  const {
    value, x, y,
    critical = false, heal = false,
    fontSize = critical ? 32 : 22,
    opacity = 1,
  } = props;

  const color = heal ? '#44ff44' : (critical ? '#ff4444' : '#ffffff');
  const prefix = heal ? '+' : '-';
  const text = critical ? `${prefix}${value}!` : `${prefix}${value}`;

  return React.createElement('ui-text', {
    text,
    fontSize,
    color,
    bold: critical,
    width: 120, height: fontSize + 8,
    align: 'center',
    position: 'absolute', left: x - 60, top: y,
    opacity,
  });
}
