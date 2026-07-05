import * as z from "zod";

export const ChatInputSchema = z.object({
  question: z.string(),
  conversation_id: z.string().optional(),
});

export type ChatInput = z.infer<typeof ChatInputSchema>;
