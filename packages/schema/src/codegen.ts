import type { UINode } from './validator';

/**
 * Convert a validated UI JSON tree to formatted TSX source code.
 */
export function jsonToTSX(node: UINode, componentName: string = 'GeneratedUI'): string {
  const imports = collectImports(node);
  const coreImports = imports.filter(i => i.startsWith('ui-'));
  const hookImports = imports.filter(i => !i.startsWith('ui-'));

  let code = `import React from 'react';\n`;
  if (hookImports.length > 0) {
    code += `import { ${hookImports.join(', ')} } from 'react';\n`;
  }
  code += `\n`;
  code += `export function ${componentName}() {\n`;
  code += `  return (\n`;
  code += renderNode(node, 4);
  code += `  );\n`;
  code += `}\n`;

  return code;
}

function renderNode(node: UINode, indent: number): string {
  const pad = ' '.repeat(indent);
  const tag = node.type;
  const props = node.props ?? {};
  const children = node.children ?? [];

  let result = `${pad}<${tag}`;

  const propEntries = Object.entries(props).filter(([k]) => k !== 'children');
  for (const [key, value] of propEntries) {
    if (typeof value === 'function') continue; // skip callbacks in codegen
    result += ` ${formatProp(key, value)}`;
  }

  if (children.length === 0) {
    result += ` />\n`;
    return result;
  }

  result += `>\n`;
  for (const child of children) {
    if (typeof child === 'string') {
      result += `${pad}  {${JSON.stringify(child)}}\n`;
    } else {
      result += renderNode(child, indent + 2);
    }
  }
  result += `${pad}</${tag}>\n`;

  return result;
}

function formatProp(key: string, value: any): string {
  if (typeof value === 'string') return `${key}="${value}"`;
  if (typeof value === 'boolean') return value ? key : `${key}={false}`;
  if (typeof value === 'number') return `${key}={${value}}`;
  if (Array.isArray(value)) return `${key}={${JSON.stringify(value)}}`;
  return `${key}={${JSON.stringify(value)}}`;
}

function collectImports(node: UINode): string[] {
  const set = new Set<string>();
  walkNode(node, set);
  return Array.from(set);
}

function walkNode(node: UINode, set: Set<string>): void {
  set.add(node.type);
  if (node.children) {
    for (const child of node.children) {
      if (typeof child === 'object') walkNode(child, set);
    }
  }
}

/**
 * Parse a simplified TSX-like string back to UINode tree.
 * (For AI round-trip: JSON → TSX → JSON)
 */
export function tsxToJSON(tsx: string): UINode | null {
  // Lightweight regex-based parser for simple structures
  const tagMatch = tsx.match(/<(\S+?)(\s[^>]*)?\/?>/);
  if (!tagMatch) return null;

  const type = tagMatch[1];
  const propsStr = tagMatch[2] ?? '';
  const props: Record<string, any> = {};

  // Parse props
  const propRegex = /(\w+)=(?:"([^"]*)"|\{([^}]*)\})/g;
  let m: RegExpExecArray | null;
  while ((m = propRegex.exec(propsStr)) !== null) {
    const key = m[1];
    if (m[2] !== undefined) {
      props[key] = m[2];
    } else if (m[3] !== undefined) {
      try { props[key] = JSON.parse(m[3]); } catch { props[key] = m[3]; }
    }
  }

  return { type, props, children: [] };
}
