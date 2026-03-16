import { TOWER_UI_SCHEMA, type UISchema, type ComponentSchema, type PropDef } from './schema';

export interface UINode {
  type: string;
  props?: Record<string, any>;
  children?: (UINode | string)[];
}

export interface ValidationError {
  path: string;
  message: string;
}

export function validateUI(node: UINode, schema: UISchema = TOWER_UI_SCHEMA): ValidationError[] {
  const errors: ValidationError[] = [];
  validateNode(node, schema, '', errors);
  return errors;
}

function validateNode(node: UINode, schema: UISchema, path: string, errors: ValidationError[]): void {
  const compSchema = schema.components[node.type];
  if (!compSchema) {
    errors.push({ path, message: `Unknown component type: "${node.type}"` });
    return;
  }

  const props = node.props ?? {};

  // Check required props
  for (const [key, def] of Object.entries(compSchema.props)) {
    if (def.required && (props[key] === undefined || props[key] === null)) {
      errors.push({ path: `${path}.${key}`, message: `Required prop "${key}" is missing on <${node.type}>` });
    }
  }

  // Validate prop types
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'key' || key === 'ref') continue;
    const def = compSchema.props[key];
    if (!def) continue; // allow unknown props (forward-compat)

    const propPath = `${path}.${key}`;
    validatePropValue(value, def, propPath, errors);
  }

  // Validate children
  if (node.children) {
    if (!compSchema.children && node.children.length > 0) {
      errors.push({ path, message: `<${node.type}> does not accept children` });
    }
    node.children.forEach((child, i) => {
      if (typeof child === 'object') {
        validateNode(child, schema, `${path}[${i}]`, errors);
      }
    });
  }
}

function validatePropValue(value: any, def: PropDef, path: string, errors: ValidationError[]): void {
  if (value === undefined || value === null) return;

  switch (def.type) {
    case 'number':
      if (typeof value !== 'number') {
        errors.push({ path, message: `Expected number, got ${typeof value}` });
      } else {
        if (def.min !== undefined && value < def.min) {
          errors.push({ path, message: `Value ${value} is below minimum ${def.min}` });
        }
        if (def.max !== undefined && value > def.max) {
          errors.push({ path, message: `Value ${value} exceeds maximum ${def.max}` });
        }
      }
      break;
    case 'string':
      if (typeof value !== 'string') {
        errors.push({ path, message: `Expected string, got ${typeof value}` });
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push({ path, message: `Expected boolean, got ${typeof value}` });
      }
      break;
    case 'enum':
      if (def.enum && !def.enum.includes(value)) {
        errors.push({ path, message: `"${value}" is not a valid value. Expected one of: ${def.enum.join(', ')}` });
      }
      break;
    case 'color':
      if (typeof value === 'string' && !value.match(/^#[0-9a-fA-F]{6,8}$/)) {
        errors.push({ path, message: `Invalid color format: "${value}". Expected #RRGGBB or #RRGGBBAA` });
      }
      break;
    case 'callback':
      if (typeof value !== 'function') {
        errors.push({ path, message: `Expected function for callback prop` });
      }
      break;
  }
}
