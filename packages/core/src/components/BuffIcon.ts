import React from 'react';

export interface BuffIconProps {
  icon: string;
  remaining?: number;
  stacks?: number;
  size?: number;
  debuff?: boolean;
}

export function BuffIcon(props: BuffIconProps) {
  const { icon, remaining, stacks, size = 40, debuff = false } = props;
  const borderColor = debuff ? '#ff4444' : '#44cc44';

  return React.createElement('ui-view', {
    width: size, height: size,
    tint: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center',
  },
    React.createElement('ui-text', {
      text: icon, fontSize: Math.round(size * 0.45),
      color: '#ffffff',
      width: size, height: Math.round(size * 0.65), align: 'center',
    }),
    remaining !== undefined ? React.createElement('ui-text', {
      text: `${Math.ceil(remaining)}`,
      fontSize: 9, color: '#ffcc00',
      width: size, height: 12,
      position: 'absolute', bottom: 1, left: 0, align: 'center',
    }) : null,
    stacks !== undefined && stacks > 1 ? React.createElement('ui-text', {
      text: `${stacks}`,
      fontSize: 10, color: '#ffffff', bold: true,
      width: 16, height: 14,
      position: 'absolute', right: 0, bottom: 0, align: 'center',
    }) : null,
    React.createElement('ui-view', {
      width: size, height: 2, tint: borderColor,
      position: 'absolute', bottom: 0, left: 0,
    })
  );
}
