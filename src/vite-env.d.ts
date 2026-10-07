/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
  readonly VITE_MYOS_TOKEN_CHAIN?: string
  readonly VITE_MYOS_TOKEN_CONTRACT_ADDRESS?: string
  readonly VITE_MYOS_TOKEN_SYMBOL?: string
  readonly VITE_MYOS_TOKEN_DECIMALS?: string
  readonly VITE_MYOS_REWARDS_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
