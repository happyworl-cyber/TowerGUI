import React, { useState, useCallback } from 'react';

export interface TreeNode {
  id: string;
  label: string;
  icon?: string;
  children?: TreeNode[];
}

export interface TreeViewProps {
  nodes: TreeNode[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  width?: number;
  itemHeight?: number;
  indentSize?: number;
}

export function TreeView(props: TreeViewProps) {
  const { nodes, selectedId, onSelect, width = 300, itemHeight = 32, indentSize = 20 } = props;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  function renderNodes(nodeList: TreeNode[], depth: number): React.ReactNode[] {
    const elements: React.ReactNode[] = [];

    for (const node of nodeList) {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expanded.has(node.id);
      const isSelected = node.id === selectedId;
      const indent = depth * indentSize;

      elements.push(
        React.createElement('ui-view', {
          key: node.id,
          width, height: itemHeight,
          tint: isSelected ? '#334466' : '#00000000',
          flexDirection: 'row', alignItems: 'center',
          padding: [0, 4, 0, indent + 4],
          onClick: () => {
            if (hasChildren) toggleExpand(node.id);
            onSelect?.(node.id);
          },
        },
          hasChildren ? React.createElement('ui-text', {
            text: isExpanded ? 'v' : '>',
            fontSize: 12, color: '#778da9',
            width: 18, height: itemHeight, align: 'center',
          }) : React.createElement('ui-view', { width: 18, height: itemHeight }),
          node.icon ? React.createElement('ui-text', {
            text: node.icon, fontSize: 14, color: '#aaaacc',
            width: 22, height: itemHeight, align: 'center',
          }) : null,
          React.createElement('ui-text', {
            text: node.label,
            fontSize: 14,
            color: isSelected ? '#4cc9f0' : '#e0e1dd',
            width: width - indent - 50, height: itemHeight,
          })
        )
      );

      if (hasChildren && isExpanded) {
        elements.push(...renderNodes(node.children!, depth + 1));
      }
    }
    return elements;
  }

  const renderedNodes = renderNodes(nodes, 0);
  const totalH = renderedNodes.length * itemHeight;

  return React.createElement('ui-view', {
    width, height: totalH,
    flexDirection: 'column',
  }, ...renderedNodes);
}
