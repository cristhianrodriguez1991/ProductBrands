/**
 * Amazon Price Intelligence (Autopricer) Configuration
 * 
 * Centralized settings, branding, marketplace definitions, and algorithm thresholds.
 * You can easily modify the app name, default referral fees, or profit margin targets here.
 */

export const PRICE_INTELLIGENCE_CONFIG = {
  // Application Branding
  APP_NAME: "Amazon Price Intelligence",
  APP_DESCRIPTION: "AI-assisted marketplace pricing analytics, profit simulation, and recommendation engine with explicit seller approval guardrails.",
  ROUTE_PATH: "/admin/autopricer",

  // Global Marketplaces Supported
  MARKETPLACES: [
    { code: "US", name: "United States (Amazon.com)", currency: "USD", symbol: "$", flag: "🇺🇸", defaultReferralFee: 15.0 },
    { code: "CA", name: "Canada (Amazon.ca)", currency: "CAD", symbol: "CA$", flag: "🇨🇦", defaultReferralFee: 15.0 },
    { code: "UK", name: "United Kingdom (Amazon.co.uk)", currency: "GBP", symbol: "£", flag: "🇬🇧", defaultReferralFee: 15.3 },
    { code: "DE", name: "Germany (Amazon.de)", currency: "EUR", symbol: "€", flag: "🇩🇪", defaultReferralFee: 15.0 },
    { code: "FR", name: "France (Amazon.fr)", currency: "EUR", symbol: "€", flag: "🇫🇷", defaultReferralFee: 15.0 },
    { code: "IT", name: "Italy (Amazon.it)", currency: "EUR", symbol: "€", flag: "🇮🇹", defaultReferralFee: 15.0 },
    { code: "ES", name: "Spain (Amazon.es)", currency: "EUR", symbol: "€", flag: "🇪🇸", defaultReferralFee: 15.0 },
    { code: "MX", name: "Mexico (Amazon.com.mx)", currency: "MXN", symbol: "MX$", flag: "🇲🇽", defaultReferralFee: 15.0 },
    { code: "JP", name: "Japan (Amazon.co.jp)", currency: "JPY", symbol: "¥", flag: "🇯🇵", defaultReferralFee: 10.0 },
    { code: "AU", name: "Australia (Amazon.com.au)", currency: "AUD", symbol: "A$", flag: "🇦🇺", defaultReferralFee: 15.0 },
  ],

  // Default Pricing Guardrails & Thresholds
  DEFAULTS: {
    MIN_DESIRED_MARGIN_PERCENT: 15.0, // Default 15% minimum net profit margin target (prioritizing high sales volume & rank reduction)
    REFERRAL_FEE_PERCENT: 15.0,
    FBM_FEE: 0.0,
    ESTIMATED_FBA_FEE_USD: 5.45, // Default estimated pick, pack & ship fee for standard packages
    PRICE_CHANGE_MAX_STEP_PERCENT: 10.0, // Prevent sudden price jumps > 10% in a single recommendation
    BUYBOX_WIN_RATE_HEALTHY: 80.0, // Win rate above 80% is considered healthy
    BUYBOX_WIN_RATE_CRITICAL: 40.0, // Win rate below 40% requires aggressive positioning if margin allows
  },

  // Recommended Action Definitions
  ACTIONS: {
    RAISE: {
      code: "RAISE",
      label: "Raise Price",
      color: "emerald",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      description: "Current margin is below target or price is below floor. Recommended to raise price.",
    },
    LOWER: {
      code: "LOWER",
      label: "Lower Price",
      color: "rose",
      badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      description: "Buy Box is being lost to competitors while current profit margin allows pricing buffer.",
    },
    MAINTAIN: {
      code: "MAINTAIN",
      label: "Maintain Price",
      color: "blue",
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      description: "Price is optimally positioned. Unit economics and Buy Box win rate are healthy.",
    },
    NEEDS_REVIEW: {
      code: "NEEDS_REVIEW",
      label: "Needs Review",
      color: "amber",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      description: "Conflicting guardrails: floor price is higher than Buy Box ceiling or cost exceeds target.",
    },
  },
} as const;

export type MarketplaceCode = typeof PRICE_INTELLIGENCE_CONFIG.MARKETPLACES[number]["code"];
export type RecommendedActionCode = keyof typeof PRICE_INTELLIGENCE_CONFIG.ACTIONS;
