import { z } from 'zod';

const ttsSpecSchema = z.object({
  voiceId: z.string(),
  voiceSettings: z.record(z.string(), z.union([z.number(), z.string()])),
});

const audioBase = {
  id: z.string(),
  kind: z.enum(['SPEECH', 'BGM', 'SFX', 'AMBIENCE']),
  loop: z.boolean().optional(),
  gain: z.number().optional(),
};

export const AudioAssetSchema = z.union([
  z.object({
    ...audioBase,
    source: z.enum(['PREPRODUCED', 'PREGENERATED']),
    file: z.string(),
  }),
  z.object({
    ...audioBase,
    source: z.literal('RUNTIME_TTS'),
    ttsSpec: ttsSpecSchema,
  }),
]);
export type AudioAsset = z.infer<typeof AudioAssetSchema>;
