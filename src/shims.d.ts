declare module '*';

declare namespace React {
  interface HTMLAttributes<T> {
    [key: string]: any;
  }
  type ReactNode = any;
  interface ComponentProps<T> { [key: string]: any; }
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
