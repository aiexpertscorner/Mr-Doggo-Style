---
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  return rss({
    title: 'Mr. Doggo Style — Dog Product Reviews',
    description: 'Brutally honest dog gear reviews. Zero paid placements.',
    site: context.site,
    items: posts
      .sort((a,b) => new Date(b.data.pubDate) - new Date(a.data.pubDate))
      .map(post => ({
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: `/blog/${post.slug}/`,
      })),
    customData: `<language>en-us</language>`,
  });
}
