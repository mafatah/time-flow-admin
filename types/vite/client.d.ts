declare module 'vite/client' {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly [key: string]: any;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
