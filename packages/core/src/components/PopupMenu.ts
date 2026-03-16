import React, { useState, useCallback } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  children?: MenuItem[];
  divider?: boolean;
}

export interface PopupMenuProps {
  items: MenuItem[];
  x: number;
  y: number;
  visible: boolean;
  width?: number;
  itemHeight?: number;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function PopupMenu(props: PopupMenuProps) {
  const {
    items, x, y, visible, width = 200, itemHeight = 36,
    onSelect, onClose,
  } = props;

  const [subMenu, setSubMenu] = useState<{ items: MenuItem[]; x: number; y: number } | null>(null);

  if (!visible) return null;

  const totalHeight = items.reduce((h, item) => h + (item.divider ? 1 : itemHeight), 0) + 8;

  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.disabled) return;
    if (item.children && item.children.length > 0) {
      setSubMenu({ items: item.children, x: width - 4, y: 0 });
      return;
    }
    onSelect(item.id);
    onClose();
    setSubMenu(null);
  }, [onSelect, onClose, width]);

  const children: React.ReactNode[] = [];
  let yOff = 4;

  for (const item of items) {
    if (item.divider) {
      children.push(
        React.createElement('ui-view', {
          key: `div-${item.id}`,
          width: width - 16, height: 1,
          tint: '#ffffff22',
          position: 'absolute', left: 8, top: yOff,
        })
      );
      yOff += 1;
      continue;
    }

    const currentY = yOff;
    children.push(
      React.createElement('ui-view', {
        key: item.id,
        width: width - 8, height: itemHeight,
        position: 'absolute', left: 4, top: currentY,
        tint: item.disabled ? '#00000000' : '#00000000',
        flexDirection: 'row', alignItems: 'center', padding: [0, 8, 0, 12],
        onClick: () => handleItemClick(item),
        onPointerEnter: () => {
          if (item.children) setSubMenu({ items: item.children, x: width - 4, y: currentY });
        },
      },
        item.icon ? React.createElement('ui-text', {
          text: item.icon, fontSize: 14, color: '#aaaacc',
          width: 24, height: itemHeight,
          align: 'center',
        }) : null,
        React.createElement('ui-text', {
          text: item.label,
          fontSize: 14,
          color: item.disabled ? '#555566' : '#e0e1dd',
          width: width - 60, height: itemHeight,
        }),
        item.children ? React.createElement('ui-text', {
          text: '>', fontSize: 12, color: '#778da9',
          width: 20, height: itemHeight, align: 'center',
        }) : null,
      )
    );
    yOff += itemHeight;
  }

  // Sub-menu
  if (subMenu) {
    children.push(
      React.createElement(PopupMenu, {
        key: 'submenu',
        items: subMenu.items,
        x: subMenu.x, y: subMenu.y,
        visible: true,
        width, itemHeight,
        onSelect,
        onClose: () => { setSubMenu(null); onClose(); },
      })
    );
  }

  return React.createElement('ui-view', {
    position: 'absolute', left: x, top: y,
    width, height: totalHeight,
    tint: '#1a1a2eee',
    flexDirection: 'column',
    zIndex: 9000,
  }, ...children);
}
