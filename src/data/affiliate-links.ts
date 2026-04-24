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
      home: 'https://www.jugbow.com',
      cta: 'Shop JugBow',
      badge: 'AWIN Partner',
    },
    chefpaw: {
      label: 'ChefPaw',
      home: 'https://www.chefpaw.com',
      cta: 'Shop ChefPaw',
      badge: 'AWIN Partner',
    },
    rawwild: {
      label: 'Raw Wild',
      home: 'https://www.rawwild.com',
      cta: 'Shop Raw Wild',
      badge: 'AWIN Partner',
    },
    crownandpaw: {
      label: 'Crown & Paw',
      home: 'https://www.crownandpaw.com',
      cta: 'Shop Crown & Paw',
      badge: 'AWIN Partner',
    },
  },
} as const;

export type AmazonCategory = keyof typeof affiliateLinks.amazon;
export type AwinMerchant = keyof typeof affiliateLinks.awin;

/** Build a full Amazon product link from an ASIN */
export function amzUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`;
}
