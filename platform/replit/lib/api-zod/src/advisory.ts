import { z } from "zod";

export const AdvisoryRequestSchema = z
  .object({
    mode: z.enum(["preview", "model"]),
    crop: z.enum([
      "Rice",
      "Wheat",
      "Maize",
      "Cotton",
      "Sugarcane",
      "Soybean",
      "Tomato",
      "Potato",
    ]),
    candidates: z
      .array(
        z
          .object({
            condition: z.string().trim().min(1).max(100),
            confidence: z.number().min(0).max(1),
          })
          .strict(),
      )
      .min(1)
      .max(3),
    severity: z.enum(["low", "moderate", "high"]),
    symptoms: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
    affectedPart: z.string().trim().max(100).optional(),
    affectedAreaPercentage: z.number().min(0).max(100).optional(),
    nearbyPlantsAffected: z.boolean().optional(),
    weather: z
      .object({
        temperatureCelsius: z.number().finite().optional(),
        relativeHumidityPercentage: z.number().min(0).max(100).optional(),
        precipitationMm: z.number().min(0).optional(),
      })
      .strict()
      .optional(),
    locale: z.string().trim().min(2).max(20).optional(),
  })
  .strict();

export const AdvisoryResponseSchema = z
  .object({
    source: z.enum(["gemini", "fallback"]),
    model: z.string().max(100).nullable(),
    summary: z.string().trim().min(1).max(600),
    uncertainty: z.string().trim().min(1).max(400),
    nextSteps: z.array(z.string().trim().min(1).max(240)).min(1).max(3),
    safetyNote: z.string().trim().min(1).max(300),
    generatedAt: z.string().datetime(),
  })
  .strict();

export type AdvisoryRequest = z.infer<typeof AdvisoryRequestSchema>;
export type AdvisoryResponse = z.infer<typeof AdvisoryResponseSchema>;
