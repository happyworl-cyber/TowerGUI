import { FlexNode } from './FlexLayout';
import type { FlexStyle } from './FlexLayout';
import type { EngineNode } from './types';
import type { IEngineAdapter } from './IEngineAdapter';

const LAYOUT_PROPS = new Set([
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'flexDirection', 'flexWrap',
  'justifyContent', 'alignItems', 'alignSelf', 'alignContent',
  'padding', 'margin', 'gap', 'rowGap', 'columnGap',
  'position', 'top', 'left', 'right', 'bottom',
  'overflow', 'aspectRatio',
]);

export function isLayoutProp(key: string): boolean {
  return LAYOUT_PROPS.has(key);
}

export class LayoutManager {
  private adapter: IEngineAdapter;
  private nodeMap = new Map<EngineNode, FlexNode>();
  private rootFlex: FlexNode;
  private rootWidth: number;
  private rootHeight: number;
  private dirty = false;

  constructor(adapter: IEngineAdapter, width: number, height: number) {
    this.adapter = adapter;
    this.rootWidth = width;
    this.rootHeight = height;

    this.rootFlex = new FlexNode();
    this.rootFlex.setStyle({ width, height, flexDirection: 'column' });

    const rootContainer = adapter.getRootContainer();
    this.nodeMap.set(rootContainer, this.rootFlex);
  }

  createNode(engineNode: EngineNode): void {
    const flex = new FlexNode();
    flex.tag = engineNode;
    this.nodeMap.set(engineNode, flex);
  }

  removeNode(engineNode: EngineNode): void {
    const flex = this.nodeMap.get(engineNode);
    if (!flex) return;
    if (flex.parent) flex.parent.removeChild(flex);
    this.nodeMap.delete(engineNode);
    this.dirty = true;
  }

  appendChild(parent: EngineNode, child: EngineNode): void {
    const pf = this.nodeMap.get(parent);
    const cf = this.nodeMap.get(child);
    if (!pf || !cf) return;
    pf.addChild(cf);
    this.dirty = true;
  }

  insertBefore(parent: EngineNode, child: EngineNode, before: EngineNode): void {
    const pf = this.nodeMap.get(parent);
    const cf = this.nodeMap.get(child);
    const bf = this.nodeMap.get(before);
    if (!pf || !cf || !bf) return;
    pf.insertBefore(cf, bf);
    this.dirty = true;
  }

  applyStyle(engineNode: EngineNode, props: Record<string, any>): void {
    const flex = this.nodeMap.get(engineNode);
    if (!flex) return;
    const style = propsToFlexStyle(props);
    flex.setStyle(style);
    this.dirty = true;
  }

  markDirty(): void {
    this.dirty = true;
  }

  computeAndApply(): void {
    if (!this.dirty) return;
    this.dirty = false;

    this.rootFlex.calculateLayout(this.rootWidth, this.rootHeight);
    this.applyRecursive(this.rootFlex, true);
  }

  setRootSize(width: number, height: number): void {
    this.rootWidth = width;
    this.rootHeight = height;
    this.rootFlex.setStyle({ width, height });
    this.dirty = true;
  }

  dispose(): void {
    this.nodeMap.clear();
  }

  private applyRecursive(flex: FlexNode, isRoot: boolean): void {
    if (!isRoot) {
      const engineNode = flex.tag;
      if (engineNode && this.adapter.applyLayout) {
        this.adapter.applyLayout(engineNode, flex.layout);
      }
    }
    for (const child of flex.children) {
      this.applyRecursive(child, false);
    }
  }
}

function propsToFlexStyle(props: Record<string, any>): Partial<FlexStyle> {
  const s: Partial<FlexStyle> = {};

  if (props.width !== undefined) s.width = props.width;
  if (props.height !== undefined) s.height = props.height;
  if (props.minWidth !== undefined) s.minWidth = props.minWidth;
  if (props.minHeight !== undefined) s.minHeight = props.minHeight;
  if (props.maxWidth !== undefined) s.maxWidth = props.maxWidth;
  if (props.maxHeight !== undefined) s.maxHeight = props.maxHeight;

  if (props.flex !== undefined) s.flex = props.flex;
  if (props.flexGrow !== undefined) s.flexGrow = props.flexGrow;
  if (props.flexShrink !== undefined) s.flexShrink = props.flexShrink;
  if (props.flexBasis !== undefined) s.flexBasis = props.flexBasis;
  if (props.flexDirection !== undefined) s.flexDirection = props.flexDirection;
  if (props.flexWrap !== undefined) s.flexWrap = props.flexWrap;
  if (props.justifyContent !== undefined) s.justifyContent = props.justifyContent;
  if (props.alignItems !== undefined) s.alignItems = props.alignItems;
  if (props.alignSelf !== undefined) s.alignSelf = props.alignSelf;
  if (props.alignContent !== undefined) s.alignContent = props.alignContent;

  if (props.gap !== undefined) s.gap = props.gap;
  if (props.rowGap !== undefined) s.rowGap = props.rowGap;
  if (props.columnGap !== undefined) s.columnGap = props.columnGap;

  if (props.position !== undefined) s.position = props.position;
  if (props.top !== undefined) s.top = props.top;
  if (props.left !== undefined) s.left = props.left;
  if (props.right !== undefined) s.right = props.right;
  if (props.bottom !== undefined) s.bottom = props.bottom;

  if (props.overflow !== undefined) s.overflow = props.overflow;
  if (props.aspectRatio !== undefined) s.aspectRatio = props.aspectRatio;

  // padding: number | [v, h] | [t, r, b, l]
  if (props.padding !== undefined) {
    const p = props.padding;
    if (typeof p === 'number') {
      s.paddingTop = s.paddingRight = s.paddingBottom = s.paddingLeft = p;
    } else if (Array.isArray(p)) {
      if (p.length === 2) {
        s.paddingTop = s.paddingBottom = p[0];
        s.paddingRight = s.paddingLeft = p[1];
      } else if (p.length === 4) {
        s.paddingTop = p[0]; s.paddingRight = p[1]; s.paddingBottom = p[2]; s.paddingLeft = p[3];
      }
    }
  }

  // margin: same format
  if (props.margin !== undefined) {
    const m = props.margin;
    if (typeof m === 'number') {
      s.marginTop = s.marginRight = s.marginBottom = s.marginLeft = m;
    } else if (Array.isArray(m)) {
      if (m.length === 2) {
        s.marginTop = s.marginBottom = m[0];
        s.marginRight = s.marginLeft = m[1];
      } else if (m.length === 4) {
        s.marginTop = m[0]; s.marginRight = m[1]; s.marginBottom = m[2]; s.marginLeft = m[3];
      }
    }
  }

  return s;
}
