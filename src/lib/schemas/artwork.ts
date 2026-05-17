import { z } from 'zod';

// Constants that must match the DB CHECK constraints / enums (see supabase/migrations/0001_init.sql).
const PRICE_MAX = 1_000_000;

export const POSTER_SIZES = ['A4', 'A3', 'A2'] as const;
export const PAINTING_MEDIUMS = ['watercolor', 'oil', 'acrylic', 'mixed_media'] as const;
export const PHOTO_PAPERS = ['fiber', 'archival_pigment', 'silver_gelatin', 'platinum'] as const;

export const AGENT_STYLES = ['firm', 'friendly', 'scholarly'] as const;

const sellerAgentSchema = z.object({
  style: z.enum(AGENT_STYLES),
  urgency: z.number().int().min(1).max(5),
  persona_prompt: z.string().max(500).optional().or(z.literal('')),
});

const posterMetaSchema = z.object({
  size: z.enum(POSTER_SIZES),
  print_run: z.number().int().min(1).max(10_000),
  signed: z.boolean(),
  edition_no: z.number().int().min(1).max(10_000).optional(),
});

const paintingMetaSchema = z.object({
  medium: z.enum(PAINTING_MEDIUMS),
  width_cm: z.number().positive().max(500),
  height_cm: z.number().positive().max(500),
});

const photographyMetaSchema = z.object({
  print_size: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9x]+$/, 'Use formats like A3, A2, 50x75, 70x100'),
  paper: z.enum(PHOTO_PAPERS),
  edition_size: z.number().int().min(1).max(10_000).nullable(),
});

const basePriceFields = {
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000),
  price_start: z.number().nonnegative().max(PRICE_MAX),
  price_floor: z.number().nonnegative().max(PRICE_MAX),
  image_url: z.string().url().optional().or(z.literal('')),
  thumb_url: z.string().url().optional().or(z.literal('')),
  seller_agent: sellerAgentSchema,
};

const posterForm = z.object({
  ...basePriceFields,
  category: z.literal('poster'),
  category_meta: posterMetaSchema,
});

const paintingForm = z.object({
  ...basePriceFields,
  category: z.literal('painting'),
  category_meta: paintingMetaSchema,
});

const photographyForm = z.object({
  ...basePriceFields,
  category: z.literal('photography'),
  category_meta: photographyMetaSchema,
});

// Client-side form schema. Cross-field price constraint (floor ≤ start) is
// enforced manually in the form's onSubmit handler and again on the server
// (see crossFieldOk below + the listing server action).
export const artworkFormSchema = z.discriminatedUnion('category', [
  posterForm,
  paintingForm,
  photographyForm,
]);

export function crossFieldOk(data: { price_start: number; price_floor: number }) {
  return data.price_floor <= data.price_start;
}

export type ArtworkForm = z.infer<typeof artworkFormSchema>;
export type ArtworkFormInput = z.input<typeof artworkFormSchema>;
