/**
 * Phase 5 Automated Tests — Schema / Validator / Codegen / i18n
 */

import { TOWER_UI_SCHEMA, validateUI, jsonToTSX, type UINode, type ValidationError } from '@tower-ui/schema';

declare const CS: any;
const Debug = CS.UnityEngine.Debug;

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function assert(name: string, condition: boolean, detail: string = '') {
  results.push({ name, passed: condition, detail: condition ? 'OK' : detail || 'FAILED' });
}

// ── Schema Tests ──────────────────────────────────────────

function testSchemaCompleteness() {
  const schema = TOWER_UI_SCHEMA;
  assert('Schema version exists', !!schema.version, `version: ${schema.version}`);

  const expectedTypes = ['ui-view', 'ui-text', 'ui-image', 'ui-button', 'ui-input', 'ui-toggle', 'ui-slider', 'ui-progress', 'ui-scroll'];
  for (const t of expectedTypes) {
    assert(`Schema has <${t}>`, !!schema.components[t], `Missing: ${t}`);
  }

  assert('Schema has 9+ components', Object.keys(schema.components).length >= 9,
    `Got ${Object.keys(schema.components).length}`);

  const viewProps = schema.components['ui-view']?.props;
  assert('ui-view has width prop', !!viewProps?.width);
  assert('ui-view has flexDirection prop', !!viewProps?.flexDirection);
  assert('ui-view has tint prop', !!viewProps?.tint);
  assert('ui-view has onClick prop', !!viewProps?.onClick);
}

// ── Validator Tests ───────────────────────────────────────

function testValidatorPass() {
  const valid: UINode = {
    type: 'ui-view',
    props: { width: 500, height: 400, tint: '#0d1b2a', flexDirection: 'column' },
    children: [
      { type: 'ui-text', props: { text: 'Hello', fontSize: 24, color: '#ffffff' } },
    ],
  };
  const errors = validateUI(valid);
  assert('Valid tree passes validation', errors.length === 0,
    errors.map((e: ValidationError) => `${e.path}: ${e.message}`).join('; '));
}

function testValidatorUnknownType() {
  const invalid: UINode = { type: 'ui-fake', props: {} };
  const errors = validateUI(invalid);
  assert('Unknown type caught', errors.length > 0 && errors[0].message.includes('Unknown'),
    `Errors: ${errors.length}`);
}

function testValidatorMissingRequired() {
  const noText: UINode = { type: 'ui-text', props: { fontSize: 20 } };
  const errors = validateUI(noText);
  assert('Missing required "text" caught', errors.some((e: ValidationError) => e.message.includes('text')),
    errors.map((e: ValidationError) => e.message).join('; '));
}

function testValidatorBadEnum() {
  const badDir: UINode = { type: 'ui-view', props: { flexDirection: 'diagonal' } };
  const errors = validateUI(badDir);
  assert('Invalid enum value caught', errors.some((e: ValidationError) => e.message.includes('diagonal')),
    errors.map((e: ValidationError) => e.message).join('; '));
}

function testValidatorBadColor() {
  const badColor: UINode = { type: 'ui-view', props: { tint: 'red' } };
  const errors = validateUI(badColor);
  assert('Invalid color format caught', errors.some((e: ValidationError) => e.message.includes('color')),
    errors.map((e: ValidationError) => e.message).join('; '));
}

function testValidatorBadType() {
  const badType: UINode = { type: 'ui-view', props: { width: 'big' as any } };
  const errors = validateUI(badType);
  assert('Type mismatch caught (string for number)', errors.some((e: ValidationError) => e.message.includes('number')),
    errors.map((e: ValidationError) => e.message).join('; '));
}

function testValidatorRange() {
  const outOfRange: UINode = { type: 'ui-view', props: { opacity: 5 } };
  const errors = validateUI(outOfRange);
  assert('Out of range caught (opacity > 1)', errors.some((e: ValidationError) => e.message.includes('maximum')),
    errors.map((e: ValidationError) => e.message).join('; '));
}

function testValidatorNestedChildren() {
  const nested: UINode = {
    type: 'ui-view',
    props: { width: 100, height: 100 },
    children: [
      {
        type: 'ui-view',
        props: { width: 50, height: 50 },
        children: [
          { type: 'ui-text', props: { text: 'Deep', fontSize: 12 } },
        ],
      },
    ],
  };
  const errors = validateUI(nested);
  assert('Nested valid tree passes', errors.length === 0,
    errors.map((e: ValidationError) => `${e.path}: ${e.message}`).join('; '));
}

// ── Codegen Tests ─────────────────────────────────────────

function testCodegen() {
  const node: UINode = {
    type: 'ui-view',
    props: { width: 400, height: 300, tint: '#112233' },
    children: [
      { type: 'ui-text', props: { text: 'Hello World', fontSize: 20 } },
    ],
  };
  const tsx = jsonToTSX(node, 'TestPanel');
  assert('Codegen produces string', typeof tsx === 'string' && tsx.length > 0);
  assert('Codegen has function name', tsx.includes('TestPanel'));
  assert('Codegen has ui-view', tsx.includes('ui-view'));
  assert('Codegen has ui-text', tsx.includes('ui-text'));
  assert('Codegen has props', tsx.includes('width={400}') && tsx.includes('tint="'));
  assert('Codegen has text content', tsx.includes('Hello World'));
}

function testCodegenEmptyChildren() {
  const node: UINode = {
    type: 'ui-view',
    props: { width: 100, height: 100 },
    children: [],
  };
  const tsx = jsonToTSX(node, 'Empty');
  assert('Codegen self-closes empty', tsx.includes('/>'));
}

// ── Run All ───────────────────────────────────────────────

export function runPhase5Tests(): string {
  results.length = 0;

  testSchemaCompleteness();
  testValidatorPass();
  testValidatorUnknownType();
  testValidatorMissingRequired();
  testValidatorBadEnum();
  testValidatorBadColor();
  testValidatorBadType();
  testValidatorRange();
  testValidatorNestedChildren();
  testCodegen();
  testCodegenEmptyChildren();

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const lines: string[] = [
    `\n=== Phase 5 Tests: ${passed}/${total} passed ===\n`,
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
