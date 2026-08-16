import { describe, expect, it } from 'vitest';
import { CharacterAssetSchema, ImageAssetSchema, VisualSceneSchema } from './visuals.js';

describe('VisualScene', () => {
  it('parses a scene with layers and optional camera preset', () => {
    const scene = {
      id: 'vs-opening',
      layers: [
        { assetId: 'img-bg', z: 0, parallax: 0.2 },
        { assetId: 'char-guard', z: 10 },
      ],
      cameraPreset: 'closeup',
    };
    expect(VisualSceneSchema.parse(scene).layers).toHaveLength(2);
  });

  it('rejects a layer without z', () => {
    expect(
      VisualSceneSchema.safeParse({ id: 'vs-x', layers: [{ assetId: 'img-bg' }] }).success,
    ).toBe(false);
  });
});

describe('CharacterAsset', () => {
  it('parses an asset with expression map', () => {
    const asset = {
      id: 'char-guard',
      expressions: { neutral: 'img-guard-neutral', angry: 'img-guard-angry' },
      microAnimations: ['wave'],
      defaultExpression: 'neutral',
    };
    expect(CharacterAssetSchema.parse(asset).defaultExpression).toBe('neutral');
  });

  it('rejects a non-string defaultExpression', () => {
    const bad = { id: 'char-x', expressions: { neutral: 'img' }, defaultExpression: 42 };
    expect(CharacterAssetSchema.safeParse(bad).success).toBe(false);
  });
});

describe('ImageAsset', () => {
  it('parses a plain image asset', () => {
    expect(ImageAssetSchema.parse({ id: 'img-bg', file: 'assets/bg.png' }).file).toBe(
      'assets/bg.png',
    );
  });
});
