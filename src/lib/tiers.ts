// Stripe product/price mapping
export const TIERS = {
  free: {
    name: 'Gratuito',
    maxPads: 6,
    maxImports: 3,
    individualVolume: false,
    audioEffects: false,
    price: 0,
  },
  pro: {
    name: 'Pro',
    price_id: 'price_1T19YHRsrW8NGuEjGhc8E2Xb',
    product_id: 'prod_Tz7nOBkWdUxb9Q',
    maxPads: 16,
    maxImports: 999,
    individualVolume: true,
    audioEffects: false,
    price: 9.99,
  },
  master: {
    name: 'Master',
    price_id: 'price_1T19YXRsrW8NGuEjDybPdEic',
    product_id: 'prod_Tz7oenwSZLQFdS',
    maxPads: 16,
    maxImports: 999,
    individualVolume: true,
    audioEffects: true,
    price: 14.99,
  },
  lifetime: {
    name: 'Vitalício',
    product_id: 'prod_U5set4nFJ33JoH',
    price_id: 'price_1T7gtLRsrW8NGuEjAt4aggDV',
    maxPads: 16,
    maxImports: 999,
    individualVolume: true,
    audioEffects: true,
    price: 14.90,
  },
} as const;

export type TierKey = keyof typeof TIERS;

export function getTierByProductId(productId: string | null): TierKey {
  if (productId === TIERS.lifetime.product_id) return 'lifetime';
  if (productId === TIERS.master.product_id) return 'master';
  if (productId === TIERS.pro.product_id) return 'pro';
  return 'free';
}
