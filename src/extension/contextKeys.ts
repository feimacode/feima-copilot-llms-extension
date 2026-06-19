/*---------------------------------------------------------------------------------------------
 *  Feima Extension Context Keys
 *  Central definition of all VS Code context keys used by the extension.
 *  Context keys drive `when` clause expressions in package.json contributions.
 *--------------------------------------------------------------------------------------------*/

/**
 * Set to `true` while the user is signed in to Feima.
 * Drives the sign-in / sign-out menu item visibility.
 */
export const FEIMA_AUTH_SIGNED_IN_KEY = 'github.copilot.feimaAuth.signedIn';

/**
 * Set to `true` when the last request failed due to insufficient balance (HTTP 402).
 * Can be used by status-bar contributions to show a low-credit icon.
 * Reset to `false` on a successful request.
 */
export const FEIMA_INSUFFICIENT_BALANCE_KEY = 'feima.insufficientBalance';

/**
 * Set to `true` for global market builds.
 * Set to `false` for CN market builds.
 * This key is set at build time and never changes at runtime.
 * May be used by future features that need to distinguish between markets.
 */
export const FEIMA_IS_GLOBAL_MARKET_KEY = 'feima.isGlobalMarket';
