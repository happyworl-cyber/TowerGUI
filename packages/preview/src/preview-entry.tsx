/**
 * Default preview entry — renders a component showcase in the browser.
 * Users can replace this with their own entry file.
 */
import React, { useState, useCallback } from 'react';
import { render } from '@tower-ui/core';
import { WebAdapter } from '@tower-ui/web-adapter';

function ComponentShowcase() {
  const [count, setCount] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [toggle, setToggle] = useState(false);
  const [slider, setSlider] = useState(50);

  const handleClick = useCallback(() => setCount(c => c + 1), []);

  return (
    <ui-view width={1280} height={720} tint="#0a0e1aff" flexDirection="column" padding={30} gap={20}>
      {/* Title */}
      <ui-text text="TowerUI Web Preview" fontSize={28} color="#4da6ff" bold />
      <ui-text text="Same TSX renders in both Unity and Browser" fontSize={14} color="#888" />

      {/* Row 1: Counter */}
      <ui-view flexDirection="row" gap={16} alignItems="center">
        <ui-text text={`Count: ${count}`} fontSize={20} color="#ffffff" />
        <ui-button text="Click Me" onClick={handleClick}
          width={120} height={40} tint="#3a6ea5" />
      </ui-view>

      {/* Row 2: Input */}
      <ui-view flexDirection="row" gap={16} alignItems="center">
        <ui-text text="Input:" fontSize={16} color="#aaa" />
        <ui-input value={inputVal} onChange={setInputVal} placeholder="Type here..."
          width={250} height={36} />
        <ui-text text={inputVal || '(empty)'} fontSize={14} color="#666" />
      </ui-view>

      {/* Row 3: Toggle + Slider */}
      <ui-view flexDirection="row" gap={24} alignItems="center">
        <ui-view flexDirection="row" gap={8} alignItems="center">
          <ui-text text="Toggle:" fontSize={16} color="#aaa" />
          <ui-toggle checked={toggle} onChange={setToggle} width={80} height={30} />
          <ui-text text={toggle ? 'ON' : 'OFF'} fontSize={14} color={toggle ? '#4caf50' : '#f44336'} />
        </ui-view>

        <ui-view flexDirection="row" gap={8} alignItems="center" flex={1}>
          <ui-text text="Slider:" fontSize={16} color="#aaa" />
          <ui-slider value={slider} min={0} max={100} onChange={setSlider}
            width={200} height={30} />
          <ui-text text={`${slider}`} fontSize={14} color="#fff" />
        </ui-view>
      </ui-view>

      {/* Row 4: Progress */}
      <ui-view flexDirection="column" gap={8}>
        <ui-text text={`Progress: ${slider}%`} fontSize={16} color="#aaa" />
        <ui-progress value={slider} max={100} barColor="#4da6ff"
          width={400} height={20} />
      </ui-view>

      {/* Row 5: Panel with nested views */}
      <ui-view tint="#162040" padding={20} flexDirection="column" gap={10} width={500}>
        <ui-text text="Nested Panel" fontSize={18} color="#4da6ff" bold />
        <ui-view flexDirection="row" gap={10}>
          <ui-view tint="#1a3a5c" width={80} height={80} />
          <ui-view tint="#3a1a5c" width={80} height={80} />
          <ui-view tint="#5c3a1a" width={80} height={80} />
          <ui-view tint="#1a5c3a" width={80} height={80} />
        </ui-view>
        <ui-text text="These colored boxes render identically in Unity UGUI" fontSize={12} color="#666" />
      </ui-view>

      {/* Scroll area */}
      <ui-scroll width={500} height={120} vertical>
        <ui-view flexDirection="column" gap={4} padding={8}>
          {Array.from({ length: 20 }, (_, i) => (
            <ui-text key={i} text={`Scroll item #${i + 1}`} fontSize={14} color="#ccc" />
          ))}
        </ui-view>
      </ui-scroll>
    </ui-view>
  );
}

// Mount to the canvas frame
const container = document.getElementById('canvas-frame');
if (container) {
  const adapter = new WebAdapter(container);
  const w = container.clientWidth;
  const h = container.clientHeight;
  render(React.createElement(ComponentShowcase), adapter, { width: w, height: h });
  console.log('[TowerUI] Web preview rendered');
}
