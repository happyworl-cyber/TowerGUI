declare const CS: any;

const FilterBridge = typeof CS !== 'undefined' ? CS?.TowerUI?.FilterBridge : null;

/**
 * UI Filter effects — wraps C# FilterBridge.
 */
export const Filters = {
  /**
   * Apply blur to a UI node. radius=0 removes blur.
   */
  blur(node: any, radius: number): void {
    if (FilterBridge) FilterBridge.SetBlur(node, radius);
  },

  /**
   * Apply drop shadow.
   */
  shadow(node: any, offsetX: number, offsetY: number, blur: number, color: string): void {
    if (!FilterBridge) return;
    const c = parseHex(color);
    FilterBridge.SetShadow(node, offsetX, offsetY, blur, c[0], c[1], c[2], c[3]);
  },

  /**
   * Apply glow (outline) effect.
   */
  glow(node: any, size: number, color: string): void {
    if (!FilterBridge) return;
    const c = parseHex(color);
    FilterBridge.SetOutline(node, size, c[0], c[1], c[2], c[3]);
  },

  /**
   * Grayscale filter. amount: 0=normal, 1=full grayscale.
   */
  grayscale(node: any, amount: number): void {
    if (FilterBridge) FilterBridge.SetGrayscale(node, amount);
  },

  /**
   * Adjust brightness. 1.0=normal, <1=darker, >1=brighter.
   */
  brightness(node: any, level: number): void {
    if (FilterBridge) FilterBridge.SetBrightness(node, level);
  },

  /** Remove all filter effects from a node. */
  clear(node: any): void {
    if (!FilterBridge) return;
    FilterBridge.SetBlur(node, 0);
    FilterBridge.SetShadow(node, 0, 0, 0, 0, 0, 0, 0);
    FilterBridge.SetOutline(node, 0, 0, 0, 0, 0);
    FilterBridge.SetGrayscale(node, 0);
  },
};

function parseHex(color: string): [number, number, number, number] {
  if (!color) return [0, 0, 0, 1];
  const hex = color.startsWith('#') ? color.slice(1) : color;
  if (hex.length >= 6) {
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
      hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    ];
  }
  return [0, 0, 0, 1];
}
