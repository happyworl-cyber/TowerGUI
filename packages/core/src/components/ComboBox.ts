import React, { useState, useCallback } from 'react';

export interface ComboBoxOption {
  value: string;
  label: string;
  icon?: string;
}

export interface ComboBoxProps {
  options: ComboBoxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: number;
  height?: number;
  dropdownMaxHeight?: number;
  searchable?: boolean;
}

export function ComboBox(props: ComboBoxProps) {
  const {
    options, value, onChange, placeholder = 'Select...',
    width = 200, height = 40, dropdownMaxHeight = 200,
    searchable = false,
  } = props;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find(o => o.value === value);
  const filtered = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const itemH = 36;
  const dropH = Math.min(filtered.length * itemH + 8, dropdownMaxHeight);

  const elements: React.ReactNode[] = [];

  // Main button
  elements.push(
    React.createElement('ui-view', {
      key: 'combo-main',
      width, height,
      tint: '#1a1a2e',
      flexDirection: 'row', alignItems: 'center',
      padding: [0, 8, 0, 12],
      onClick: () => setOpen(!open),
    },
      React.createElement('ui-text', {
        text: selected?.label ?? placeholder,
        fontSize: 14,
        color: selected ? '#e0e1dd' : '#556677',
        width: width - 40, height,
      }),
      React.createElement('ui-text', {
        text: open ? '^' : 'v',
        fontSize: 12, color: '#778da9',
        width: 20, height, align: 'center',
      })
    )
  );

  // Dropdown
  if (open) {
    const dropItems: React.ReactNode[] = [];

    if (searchable) {
      dropItems.push(
        React.createElement('ui-input', {
          key: 'search',
          width: width - 16, height: 32,
          placeholder: 'Search...',
          value: search,
          onChange: (v: string) => setSearch(v),
        })
      );
    }

    filtered.forEach((opt, i) => {
      const isSelected = opt.value === value;
      dropItems.push(
        React.createElement('ui-view', {
          key: opt.value,
          width: width - 8, height: itemH,
          tint: isSelected ? '#334466' : '#00000000',
          flexDirection: 'row', alignItems: 'center',
          padding: [0, 8, 0, 12],
          onClick: () => handleSelect(opt.value),
        },
          opt.icon ? React.createElement('ui-text', {
            text: opt.icon, fontSize: 14, color: '#aaaacc',
            width: 24, height: itemH, align: 'center',
          }) : null,
          React.createElement('ui-text', {
            text: opt.label, fontSize: 14,
            color: isSelected ? '#4cc9f0' : '#e0e1dd',
            width: width - 60, height: itemH,
          })
        )
      );
    });

    elements.push(
      React.createElement('ui-view', {
        key: 'dropdown',
        position: 'absolute', left: 0, top: height + 2,
        width, height: dropH,
        tint: '#1a1a2eee',
        flexDirection: 'column',
        padding: 4,
        zIndex: 8000,
      }, ...dropItems)
    );
  }

  return React.createElement('ui-view', {
    width, height: open ? height + dropH + 2 : height,
  }, ...elements);
}
