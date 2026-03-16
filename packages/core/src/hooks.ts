import { useState, useCallback } from 'react';

export interface UIScalerInfo {
  designWidth: number;
  designHeight: number;
  screenWidth: number;
  screenHeight: number;
  scaleFactor: number;
}

let _scalerInfo: UIScalerInfo = {
  designWidth: 1920,
  designHeight: 1080,
  screenWidth: 1920,
  screenHeight: 1080,
  scaleFactor: 1,
};

export function setUIScalerInfo(info: UIScalerInfo): void {
  _scalerInfo = info;
}

export function useUIScaler(): UIScalerInfo {
  return _scalerInfo;
}

export function useToggle(initial: boolean = false): [boolean, () => void, (v: boolean) => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle, setValue];
}
