import React from 'react';
import { render } from '@tower-ui/core';
import { UnityAdapter } from '@tower-ui/unity-adapter';

declare const CS: any;

function App() {
  return (
    <ui-view width={1920} height={1080} flexDirection="column"
             alignItems="center" justifyContent="center" tint="#0a0a1aee">
      <ui-text text="{{DISPLAY_NAME}}" fontSize={48} color="#ffffff"
               width={800} height={60} align="center" />
      <ui-text text="Powered by TowerUI" fontSize={18} color="#778da9"
               width={800} height={30} align="center" />
    </ui-view>
  );
}

export function main() {
  const canvas = CS.UnityEngine.GameObject.Find('Canvas');
  if (!canvas) {
    CS.UnityEngine.Debug.LogError('[TowerUI] Canvas not found in scene');
    return;
  }

  const adapter = new UnityAdapter(canvas.transform);
  const root = render(<App />, adapter, { width: 1920, height: 1080 });

  CS.TowerUI.TowerUIBoot.onUpdate = (dt: number) => root.tick(dt * 1000);
}
