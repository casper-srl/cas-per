import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    author: z.string().default("Cas-Per"),
    image: z.string().default("/assets/annuncifunebri_pc-1.jpg"),
    imageAlt: z.string(),
    intro: z.array(z.string()).optional(),
    showDate: z.boolean().default(true),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
