/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin backend API, mis. https://api.workilham.my.id atau http://localhost:8080 */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
