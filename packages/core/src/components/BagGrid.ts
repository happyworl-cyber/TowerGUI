import React, { useCallback } from 'react';

export interface BagGridItem {
  id: string;
  icon: string;
  count: number;
  rarity?: string;
  name?: string;
}

export interface BagGridProps {
  items: (BagGridItem | null)[];
  cols: number;
  rows: number;
  slotSize?: number;
  gap?: number;
  selectedId?: string;
  onSelect?: (item: BagGridItem) => void;
  onRightClick?: (item: BagGridItem, slotIdx: number) => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa', uncommon: '#44cc44', rare: '#4488ff',
  epic: '#bb44ff', legendary: '#ff8800',
};

export function BagGrid(props: BagGridProps) {
  const { items, cols, rows, slotSize = 80, gap = 4, selectedId, onSelect, onRightClick } = props;

  const totalSlots = cols * rows;
  const gridW = cols * slotSize + (cols - 1) * gap;

  const rowElements: React.ReactNode[] = [];

  for (let r = 0; r < rows; r++) {
    const slotElements: React.ReactNode[] = [];
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const item = idx < items.length ? items[idx] : null;
      const isSelected = item && item.id === selectedId;
      const rarityColor = item ? (RARITY_COLORS[item.rarity ?? 'common'] ?? '#aaaaaa') : '#222233';

      slotElements.push(
        React.createElement('ui-view', {
          key: `s${idx}`,
          width: slotSize, height: slotSize,
          tint: isSelected ? '#2a2a4a' : '#1a1a2e',
          alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          onClick: item ? () => onSelect?.(item) : undefined,
        },
          item ? React.createElement('ui-text', {
            text: item.icon, fontSize: Math.round(slotSize * 0.32),
            color: rarityColor,
            width: slotSize, height: Math.round(slotSize * 0.55),
            align: 'center', bold: true,
          }) : null,
          item && item.count > 1 ? React.createElement('ui-text', {
            text: `x${item.count}`, fontSize: 11, color: '#cccccc',
            width: slotSize, height: 16, align: 'center',
          }) : null,
          React.createElement('ui-view', {
            width: slotSize, height: 3, tint: rarityColor,
            position: 'absolute', bottom: 0, left: 0,
          })
        )
      );
    }

    rowElements.push(
      React.createElement('ui-view', {
        key: `r${r}`, flexDirection: 'row', gap, width: gridW, height: slotSize,
      }, ...slotElements)
    );
  }

  return React.createElement('ui-view', {
    width: gridW, flexDirection: 'column', gap,
    height: rows * slotSize + (rows - 1) * gap,
  }, ...rowElements);
}
