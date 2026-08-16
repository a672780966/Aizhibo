import { z } from 'zod';
import { StateEffectSchema } from './stateRules.js';

export const QualitySchema = z.enum([
  'DISASTER',
  'FAILURE',
  'COSTLY_SUCCESS',
  'SUCCESS',
  'GREAT_SUCCESS',
  'SPECIAL',
]);
export type Quality = z.infer<typeof QualitySchema>;

export const ViewerScopeSchema = z.enum([
  'THIS_ACTION_GROUP',
  'OTHER_ACTION_GROUPS',
  'ALL_ACTIVE',
  'ALL_DOWNED',
  'ALL_SPECTATORS',
  'ALL_VIEWERS',
]);
export type ViewerScope = z.infer<typeof ViewerScopeSchema>;

export const PlayerEffectSchema = z.object({
  scope: ViewerScopeSchema,
  op: z.enum(['DAMAGE', 'HEAL', 'SPEND_LIFE', 'GRANT_LIFE', 'REVIVE']),
  amount: z.number().optional(),
});
export type PlayerEffect = z.infer<typeof PlayerEffectSchema>;

export type ViewerEffect = PlayerEffect;

const fullResultEntrySchema = z
  .object({
    quality: QualitySchema,
    resultId: z.string(),
    worldEffects: z.array(StateEffectSchema),
    playerEffects: z.array(PlayerEffectSchema),
    narrativeId: z.string(),
    visibility: z.enum(['PUBLIC', 'DEFERRED']),
  })
  .strict();

const mapsToResultEntrySchema = z
  .object({
    quality: QualitySchema,
    mapsTo: QualitySchema,
  })
  .strict();

const unreachableResultEntrySchema = z
  .object({
    quality: QualitySchema,
    unreachable: z.literal(true),
  })
  .strict();

export const ResultEntrySchema = z
  .union([fullResultEntrySchema, mapsToResultEntrySchema, unreachableResultEntrySchema])
  .superRefine((entry, ctx) => {
    if ('resultId' in entry && 'mapsTo' in entry) {
      ctx.addIssue({
        code: 'custom',
        message: 'resultId and mapsTo are mutually exclusive',
      });
    }
  });
export type ResultEntry = z.infer<typeof ResultEntrySchema>;

export const ResultDictionarySchema = z.object({
  id: z.string(),
  entries: z.array(ResultEntrySchema),
});
export type ResultDictionary = z.infer<typeof ResultDictionarySchema>;
