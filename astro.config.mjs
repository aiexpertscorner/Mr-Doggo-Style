import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://pupwiki.com',
  integrations: [
    tailwind(),
    // sitemap() disabled — using public/sitemap-index.xml via generate-sitemap.mjs
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
