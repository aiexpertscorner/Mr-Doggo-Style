import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  return rss({
    title: 'Mr. Doggo Style — Dog Product Reviews & Breed Guides',
    description: 'Expert-tested dog product reviews, breed-specific guides, and honest comparisons.',
    site: context.site,
    items: posts
      .filter(p => !p.data.noIndex)
      .sort((a, b) => new Date(b.data.pubDate) - new Date(a.data.pubDate))
      .slice(0, 100)
      .map(post => ({
        title:       post.data.title,
        pubDate:     post.data.pubDate,
        description: post.data.description,
        link:        `/blog/${post.slug}/`,
        categories:  post.data.tags || [],
      })),
    customData: `<language>en-us</language>`,
  });
}
