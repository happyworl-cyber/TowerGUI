import React from 'react';

export interface GameTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  titleColor?: string;
  description?: string;
  stats?: Array<{ label: string; value: string; color?: string }>;
  rarity?: string;
  width?: number;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa', uncommon: '#44cc44', rare: '#4488ff',
  epic: '#bb44ff', legendary: '#ff8800',
};

export function GameTooltip(props: GameTooltipProps) {
  const {
    visible, x, y, title, titleColor,
    description, stats, rarity, width = 260,
  } = props;

  if (!visible) return null;

  const tColor = titleColor ?? RARITY_COLORS[rarity ?? 'common'] ?? '#e0e1dd';
  const elements: React.ReactNode[] = [];

  // Title
  elements.push(
    React.createElement('ui-text', {
      key: 'title', text: title, fontSize: 16, color: tColor,
      width: width - 20, height: 24, bold: true,
    })
  );

  // Rarity label
  if (rarity) {
    elements.push(
      React.createElement('ui-text', {
        key: 'rarity', text: rarity.toUpperCase(), fontSize: 11,
        color: tColor, width: width - 20, height: 16,
      })
    );
  }

  // Divider
  if (stats || description) {
    elements.push(
      React.createElement('ui-view', {
        key: 'div1', width: width - 20, height: 1, tint: '#ffffff22',
      })
    );
  }

  // Stats
  if (stats) {
    for (const stat of stats) {
      elements.push(
        React.createElement('ui-view', {
          key: `stat-${stat.label}`,
          flexDirection: 'row', width: width - 20, height: 20,
        },
          React.createElement('ui-text', {
            text: stat.label, fontSize: 13, color: '#778da9',
            width: 120, height: 20,
          }),
          React.createElement('ui-text', {
            text: stat.value, fontSize: 13, color: stat.color ?? '#e0e1dd',
            width: width - 140, height: 20,
          })
        )
      );
    }
  }

  // Description
  if (description) {
    if (stats) {
      elements.push(
        React.createElement('ui-view', {
          key: 'div2', width: width - 20, height: 1, tint: '#ffffff22',
        })
      );
    }
    elements.push(
      React.createElement('ui-text', {
        key: 'desc', text: description, fontSize: 12, color: '#99aabb',
        width: width - 20, height: 40,
      })
    );
  }

  const contentH = elements.length * 22 + 16;

  return React.createElement('ui-view', {
    position: 'absolute', left: x, top: y,
    width, height: contentH,
    tint: '#0d1b2af0',
    flexDirection: 'column',
    padding: [8, 10, 8, 10],
    gap: 2,
    zIndex: 9500,
  }, ...elements);
}
