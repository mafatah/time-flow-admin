declare global {
  interface Window {
    isElectron?: boolean;
  }
}

export {};

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
