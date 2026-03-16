/**
 * Pure-JS Flexbox layout engine for game UI.
 * Covers the core subset needed for 95% of game UI layouts:
 * - flexDirection (row / column / row-reverse / column-reverse)
 * - justifyContent (flex-start / center / flex-end / space-between / space-around / space-evenly)
 * - alignItems / alignSelf (flex-start / center / flex-end / stretch)
 * - width / height / minWidth / minHeight / maxWidth / maxHeight (supports percentage strings like '50%')
 * - padding / margin / gap
 * - flexGrow / flexShrink / flexBasis
 * - position: absolute / relative
 * - overflow (for clipping info, not layout)
 *
 * NOTE: flexWrap and alignContent are declared in FlexStyle for future compatibility
 *       but are NOT yet implemented. Setting them will log a warning.
 */

let _wrapWarned = false;

export type FlexSize = number | `${number}%`;

export interface FlexStyle {
  width?: FlexSize;
  height?: FlexSize;
  minWidth?: FlexSize;
  minHeight?: FlexSize;
  maxWidth?: FlexSize;
  maxHeight?: FlexSize;

  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  alignSelf?: 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch';
  alignContent?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'space-between' | 'space-around';

  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;

  gap?: number;
  rowGap?: number;
  columnGap?: number;

  position?: 'relative' | 'absolute';
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;

  aspectRatio?: number;
  overflow?: 'visible' | 'hidden' | 'scroll';
  display?: 'flex' | 'none';
}

export interface LayoutResult {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class FlexNode {
  style: FlexStyle = {};
  children: FlexNode[] = [];
  parent: FlexNode | null = null;
  layout: LayoutResult = { left: 0, top: 0, width: 0, height: 0 };
  dirty = true;
  tag: any = null;

  addChild(child: FlexNode, index?: number): void {
    if (child === this) return;
    if (child.parent) child.parent.removeChild(child);
    child.parent = this;
    if (index !== undefined && index < this.children.length) {
      this.children.splice(index, 0, child);
    } else {
      this.children.push(child);
    }
    this.markDirty();
  }

  removeChild(child: FlexNode): void {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parent = null;
      this.markDirty();
    }
  }

  insertBefore(child: FlexNode, before: FlexNode): void {
    const idx = this.children.indexOf(before);
    this.addChild(child, idx >= 0 ? idx : undefined);
  }

  markDirty(): void {
    this.dirty = true;
    if (this.parent) this.parent.markDirty();
  }

  setStyle(style: Partial<FlexStyle>): void {
    Object.assign(this.style, style);
    this.markDirty();
  }

  calculateLayout(availW: number, availH: number): void {
    computeLayout(this, availW, availH);
  }
}

function clamp(val: number, min: number | undefined, max: number | undefined): number {
  if (min !== undefined && val < min) val = min;
  if (max !== undefined && val > max) val = max;
  return val;
}

function resolvePct(value: FlexSize | undefined, base: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.endsWith('%')) {
    const pct = parseFloat(value);
    if (Number.isFinite(pct)) return (pct / 100) * base;
  }
  return undefined;
}

function resolveSize(
  explicit: FlexSize | undefined,
  min: FlexSize | undefined,
  max: FlexSize | undefined,
  fallback: number,
  parentSize: number,
): number {
  const base = resolvePct(explicit, parentSize) ?? fallback;
  const lo = resolvePct(min, parentSize);
  const hi = resolvePct(max, parentSize);
  return clamp(base, lo, hi);
}

function isRow(dir: string | undefined): boolean {
  return dir === 'row' || dir === 'row-reverse';
}

function isReverse(dir: string | undefined): boolean {
  return dir === 'row-reverse' || dir === 'column-reverse';
}

function mainGap(style: FlexStyle): number {
  const dir = style.flexDirection ?? 'column';
  if (isRow(dir)) return style.columnGap ?? style.gap ?? 0;
  return style.rowGap ?? style.gap ?? 0;
}

function crossGap(style: FlexStyle): number {
  const dir = style.flexDirection ?? 'column';
  if (isRow(dir)) return style.rowGap ?? style.gap ?? 0;
  return style.columnGap ?? style.gap ?? 0;
}

