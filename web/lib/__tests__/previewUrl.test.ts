import { describe, expect, it } from 'vitest';
const { validateVercelPreviewBaseUrl } = require('../../scripts/validate-vercel-preview.cjs') as {
  validateVercelPreviewBaseUrl: (value: string) => string;
};

describe('validateVercelPreviewBaseUrl', () => {
  it('accepts this project’s Vercel deployment URLs and returns a normalized origin', () => {
    expect(validateVercelPreviewBaseUrl(
      'https://mahjong-copilot-4ljpmkjil-justin-elrods-projects.vercel.app/'
    )).toBe('https://mahjong-copilot-4ljpmkjil-justin-elrods-projects.vercel.app');
  });

  it.each([
    'http://mahjong-copilot-4ljpmkjil-justin-elrods-projects.vercel.app',
    'https://attacker.example',
    'https://mahjong-copilot-4ljpmkjil-justin-elrods-projects.vercel.app.attacker.example',
    'https://16bitmahjong.co',
    'https://user:password@mahjong-copilot-4ljpmkjil-justin-elrods-projects.vercel.app',
    'https://mahjong-copilot-4ljpmkjil-justin-elrods-projects.vercel.app:8443',
    'https://mahjong-copilot-4ljpmkjil-justin-elrods-projects.vercel.app/other-path',
    'https://mahjong-copilot-4ljpmkjil-justin-elrods-projects.vercel.app/?redirect=attacker',
  ])('rejects unsafe preview URL %s', url => {
    expect(() => validateVercelPreviewBaseUrl(url)).toThrow();
  });
});
