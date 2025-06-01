
import { z } from "zod";

export const appSettingsSchema = z.object({
  webViewUrl: z.string().url("Please enter a valid URL for the web view.").or(z.literal('')).optional(),
  logoUrl: z.string().url("Please enter a valid URL for the logo.").or(z.literal('')).optional(),
  updateLogoOnLogin: z.boolean().optional().default(false),
  updateLogoOnSidebar: z.boolean().optional().default(false),
  updateLogoOnProfileAvatar: z.boolean().optional().default(false),
});

export type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;

export interface AppSettings {
  webViewUrl?: string | null;
  logoUrl?: string | null;
  updateLogoOnLogin?: boolean;
  updateLogoOnSidebar?: boolean;
  updateLogoOnProfileAvatar?: boolean;
}
