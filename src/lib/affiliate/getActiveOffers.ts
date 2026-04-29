import offersRegistry from '../../data/affiliate-offers.json';

export interface OfferCard {
  headline: string;
  body: string;
  cta: string;
  href: string;
  rel: string;
  disclosure: string;
}

export interface Offer {
  id: string;
  enabled: boolean;
  intent: string;
  pageTypes: string[];
  placement: string;
  priority: number;
  topicTags: string[];
  claimSensitivityBlock: string | null;
  card: OfferCard;
}

export interface OfferParams {
  pageType: string;
  placement: string;
  topicTags: string[];
  monetizationIntent?: string;
  claimSensitivity?: string;
}

export function getActiveOffers(params: OfferParams): Offer[] {
  const { pageType, placement, topicTags, monetizationIntent, claimSensitivity } = params;

  return (offersRegistry.offers as Offer[])
    .filter(offer => {
      if (!offer.enabled) return false;
      if (offer.placement !== placement) return false;
      if (!offer.pageTypes.includes(pageType)) return false;
      if (offer.claimSensitivityBlock && claimSensitivity === offer.claimSensitivityBlock) return false;
      const hasTagMatch = topicTags.some(t => offer.topicTags.includes(t));
      const hasIntentMatch = monetizationIntent ? offer.intent === monetizationIntent : true;
      return hasTagMatch || hasIntentMatch;
    })
    .sort((a, b) => b.priority - a.priority);
}
