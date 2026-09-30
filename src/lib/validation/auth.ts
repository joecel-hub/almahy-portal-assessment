import { z } from "zod";

export const loginSchema = z.object({
  // Normalise first, then validate: " Admin@Almahy.demo " is accepted as admin@almahy.demo.
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password").max(200),
});

export type LoginInput = z.input<typeof loginSchema>;
