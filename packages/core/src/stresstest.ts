/**
 * Stress test utilities for validating TowerUI performance.
 */

export interface StressTestResult {
  testName: string;
  nodeCount: number;
  createTimeMs: number;
  updateTimeMs: number;
  layoutTimeMs: number;
  totalTimeMs: number;
  fps: number;
  passed: boolean;
}

export function runStressReport(results: StressTestResult[]): string {
  const lines: string[] = [
    '=== TowerUI Stress Test Report ===',
    '',
  ];

  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL';
    lines.push(`[${status}] ${r.testName}`);
    lines.push(`  Nodes: ${r.nodeCount}`);
    lines.push(`  Create: ${r.createTimeMs.toFixed(1)}ms`);
    lines.push(`  Update: ${r.updateTimeMs.toFixed(1)}ms`);
    lines.push(`  Layout: ${r.layoutTimeMs.toFixed(1)}ms`);
    lines.push(`  Total:  ${r.totalTimeMs.toFixed(1)}ms`);
    lines.push(`  FPS:    ${r.fps.toFixed(0)}`);
    lines.push('');
  }

  const allPassed = results.every(r => r.passed);
  lines.push(allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');

  return lines.join('\n');
}

/**
 * Benchmark helper: measure execution time of a function.
 */
export function measure(fn: () => void): number {
  const now = typeof performance !== 'undefined' && performance.now
    ? () => performance.now()
    : () => Date.now();
  const start = now();
  fn();
  return now() - start;
}

/**
 * Memory leak detector: track object counts across cycles.
 */
export class LeakDetector {
  private snapshots: number[] = [];

  recordSnapshot(nodeCount: number): void {
    this.snapshots.push(nodeCount);
  }

  analyze(): { stable: boolean; trend: string; delta: number } {
    if (this.snapshots.length < 3) {
      return { stable: true, trend: 'insufficient data', delta: 0 };
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const delta = last - first;
    const growing = this.snapshots.every((v, i) => i === 0 || v >= this.snapshots[i - 1]);

    if (Math.abs(delta) <= 2) {
      return { stable: true, trend: 'stable', delta };
    }
    if (growing && delta > 10) {
      return { stable: false, trend: 'LEAK: monotonically increasing', delta };
    }
    return { stable: true, trend: `fluctuating (delta=${delta})`, delta };
  }

  reset(): void {
    this.snapshots = [];
  }
}
