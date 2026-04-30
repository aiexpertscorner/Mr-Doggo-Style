import bannerRegistry from '../../data/affiliate-banners.json';

type BannerType = 'image_link' | 'html_snippet';

export type AffiliateBannerConfig = {
  id: string;
  advertiser: string;
  network?: string;
  enabled?: boolean;
  priority?: number;
  label?: string;
  type: BannerType;
  href?: string;
  imageSrc?: string;
  mobileImageSrc?: string;
  desktopImageSrc?: string;
  alt?: string;
  htmlSnippet?: string;
  noteText?: string;
  placements?: string[];
  pageTypes?: string[];
  topicTags?: string[];
  excludePageTypes?: string[];
  excludeTopicTags?: string[];
  startAt?: string;
  endAt?: string;
  rel?: string;
  openInNewTab?: boolean;
  imageFit?: 'cover' | 'contain';
};

type BannerRegistry = typeof bannerRegistry;

export type BannerSlotContext = {
  pageType?: string;
  placement?: string;
  topic?: string;
  topicTags?: string[];
  isMedical?: boolean;
  currentDate?: Date;
};

const registry = bannerRegistry as BannerRegistry;

const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();

function inDateWindow(banner: AffiliateBannerConfig, currentDate: Date) {
  if (!banner.startAt && !banner.endAt) return true;

  const now = currentDate.getTime();
  const start = banner.startAt ? new Date(banner.startAt).getTime() : null;
  const end = banner.endAt ? new Date(banner.endAt).getTime() : null;

  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function matchesList(ruleList: string[] | undefined, value: string) {
  if (!ruleList || ruleList.length === 0) return true;
  const normalized = ruleList.map(normalize);
  return normalized.includes(value);
}

function excludesList(ruleList: string[] | undefined, value: string) {
  if (!ruleList || ruleList.length === 0) return false;
  const normalized = ruleList.map(normalize);
  return normalized.includes(value);
}

function buildTagSet(context: BannerSlotContext) {
  const values = [
    context.topic,
    ...(context.topicTags ?? []),
  ]
    .map(normalize)
    .filter(Boolean);

  return new Set(values);
}

export function getAllAffiliateBanners() {
  return registry.banners as AffiliateBannerConfig[];
}

export function getActiveAffiliateBanners(context: BannerSlotContext = {}) {
  const currentDate = context.currentDate ?? new Date();
  const normalizedPageType = normalize(context.pageType);
  const normalizedPlacement = normalize(context.placement);
  const tagSet = buildTagSet(context);

  const results = getAllAffiliateBanners()
    .filter((banner) => Boolean(banner.enabled))
    .filter((banner) => inDateWindow(banner, currentDate))
    .filter((banner) => !context.isMedical)
    .filter((banner) => matchesList(banner.pageTypes, normalizedPageType))
    .filter((banner) => matchesList(banner.placements, normalizedPlacement))
    .filter((banner) => !excludesList(banner.excludePageTypes, normalizedPageType))
    .filter((banner) => {
      if (!banner.topicTags || banner.topicTags.length === 0) return true;
      return banner.topicTags.map(normalize).some((tag) => tagSet.has(tag));
    })
    .filter((banner) => {
      if (!banner.excludeTopicTags || banner.excludeTopicTags.length === 0) return true;
      return !banner.excludeTopicTags.map(normalize).some((tag) => tagSet.has(tag));
    })
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return results;
}

export function getFirstAffiliateBanner(context: BannerSlotContext = {}) {
  return getActiveAffiliateBanners(context)[0] ?? null;
}

export function getAffiliateBannerById(id: string) {
  const normalizedId = normalize(id);
  return getAllAffiliateBanners().find((item) => normalize(item.id) === normalizedId) ?? null;
}