function computeLayout(node: FlexNode, availW: number, availH: number): void {
  const s = node.style;

  if (s.display === 'none') {
    node.layout = { left: 0, top: 0, width: 0, height: 0 };
    return;
  }

  const pT = s.paddingTop ?? 0;
  const pR = s.paddingRight ?? 0;
  const pB = s.paddingBottom ?? 0;
  const pL = s.paddingLeft ?? 0;

  let nodeW = resolveSize(s.width, s.minWidth, s.maxWidth, availW, availW);
  let nodeH = resolveSize(s.height, s.minHeight, s.maxHeight, availH, availH);

  if (s.aspectRatio !== undefined && s.aspectRatio > 0) {
    if (s.width !== undefined && s.height === undefined) {
      nodeH = clamp(nodeW / s.aspectRatio, resolvePct(s.minHeight, availH), resolvePct(s.maxHeight, availH));
    } else if (s.height !== undefined && s.width === undefined) {
      nodeW = clamp(nodeH * s.aspectRatio, resolvePct(s.minWidth, availW), resolvePct(s.maxWidth, availW));
    }
  }

  node.layout.width = nodeW;
  node.layout.height = nodeH;

  const innerW = nodeW - pL - pR;
  const innerH = nodeH - pT - pB;

  if (s.flexWrap && s.flexWrap !== 'nowrap' && !_wrapWarned) {
    _wrapWarned = true;
    if (typeof console !== 'undefined') console.warn('[FlexLayout] flexWrap is not yet implemented; children will render in a single line.');
  }

  const dir = s.flexDirection ?? 'column';
  const row = isRow(dir);
  const reverse = isReverse(dir);
  const mainSize = row ? innerW : innerH;
  const crossSize = row ? innerH : innerW;
  const gap = mainGap(s);

  const relChildren: FlexNode[] = [];
  const absChildren: FlexNode[] = [];

  for (const child of node.children) {
    if (child.style.display === 'none') continue;
    if (child.style.position === 'absolute') {
      absChildren.push(child);
    } else {
      relChildren.push(child);
    }
  }

  const totalGap = relChildren.length > 1 ? gap * (relChildren.length - 1) : 0;
  let usedMain = totalGap;

  interface ChildMeasure {
    node: FlexNode;
    mainBase: number;
    crossBase: number;
    grow: number;
    shrink: number;
  }

  const measures: ChildMeasure[] = [];

  for (const child of relChildren) {
    const cs = child.style;
    const mT = cs.marginTop ?? 0;
    const mR = cs.marginRight ?? 0;
    const mB = cs.marginBottom ?? 0;
    const mL = cs.marginLeft ?? 0;

    let grow = cs.flexGrow ?? 0;
    let shrink = cs.flexShrink ?? 1;
    if (cs.flex !== undefined) {
      if (cs.flex > 0) { grow = cs.flex; shrink = 1; }
      else if (cs.flex === 0) { grow = 0; shrink = 0; }
    }

    let childMainBase: number;
    let childCrossBase: number;

    if (row) {
      const basisRaw = cs.flexBasis ?? cs.width;
      const basis = resolvePct(basisRaw, innerW);
      childMainBase = (basis ?? 0) + mL + mR;
      const crossExplicit = resolvePct(cs.height, innerH);
      childCrossBase = (crossExplicit ?? 0) + mT + mB;
    } else {
      const basisRaw = cs.flexBasis ?? cs.height;
      const basis = resolvePct(basisRaw, innerH);
      childMainBase = (basis ?? 0) + mT + mB;
      const crossExplicit = resolvePct(cs.width, innerW);
      childCrossBase = (crossExplicit ?? 0) + mL + mR;
    }

    usedMain += childMainBase;
    measures.push({ node: child, mainBase: childMainBase, crossBase: childCrossBase, grow, shrink });
  }

  const freeSpace = mainSize - usedMain;

  if (freeSpace > 0) {
    const totalGrow = measures.reduce((sum, m) => sum + m.grow, 0);
    if (totalGrow > 0) {
      for (const m of measures) {
        m.mainBase += (m.grow / totalGrow) * freeSpace;
      }
    }
  } else if (freeSpace < 0) {
    const totalShrink = measures.reduce((sum, m) => sum + m.shrink * m.mainBase, 0);
    if (totalShrink > 0) {
      for (const m of measures) {
        const ratio = (m.shrink * m.mainBase) / totalShrink;
        m.mainBase += ratio * freeSpace;
        if (m.mainBase < 0) m.mainBase = 0;
      }
    }
  }

  for (const m of measures) {
    const cs = m.node.style;
    const mT = cs.marginTop ?? 0;
    const mR = cs.marginRight ?? 0;
    const mB = cs.marginBottom ?? 0;
    const mL = cs.marginLeft ?? 0;

    let childW: number, childH: number;

    if (row) {
      childW = m.mainBase - mL - mR;
      const alignSelf = cs.alignSelf ?? 'auto';
      const align = alignSelf === 'auto' ? (s.alignItems ?? 'stretch') : alignSelf;
      childH = align === 'stretch' && cs.height === undefined
        ? crossSize - mT - mB
        : (resolvePct(cs.height, innerH) ?? m.crossBase - mT - mB);
    } else {
      childH = m.mainBase - mT - mB;
      const alignSelf = cs.alignSelf ?? 'auto';
      const align = alignSelf === 'auto' ? (s.alignItems ?? 'stretch') : alignSelf;
      childW = align === 'stretch' && cs.width === undefined
        ? crossSize - mL - mR
        : (resolvePct(cs.width, innerW) ?? m.crossBase - mL - mR);
    }

    childW = clamp(Math.max(0, childW), resolvePct(cs.minWidth, innerW), resolvePct(cs.maxWidth, innerW));
    childH = clamp(Math.max(0, childH), resolvePct(cs.minHeight, innerH), resolvePct(cs.maxHeight, innerH));

    computeLayout(m.node, childW, childH);
  }

  // --- Main-axis positioning ---
  const actualUsed = measures.reduce((sum, m) => sum + m.mainBase, 0) + totalGap;
  const remainMain = mainSize - actualUsed;
  const justify = s.justifyContent ?? 'flex-start';

  let mainPos = 0;
  let mainStep = 0;

  switch (justify) {
    case 'flex-start': mainPos = 0; break;
    case 'flex-end': mainPos = remainMain; break;
    case 'center': mainPos = remainMain / 2; break;
    case 'space-between':
      mainPos = 0;
      mainStep = relChildren.length > 1 ? remainMain / (relChildren.length - 1) : 0;
      break;
    case 'space-around':
      mainStep = relChildren.length > 0 ? remainMain / relChildren.length : 0;
      mainPos = mainStep / 2;
      break;
    case 'space-evenly':
      mainStep = relChildren.length > 0 ? remainMain / (relChildren.length + 1) : 0;
      mainPos = mainStep;
      break;
  }

  const order = reverse ? [...measures].reverse() : measures;

  for (let i = 0; i < order.length; i++) {
    const m = order[i];
    const cs = m.node.style;
    const mT = cs.marginTop ?? 0;
    const mR = cs.marginRight ?? 0;
    const mB = cs.marginBottom ?? 0;
    const mL = cs.marginLeft ?? 0;

    const alignSelf = cs.alignSelf ?? 'auto';
    const align = alignSelf === 'auto' ? (s.alignItems ?? 'stretch') : alignSelf;

    const childMainActual = m.mainBase;
    const childCrossActual = row
      ? m.node.layout.height + mT + mB
      : m.node.layout.width + mL + mR;

    let crossPos: number;
    switch (align) {
      case 'flex-start': crossPos = 0; break;
      case 'flex-end': crossPos = crossSize - childCrossActual; break;
      case 'center': crossPos = (crossSize - childCrossActual) / 2; break;
      case 'stretch': crossPos = 0; break;
      default: crossPos = 0;
    }

    if (row) {
      m.node.layout.left = pL + mainPos + mL;
      m.node.layout.top = pT + crossPos + mT;
    } else {
      m.node.layout.left = pL + crossPos + mL;
      m.node.layout.top = pT + mainPos + mT;
    }

    mainPos += childMainActual + gap + mainStep;
  }

  // --- Absolute children ---
  for (const child of absChildren) {
    const cs = child.style;
    const mT = cs.marginTop ?? 0;
    const mR = cs.marginRight ?? 0;
    const mB = cs.marginBottom ?? 0;
    const mL = cs.marginLeft ?? 0;

    let childW = resolvePct(cs.width, innerW) ?? innerW - mL - mR;
    let childH = resolvePct(cs.height, innerH) ?? innerH - mT - mB;

    if (cs.left !== undefined && cs.right !== undefined && cs.width === undefined) {
      childW = innerW - cs.left - cs.right - mL - mR;
    }
    if (cs.top !== undefined && cs.bottom !== undefined && cs.height === undefined) {
      childH = innerH - cs.top - cs.bottom - mT - mB;
    }

    childW = clamp(Math.max(0, childW), resolvePct(cs.minWidth, innerW), resolvePct(cs.maxWidth, innerW));
    childH = clamp(Math.max(0, childH), resolvePct(cs.minHeight, innerH), resolvePct(cs.maxHeight, innerH));

    computeLayout(child, childW, childH);

    let x: number, y: number;
    if (cs.left !== undefined) {
      x = pL + cs.left + mL;
    } else if (cs.right !== undefined) {
      x = nodeW - pR - cs.right - mR - child.layout.width;
    } else {
      x = pL + mL;
    }

    if (cs.top !== undefined) {
      y = pT + cs.top + mT;
    } else if (cs.bottom !== undefined) {
      y = nodeH - pB - cs.bottom - mB - child.layout.height;
    } else {
      y = pT + mT;
    }

    child.layout.left = x;
    child.layout.top = y;
  }

  node.dirty = false;
}
