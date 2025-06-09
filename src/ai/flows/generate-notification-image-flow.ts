
'use server';
/**
 * @fileOverview A Genkit flow to generate an image for notifications based on a text prompt.
 *
 * - generateNotificationImage - A function that handles image generation.
 * - GenerateNotificationImageInput - The input type for the flow.
 * - GenerateNotificationImageOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateNotificationImageInputSchema = z.object({
  prompt: z.string().min(3, "Prompt must be at least 3 characters.").max(500, "Prompt must be at most 500 characters.").describe('The text prompt to generate an image from.'),
});
export type GenerateNotificationImageInput = z.infer<typeof GenerateNotificationImageInputSchema>;

const GenerateNotificationImageOutputSchema = z.object({
  imageUrl: z.string().url().describe('The data URI of the generated image. Expected format: \'data:image/png;base64,<encoded_data>\'.'),
});
export type GenerateNotificationImageOutput = z.infer<typeof GenerateNotificationImageOutputSchema>;

export async function generateNotificationImage(input: GenerateNotificationImageInput): Promise<GenerateNotificationImageOutput> {
  return generateNotificationImageFlow(input);
}

const generateNotificationImageFlow = ai.defineFlow(
  {
    name: 'generateNotificationImageFlow',
    inputSchema: GenerateNotificationImageInputSchema,
    outputSchema: GenerateNotificationImageOutputSchema,
  },
  async (input) => {
    try {
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // IMPORTANT: Only this model supports image generation currently
        prompt: `Generate a visually appealing and relevant image for a notification based on the following theme or keywords: ${input.prompt}. The image should be suitable for a general audience and clearly represent the prompt. Avoid text in the image. Keep it simple yet informative.`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE
          // Optional: Add safetySettings if needed, though default should be reasonable
          // safetySettings: [ { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE',}, ],
        },
        // You can add more generation config here, like number of candidates, temperature etc.
        // For images, specific parameters like aspect ratio might be available depending on model updates.
      });

      if (media && media.url) {
        return { imageUrl: media.url };
      } else {
        throw new Error('Image generation succeeded but no media URL was returned.');
      }
    } catch (error: any) {
      console.error('Error in generateNotificationImageFlow:', error);
      // It's good practice to throw a more user-friendly or structured error
      // or one that can be easily identified by the calling client.
      let errorMessage = "Failed to generate image.";
      if (error.message) {
        errorMessage += ` Details: ${error.message}`;
      }
      if (error.finishReason) {
         errorMessage += ` Finish Reason: ${error.finishReason}`;
      }
      // Check for specific error types or messages from Genkit/Gemini if known
      if (error.message && error.message.includes("SAFETY")) {
        errorMessage = "Image generation was blocked due to safety settings. Please try a different prompt.";
      } else if (error.message && error.message.includes("quota")) {
        errorMessage = "Image generation failed due to quota limits. Please try again later.";
      }
      
      throw new Error(errorMessage);
    }
  }
);

    