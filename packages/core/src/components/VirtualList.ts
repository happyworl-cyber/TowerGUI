import React, { useState, useCallback, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';

declare const CS: any;

export interface VirtualListProps {
  itemCount: number;
  itemHeight: number | ((index: number) => number);
  width: number;
  height: number;
  overscan?: number;
  renderItem: (index: number) => React.ReactNode;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export interface VirtualListHandle {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToBottom: () => void;
  scrollToTop: () => void;
  scrollTo: (y: number) => void;
}

export const VirtualList = forwardRef<VirtualListHandle, VirtualListProps>(function VirtualList(props, ref) {
  const {
    itemCount, itemHeight, width, height,
    overscan = 5, renderItem,
    onEndReached, endReachedThreshold = 100,
  } = props;

  const [scrollTop, setScrollTop] = useState(0);
  const scrollNodeRef = useRef<any>(null);
  const endReachedFiredRef = useRef(false);

  const isFixedHeight = typeof itemHeight === 'number';
  const fixedH = isFixedHeight ? Math.max(1, itemHeight as number) : 1;

  const getItemTop = useCallback((index: number): number => {
    if (isFixedHeight) return index * fixedH;
    let top = 0;
    const hFn = itemHeight as (i: number) => number;
    for (let i = 0; i < index; i++) top += Math.max(1, hFn(i));
    return top;
  }, [itemHeight, isFixedHeight, fixedH]);

  const getItemHeight = useCallback((index: number): number => {
    if (isFixedHeight) return fixedH;
    return Math.max(1, (itemHeight as (i: number) => number)(index));
  }, [itemHeight, isFixedHeight, fixedH]);

  const totalHeight = useMemo(() => {
    if (itemCount <= 0) return 0;
    if (isFixedHeight) return itemCount * fixedH;
    let total = 0;
    const hFn = itemHeight as (i: number) => number;
    for (let i = 0; i < itemCount; i++) total += Math.max(1, hFn(i));
    return total;
  }, [itemCount, itemHeight, isFixedHeight, fixedH]);

  // Reset endReached flag when itemCount changes (new data loaded)
  const prevCountRef = useRef(itemCount);
  if (prevCountRef.current !== itemCount) {
    prevCountRef.current = itemCount;
    endReachedFiredRef.current = false;
  }

  const startIdx = useMemo(() => {
    if (itemCount <= 0) return 0;
    if (isFixedHeight) return Math.max(0, Math.floor(scrollTop / fixedH) - overscan);
    let idx = 0;
    let top = 0;
    const hFn = itemHeight as (i: number) => number;
    while (idx < itemCount && top + Math.max(1, hFn(idx)) < scrollTop) {
      top += Math.max(1, hFn(idx));
      idx++;
    }
    return Math.max(0, idx - overscan);
  }, [scrollTop, itemCount, itemHeight, isFixedHeight, fixedH, overscan]);

  const endIdx = useMemo(() => {
    if (itemCount <= 0) return 0;
    const viewBottom = scrollTop + height;
    if (isFixedHeight) return Math.min(itemCount - 1, Math.ceil(viewBottom / fixedH) + overscan);
    let idx = startIdx;
    let top = getItemTop(startIdx);
    const hFn = itemHeight as (i: number) => number;
    while (idx < itemCount && top < viewBottom) {
      top += Math.max(1, hFn(idx));
      idx++;
    }
    return Math.min(itemCount - 1, idx + overscan);
  }, [scrollTop, height, startIdx, itemCount, itemHeight, isFixedHeight, fixedH, overscan, getItemTop]);

  const scrollToPixel = useCallback((y: number) => {
    const clamped = Math.max(0, Math.min(y, Math.max(0, totalHeight - height)));
    setScrollTop(clamped);
    if (scrollNodeRef.current && typeof CS !== 'undefined') {
      try {
        CS.TowerUI.UIBridge.SetScrollPosition(scrollNodeRef.current, 0, clamped);
      } catch { /* safe */ }
    }
  }, [totalHeight, height]);

  useImperativeHandle(ref, () => ({
    scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start') {
      const idx = Math.max(0, Math.min(index, itemCount - 1));
      const itemTop = getItemTop(idx);
      const itemH = getItemHeight(idx);
      let targetY: number;
      switch (align) {
        case 'center':
          targetY = itemTop - (height - itemH) / 2;
          break;
        case 'end':
          targetY = itemTop - height + itemH;
          break;
        default:
          targetY = itemTop;
      }
      scrollToPixel(targetY);
    },
    scrollToBottom() {
      scrollToPixel(Math.max(0, totalHeight - height));
    },
    scrollToTop() {
      scrollToPixel(0);
    },
    scrollTo(y: number) {
      scrollToPixel(y);
    },
  }), [itemCount, getItemTop, getItemHeight, height, totalHeight, scrollToPixel]);

  const scrollRefCallback = useCallback((node: any) => { scrollNodeRef.current = node; }, []);

  const handleScroll = useCallback((_scrollX: number, scrollY: number) => {
    const y = typeof scrollY === 'number' && Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0;
    setScrollTop(y);

    if (onEndReached && !endReachedFiredRef.current && totalHeight - y - height < endReachedThreshold) {
      endReachedFiredRef.current = true;
      onEndReached();
    }
  }, [totalHeight, height, endReachedThreshold, onEndReached]);

  if (itemCount <= 0) {
    return React.createElement('ui-scroll', { width, height, vertical: true, horizontal: false });
  }

  const visibleItems: React.ReactNode[] = [];
  for (let i = startIdx; i <= endIdx && i < itemCount; i++) {
    const top = getItemTop(i);
    const h = getItemHeight(i);
    visibleItems.push(
      React.createElement('ui-view', {
        key: `vl-${i}`,
        position: 'absolute',
        top, left: 0,
        width, height: h,
      }, renderItem(i))
    );
  }

  return React.createElement('ui-scroll', {
    width, height,
    vertical: true,
    horizontal: false,
    onScroll: handleScroll,
    ref: scrollRefCallback,
  },
    React.createElement('ui-view', {
      width, height: totalHeight,
    }, ...visibleItems)
  );
});
