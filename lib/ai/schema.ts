import { z } from "zod";

export const BotResponseSchema = z.object({
  message: z.string().min(1).max(2000),
  internal_note: z.string().nullish(),
  extracted_data: z
    .object({
      name: z.string().nullish(),
      email: z.string().nullish(),
      phone: z.string().nullish(),
      intent: z.string().nullish(),
      budget: z.string().nullish(),
      timeline: z.string().nullish(),
      custom: z.record(z.unknown()).optional(),
    })
    .default({}),
  lead_score_delta: z
    .number()
    .transform((n) => Math.round(Math.max(-50, Math.min(50, n)))),
  temperature: z.enum(["cold", "warm", "hot"]),
  action: z.enum([
    "continue",
    "request_handoff",
    "schedule",
    "send_link",
    "end_conversation",
  ]),
  action_payload: z.record(z.unknown()).nullable(),
});

export type BotResponse = z.infer<typeof BotResponseSchema>;
