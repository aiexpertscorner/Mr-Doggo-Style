import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    // Core
    title:         z.string(),
    description:   z.string(),
    pubDate:       z.coerce.date(),
    updatedDate:   z.coerce.date().optional(),
    author:        z.string().default('The PupWiki Team'),

    // Classification
    category:      z.string().default('Reviews'),
    tags:          z.array(z.string()).default([]),

    // Cluster type
    postType:      z.enum(['product-roundup','comparison','breed-hub','how-to','health','ranking','cost-calculator','general']).default('general'),

    // Breed context
    breedSlug:     z.string().optional(),
    breedName:     z.string().optional(),
    breedSize:     z.string().optional(),
    breedEnergy:   z.string().optional(),
    breedCoat:     z.string().optional(),

    // SEO / media
    heroImage:     z.string().optional(),
    heroImageAlt:  z.string().optional(),
    readTime:      z.number().optional(),
    noIndex:       z.boolean().default(false),

    // Sidebar product widget
    topProduct:    z.object({
      name:    z.string(),
      asin:    z.string(),
      price:   z.number().optional(),
      rating:  z.number().optional(),
      image:   z.string().optional(),
    }).optional(),

    // Schema hint for BlogLayout
    schemaType:    z.enum(['Article','FAQPage','HowTo','Review']).default('Article'),
  }),
});

export const collections = { blog };
