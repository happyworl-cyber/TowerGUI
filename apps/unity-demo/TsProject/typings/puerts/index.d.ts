declare module 'puerts' {
  export function $typeof(cls: any): any;
  export function $generic(genericType: any, ...typeArgs: any[]): any;
  export function $ref(value?: any): { value: any };
  export function $unref(ref: { value: any }): any;
  export function on(eventName: string, callback: Function): void;
}
