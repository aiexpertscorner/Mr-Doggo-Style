// Central affiliate configuration. Import this wherever affiliate links are rendered.
// Amazon tag: aiexpertscorn-20  |  AWIN partners via AWIN network

export const AMAZON_TAG = 'aiexpertscorn-20';

export const affiliateLinks = {
  amazon: {
    // Generic Amazon category search / landing links (no specific ASIN)
    beds: {
      all: `https://www.amazon.com/s?k=dog+beds&tag=${AMAZON_TAG}`,
      orthopedic: `https://www.amazon.com/s?k=orthopedic+dog+beds&tag=${AMAZON_TAG}`,
    },
    food: {
      all: `https://www.amazon.com/s?k=dog+food&tag=${AMAZON_TAG}`,
      fresh: `https://www.amazon.com/s?k=fresh+dog+food&tag=${AMAZON_TAG}`,
      puppy: `https://www.amazon.com/s?k=puppy+food&tag=${AMAZON_TAG}`,
      senior: `https://www.amazon.com/s?k=senior+dog+food&tag=${AMAZON_TAG}`,
    },
    toys: {
      all: `https://www.amazon.com/s?k=dog+toys&tag=${AMAZON_TAG}`,
      interactive: `https://www.amazon.com/s?k=interactive+dog+toys&tag=${AMAZON_TAG}`,
      chew: `https://www.amazon.com/s?k=chew+toys+for+dogs&tag=${AMAZON_TAG}`,
    },
    grooming: {
      all: `https://www.amazon.com/s?k=dog+grooming&tag=${AMAZON_TAG}`,
      brushes: `https://www.amazon.com/s?k=dog+grooming+brushes&tag=${AMAZON_TAG}`,
    },
    training: {
      all: `https://www.amazon.com/s?k=dog+training+supplies&tag=${AMAZON_TAG}`,
      collars: `https://www.amazon.com/s?k=dog+training+collars&tag=${AMAZON_TAG}`,
    },
    supplements: {
      all: `https://www.amazon.com/s?k=dog+supplements&tag=${AMAZON_TAG}`,
      joint: `https://www.amazon.com/s?k=dog+joint+supplements&tag=${AMAZON_TAG}`,
    },
    health: {
      all: `https://www.amazon.com/s?k=dog+health+supplies&tag=${AMAZON_TAG}`,
    },
  },

  awin: {
    jugbow: {
      label: 'JugBow',
      home: 'https://tidd.ly/3QryFd6',
      cta: 'Shop JugBow',
      badge: 'AWIN Partner',
      // AWIN program stats: EPC $0.23 | Conv 4.74% | 30-day cookie
      // Focus: training collars, leashes, no-pull harnesses, recall training
      productIds: ['jugbow-training-harness', 'jugbow-training-leash', 'jugbow-training-collar'],
    },
    chefpaw: {
      label: 'ChefPaw',
      home: 'https://tidd.ly/41TPa44',
      cta: 'See the ChefPaw',
      badge: 'AWIN Partner',
      // AWIN program stats: EPC $2.26 (highest) | Conv 6.96% | 30-day cookie
      // Focus: homemade dog food, fresh feeding, sensitive stomach, allergy diets
      productIds: ['chefpaw-1', 'chefpaw-2'],
    },
    rawwild: {
      label: 'Raw Wild',
      home: 'https://tidd.ly/4e36ta9',
      cta: 'Shop Raw Wild',
      badge: 'AWIN Partner',
      // AWIN program stats: EPC $1.91 | Conv 6.18% | 120-day cookie (longest!)
      // Focus: freeze-dried raw food, single-protein, sensitive stomach, allergy-friendly
      // Note: no product feed — update productIds with AWIN deep links when merchant ID confirmed
      productIds: ['rawwild-beef-chicken', 'rawwild-elk'],
    },
    crownandpaw: {
      label: 'Crown & Paw',
      home: 'https://tidd.ly/496jo7K',
      cta: 'Create your portrait',
      badge: 'AWIN Partner',
      // AWIN program stats: Conv 8.35% (highest!) | EPC $0.92 | 60-day cookie
      // Focus: custom pet portraits, gifts for dog lovers, memorial gifts
      productIds: ['crown-noble', 'crown-veteran', 'crown-count', 'crown-colonel', 'crown-princess', 'crown-mug', 'crown-socks', 'crown-tshirt'],
    },
  },
} as const;

export type AmazonCategory = keyof typeof affiliateLinks.amazon;
export type AwinMerchant = keyof typeof affiliateLinks.awin;

/** Build a full Amazon product link from an ASIN */
export function amzUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`;
}
