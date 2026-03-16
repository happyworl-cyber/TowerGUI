import React from 'react';
import type { ControllerState } from '../controller';

export interface TabBarProps {
  controller: ControllerState;
  width?: number;
  height?: number;
  activeColor?: string;
  inactiveColor?: string;
  activeBg?: string;
  inactiveBg?: string;
  fontSize?: number;
}

export function TabBar(props: TabBarProps) {
  const {
    controller, width = 500, height = 40,
    activeColor = '#4cc9f0', inactiveColor = '#778da9',
    activeBg = '#334466', inactiveBg = '#1a1a2e',
    fontSize = 16,
  } = props;

  if (controller.pages.length === 0) {
    return React.createElement('ui-view', { width, height });
  }
  const tabW = Math.floor((width - (controller.pages.length - 1) * 4) / controller.pages.length);

  const tabs = controller.pages.map((name: string, i: number) => {
    const active = controller.index === i;
    return React.createElement('ui-view', {
      key: name,
      width: tabW, height,
      tint: active ? activeBg : inactiveBg,
      alignItems: 'center', justifyContent: 'center',
      onClick: () => controller.setPage(i),
    },
      React.createElement('ui-text', {
        text: name, fontSize,
        color: active ? activeColor : inactiveColor,
        width: tabW, height, align: 'center',
        bold: active,
      })
    );
  });

  return React.createElement('ui-view', {
    flexDirection: 'row', gap: 4, width, height,
  }, ...tabs);
}
