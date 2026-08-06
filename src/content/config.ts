import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    author: z.string().default("Cas-Per"),
    image: z.string().default("/assets/annuncifunebri_pc-1.jpg"),
    imageAlt: z.string(),
    showDate: z.boolean().default(true),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
