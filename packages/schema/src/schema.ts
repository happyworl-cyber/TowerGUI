/**
 * TowerUI JSON Schema — describes all components, props, and constraints.
 * Used by AI tools to generate valid UI descriptions.
 */

export interface PropDef {
  type: 'number' | 'string' | 'boolean' | 'enum' | 'color' | 'callback';
  required?: boolean;
  default?: any;
  enum?: string[];
  min?: number;
  max?: number;
  description?: string;
}

export interface ComponentSchema {
  type: string;
  description: string;
  category: 'basic' | 'layout' | 'input' | 'display' | 'game' | 'container';
  props: Record<string, PropDef>;
  children?: boolean;
}

export interface UISchema {
  version: string;
  components: Record<string, ComponentSchema>;
}

const layoutProps: Record<string, PropDef> = {
  width: { type: 'number', description: 'Width in pixels' },
  height: { type: 'number', description: 'Height in pixels' },
  minWidth: { type: 'number' },
  minHeight: { type: 'number' },
  maxWidth: { type: 'number' },
  maxHeight: { type: 'number' },
  flex: { type: 'number' },
  flexGrow: { type: 'number' },
  flexShrink: { type: 'number' },
  flexBasis: { type: 'number' },
  flexDirection: { type: 'enum', enum: ['row', 'column', 'row-reverse', 'column-reverse'], default: 'column' },
  justifyContent: { type: 'enum', enum: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'] },
  alignItems: { type: 'enum', enum: ['flex-start', 'center', 'flex-end', 'stretch'] },
  alignSelf: { type: 'enum', enum: ['auto', 'flex-start', 'center', 'flex-end', 'stretch'] },
  gap: { type: 'number' },
  padding: { type: 'number', description: 'Padding: number or [v,h] or [t,r,b,l]' },
  margin: { type: 'number' },
  position: { type: 'enum', enum: ['relative', 'absolute'] },
  top: { type: 'number' }, left: { type: 'number' }, right: { type: 'number' }, bottom: { type: 'number' },
};

const visualProps: Record<string, PropDef> = {
  tint: { type: 'color', description: 'Background color (#RRGGBB or #RRGGBBAA)' },
  opacity: { type: 'number', min: 0, max: 1 },
  visible: { type: 'boolean', default: true },
  zIndex: { type: 'number' },
  overflow: { type: 'enum', enum: ['visible', 'hidden', 'scroll'] },
};

const transformProps: Record<string, PropDef> = {
  scaleX: { type: 'number', default: 1 },
  scaleY: { type: 'number', default: 1 },
  rotation: { type: 'number', default: 0 },
  pivotX: { type: 'number', default: 0 },
  pivotY: { type: 'number', default: 0 },
};

const eventProps: Record<string, PropDef> = {
  onClick: { type: 'callback' },
  onPointerDown: { type: 'callback' },
  onPointerUp: { type: 'callback' },
  onPointerEnter: { type: 'callback' },
  onPointerExit: { type: 'callback' },
};

export const TOWER_UI_SCHEMA: UISchema = {
  version: '1.0.0',
  components: {
    'ui-view': {
      type: 'ui-view',
      description: 'Container element with Flexbox layout and optional background color',
      category: 'layout',
      props: { ...layoutProps, ...visualProps, ...transformProps, ...eventProps },
      children: true,
    },
    'ui-text': {
      type: 'ui-text',
      description: 'Text display element',
      category: 'display',
      props: {
        ...layoutProps, ...visualProps, ...transformProps,
        text: { type: 'string', required: true, description: 'Text content to display' },
        fontSize: { type: 'number', default: 16 },
        color: { type: 'color', default: '#ffffff' },
        align: { type: 'enum', enum: ['left', 'center', 'right'] },
        bold: { type: 'boolean' },
        italic: { type: 'boolean' },
        maxLines: { type: 'number' },
      },
    },
    'ui-image': {
      type: 'ui-image',
      description: 'Image display element',
      category: 'display',
      props: {
        ...layoutProps, ...visualProps, ...transformProps, ...eventProps,
        src: { type: 'string', description: 'Image resource path' },
        tint: { type: 'color' },
        scale9Grid: { type: 'string', description: '9-slice grid "top,right,bottom,left"' },
        fillMethod: { type: 'enum', enum: ['horizontal', 'vertical', 'radial90', 'radial180', 'radial360'] },
        fillAmount: { type: 'number', min: 0, max: 1 },
      },
    },
    'ui-button': {
      type: 'ui-button',
      description: 'Clickable button with text label',
      category: 'input',
      props: {
        ...layoutProps, ...visualProps, ...eventProps,
        text: { type: 'string', description: 'Button label text' },
        fontSize: { type: 'number', default: 16 },
        color: { type: 'color', description: 'Text color' },
        disabled: { type: 'boolean' },
      },
    },
    'ui-input': {
      type: 'ui-input',
      description: 'Text input field',
      category: 'input',
      props: {
        ...layoutProps, ...visualProps,
        value: { type: 'string' },
        placeholder: { type: 'string' },
        password: { type: 'boolean' },
        maxLength: { type: 'number' },
        readOnly: { type: 'boolean' },
        onChange: { type: 'callback' },
        onSubmit: { type: 'callback' },
      },
    },
    'ui-toggle': {
      type: 'ui-toggle',
      description: 'On/off toggle switch',
      category: 'input',
      props: {
        ...layoutProps, ...visualProps,
        checked: { type: 'boolean' },
        onChange: { type: 'callback' },
      },
    },
    'ui-slider': {
      type: 'ui-slider',
      description: 'Slider control for numeric values',
      category: 'input',
      props: {
        ...layoutProps, ...visualProps,
        value: { type: 'number' },
        min: { type: 'number', default: 0 },
        max: { type: 'number', default: 1 },
        step: { type: 'number' },
        onChange: { type: 'callback' },
      },
    },
    'ui-progress': {
      type: 'ui-progress',
      description: 'Progress bar',
      category: 'display',
      props: {
        ...layoutProps, ...visualProps,
        value: { type: 'number' },
        max: { type: 'number', default: 100 },
        barColor: { type: 'color' },
      },
    },
    'ui-scroll': {
      type: 'ui-scroll',
      description: 'Scrollable container',
      category: 'container',
      props: {
        ...layoutProps, ...visualProps,
        horizontal: { type: 'boolean' },
        vertical: { type: 'boolean', default: true },
      },
      children: true,
    },
  },
};
