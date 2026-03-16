/**
 * Phase 7 Automated Tests — AssetLoader / SoundManager / Resource Pipeline
 */

import { loadSprite, loadSpriteFromAtlas, loadAudio, getCacheStats, clearCache } from '@tower-ui/core';
import { SoundManager } from '@tower-ui/core';

declare const CS: any;
const Debug = CS.UnityEngine.Debug;
const AssetManager = CS.TowerUI.AssetManager;
const SoundBridge = CS.TowerUI.SoundBridge;

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function assert(name: string, condition: boolean, detail: string = '') {
  results.push({ name, passed: condition, detail: condition ? 'OK' : detail || 'FAILED' });
}

// ── C# Bridge Availability ───────────────────────────────

function testCSharpBridgeExists() {
  assert('AssetManager class exists', AssetManager != null);
  assert('AssetManager.LoadSprite exists', typeof AssetManager.LoadSprite === 'function');
  assert('AssetManager.LoadSpriteFromAtlas exists', typeof AssetManager.LoadSpriteFromAtlas === 'function');
  assert('AssetManager.LoadAudio exists', typeof AssetManager.LoadAudio === 'function');
  assert('AssetManager.SetSpriteWithSlice exists', typeof AssetManager.SetSpriteWithSlice === 'function');
  assert('AssetManager.ClearCache exists', typeof AssetManager.ClearCache === 'function');
  assert('AssetManager.CachedSpriteCount exists', typeof AssetManager.CachedSpriteCount === 'number');

  assert('SoundBridge class exists', SoundBridge != null);
  assert('SoundBridge.Play exists', typeof SoundBridge.Play === 'function');
  assert('SoundBridge.SetMasterVolume exists', typeof SoundBridge.SetMasterVolume === 'function');
  assert('SoundBridge.GetMasterVolume exists', typeof SoundBridge.GetMasterVolume === 'function');
  assert('SoundBridge.SetMuted exists', typeof SoundBridge.SetMuted === 'function');
  assert('SoundBridge.IsMuted exists', typeof SoundBridge.IsMuted === 'function');
  assert('SoundBridge.StopAll exists', typeof SoundBridge.StopAll === 'function');
}

// ── TS API Existence ─────────────────────────────────────

function testTsApiExists() {
  assert('loadSprite is function', typeof loadSprite === 'function');
  assert('loadSpriteFromAtlas is function', typeof loadSpriteFromAtlas === 'function');
  assert('loadAudio is function', typeof loadAudio === 'function');
  assert('getCacheStats is function', typeof getCacheStats === 'function');
  assert('clearCache is function', typeof clearCache === 'function');
  assert('SoundManager.play is function', typeof SoundManager.play === 'function');
  assert('SoundManager.setVolume is function', typeof SoundManager.setVolume === 'function');
  assert('SoundManager.mute is function', typeof SoundManager.mute === 'function');
}

// ── Null/Empty Path Handling ─────────────────────────────

function testNullHandling() {
  const s1 = loadSprite('');
  assert('loadSprite("") returns null', s1 == null);

  const s2 = loadSprite('nonexistent/path/xyz');
  assert('loadSprite(missing path) returns null', s2 == null);

  const s3 = loadSpriteFromAtlas('nonexistent', 'sprite');
  assert('loadSpriteFromAtlas(missing) returns null', s3 == null);

  const a1 = loadAudio('');
  assert('loadAudio("") returns null', a1 == null);

  const a2 = loadAudio('nonexistent/sound');
  assert('loadAudio(missing) returns null', a2 == null);
}

// ── Cache Stats ──────────────────────────────────────────

function testCacheStats() {
  clearCache();
  const stats = getCacheStats();
  assert('Cache stats returns object', stats != null && typeof stats.sprites === 'number');
  assert('Cache cleared: 0 sprites', stats.sprites === 0, `sprites: ${stats.sprites}`);
  assert('Cache cleared: 0 audio', stats.audio === 0, `audio: ${stats.audio}`);
}

// ── SoundManager State ───────────────────────────────────

function testSoundManagerState() {
  SoundManager.setVolume(0.75);
  assert('Volume set to 0.75', Math.abs(SoundManager.getVolume() - 0.75) < 0.01,
    `vol: ${SoundManager.getVolume()}`);

  SoundManager.mute(true);
  assert('Mute set to true', SoundManager.isMuted() === true);

  SoundManager.mute(false);
  assert('Mute set to false', SoundManager.isMuted() === false);

  SoundManager.setVolume(1.0);
}

// ── Real Asset Loading (only if test assets exist) ───────

function testRealAssetLoading() {
  const testSprite = loadSprite('icons/test_icon');
  if (testSprite != null) {
    assert('Real sprite loaded', true);
    const stats = getCacheStats();
    assert('Sprite cached after load', stats.sprites >= 1);
  } else {
    assert('Real sprite test (skipped: no Resources/UI/icons/test_icon)', true);
  }

  const testAudio = loadAudio('test_click');
  if (testAudio != null) {
    assert('Real audio loaded', true);
  } else {
    assert('Real audio test (skipped: no Resources/Audio/test_click)', true);
  }
}

// ── Run All ──────────────────────────────────────────────

export function runPhase7Tests(): string {
  results.length = 0;

  testCSharpBridgeExists();
  testTsApiExists();
  testNullHandling();
  testCacheStats();
  testSoundManagerState();
  testRealAssetLoading();

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const lines: string[] = [
    `\n=== Phase 7 Tests: ${passed}/${total} passed ===\n`,
  ];

  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    lines.push(`  [${icon}] ${r.name}${r.passed ? '' : ' — ' + r.detail}`);
  }

  lines.push(`\n${passed === total ? 'ALL PASSED' : `${total - passed} FAILED`}\n`);

  const report = lines.join('\n');
  Debug.Log(report);
  return report;
}
