// Stripe product/price mapping
export const TIERS = {
  free: {
    name: 'Gratuito',
    maxPads: 4,
    maxImports: 3,
    individualVolume: false,
    audioEffects: false,
    price: 0,
  },
  pro: {
    name: 'Pro',
    price_id: 'price_1T15vdRxuHlcX9jON3PmEf2V',
    product_id: 'prod_Tz43Hy4fOJbwgw',
    maxPads: 16,
    maxImports: 999,
    individualVolume: true,
    audioEffects: false,
    price: 9.99,
  },
  master: {
    name: 'Master',
    price_id: 'price_1T15w1RxuHlcX9jOJMtCdJvO',
    product_id: 'prod_Tz44FUgl3v2ZCJ',
    maxPads: 16,
    maxImports: 999,
    individualVolume: true,
    audioEffects: true,
    price: 14.99,
  },
} as const;

export type TierKey = keyof typeof TIERS;

export function getTierByProductId(productId: string | null): TierKey {
  if (productId === TIERS.master.product_id) return 'master';
  if (productId === TIERS.pro.product_id) return 'pro';
  return 'free';
}
