import * as z from "zod";

export const SignupInputSchema = z.object({
  name: z.string().min(3),
  email: z.email(),
  password: z.string().min(6),
});

export type SignupInput = z.infer<typeof SignupInputSchema>;

export const LoginInputSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
