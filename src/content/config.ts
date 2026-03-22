import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    image: z.string().optional(),
    category: z.string().default('Reviews'),
    tags: z.array(z.string()).default([]),
    author: z.string().default('The Mr. Doggo Style Team'),
  }),
});

export const collections = { blog };
