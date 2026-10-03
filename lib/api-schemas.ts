/**
 * Zod schemas for API request validation. Strict input validation on all routes.
 */
import { z } from "zod";

export const generateBodySchema = z.object({
  responseId: z.string().uuid().optional(),
  manualId: z.string().uuid().optional(),
  context: z.enum(["general", "work", "partner"]).default("general"),
  // Optional source tag for observability (e.g. "demo"). Never user-provided labels.
  source: z.string().optional(),
});

export const responsesPostBodySchema = z.object({
  responseId: z.string().uuid().nullish(),
  answers: z.record(z.string(), z.string().max(2000)),
});

export const sharePostBodySchema = z.object({
  manualId: z.string().uuid(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const shareDeleteBodySchema = z
  .object({
    shareLinkId: z.string().uuid().optional(),
    manualId: z.string().uuid().optional(),
  })
  .refine((d) => !!(d.shareLinkId ?? d.manualId), {
    message: "Either shareLinkId or manualId is required",
  });

export const deleteDataBodySchema = z.object({
  confirm: z.literal("DELETE_ALL_MY_DATA"),
});

export type GenerateBody = z.infer<typeof generateBodySchema>;
export type ResponsesPostBody = z.infer<typeof responsesPostBodySchema>;
export type SharePostBody = z.infer<typeof sharePostBodySchema>;
export type ShareDeleteBody = z.infer<typeof shareDeleteBodySchema>;
