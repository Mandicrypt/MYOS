/**
 * MYOS Token page: everything shown on the token page lives here.
 *
 * ┌─ TO CHANGE THE TOKEN ─────────────────────────────────────────────────────┐
 * │ Edit `contractAddress` and `buyUrl` below (both contain the address), and  │
 * │ the tokenomics rows at the bottom. Then run `npm run check:token` to       │
 * │ confirm everything still agrees.                                           │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * This file is display-only. The Rewards system reads its own token settings
 * (VITE_MYOS_TOKEN_CHAIN and VITE_MYOS_TOKEN_CONTRACT_ADDRESS in rewards/config.ts)
 * and stays in its pre-launch state until those are set. Changing this file does
 * not switch Rewards on.
 */

export type SocialLink = { label: string; handle: string; url: string }

export const TOKEN_PAGE = {
  name: 'MYOS',
  ticker: '$MYOS',
  /** How the chain is named on the page. */
  chainName: 'Robinhood',

  /** The token's contract address. Copied exactly as written, never shortened. */
  contractAddress: '0x410E6AC19a835920A0454c21aacB662000b1778b',

  /**
   * The official page where the token is bought. It must contain the same address
   * as above; `npm run check:token` fails if they ever disagree.
   */
  buyUrl: 'https://www.ponsfamily.com/launchpad/0x410E6AC19a835920A0454c21aacB662000b1778b',

  /**
   * The chain's native token, used to pay network fees (for example "ETH").
   * Leave null until confirmed: the page then says "the chain's native token".
   */
  nativeTokenName: null as string | null,

  /** Block explorer page for the token. Leave null to hide the link. */
  explorerUrl: null as string | null,

  social: [{ label: 'X', handle: '@myos_app', url: 'https://x.com/myos_app' }] satisfies SocialLink[],
}

export type TokenomicsRow = {
  label: string
  /** null shows "To be announced". Nothing is shown as fact until you fill it in. */
  value: string | null
  note?: string
}

/** Fill in `value` for each row when the numbers are final. */
export const TOKENOMICS: TokenomicsRow[] = [
  { label: 'Total supply', value: null },
  { label: 'Liquidity', value: null },
  { label: 'Allocation', value: null },
  { label: 'LP status', value: null },
  { label: 'Taxes', value: null, note: 'If applicable' },
]
