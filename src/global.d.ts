declare global {
  interface Window {
    isElectron?: boolean;
  }

  interface CustomEvent<T = any> extends Event {
    detail: T;
  }
}

export {};

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
