import { z } from 'zod';

export const VisualLayerSchema = z.object({
  assetId: z.string(),
  z: z.number(),
  parallax: z.number().optional(),
});
export type VisualLayer = z.infer<typeof VisualLayerSchema>;

export const VisualSceneSchema = z.object({
  id: z.string(),
  layers: z.array(VisualLayerSchema),
  cameraPreset: z.string().optional(),
});
export type VisualScene = z.infer<typeof VisualSceneSchema>;

export const CharacterAssetSchema = z.object({
  id: z.string(),
  expressions: z.record(z.string(), z.string()),
  microAnimations: z.array(z.string()).optional(),
  defaultExpression: z.string(),
});
export type CharacterAsset = z.infer<typeof CharacterAssetSchema>;

export const ImageAssetSchema = z.object({
  id: z.string(),
  file: z.string(),
});
export type ImageAsset = z.infer<typeof ImageAssetSchema>;
