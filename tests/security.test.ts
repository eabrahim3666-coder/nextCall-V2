import { describe, it, expect } from 'vitest';
import { hasValidSecret, escapeHtml, isSafeWebhookUrl } from '../lib/security';

describe('hasValidSecret', () => {
  it('returns true when header matches secret', () => {
    expect(hasValidSecret('Bearer my-secret', 'Bearer my-secret')).toBe(true);
  });

  it('returns false when header does not match', () => {
    expect(hasValidSecret('Bearer wrong', 'Bearer right')).toBe(false);
  });

  it('returns false when header is undefined', () => {
    expect(hasValidSecret(undefined, 'Bearer secret')).toBe(false);
  });

  it('returns true with sha256= prefix format', () => {
    expect(hasValidSecret('sha256=abc123', 'sha256=abc123')).toBe(true);
  });
});

describe('escapeHtml', () => {
  it('escapes & < > " \'', () => {
    expect(escapeHtml('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('passes through safe strings', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('isSafeWebhookUrl', () => {
  it('allows zapier URLs', () => {
    expect(isSafeWebhookUrl('https://hooks.zapier.com/hooks/catch/123/abc/')).toBe(true);
  });

  it('blocks private IP URLs', () => {
    expect(isSafeWebhookUrl('http://127.0.0.1:3000/webhook')).toBe(false);
    expect(isSafeWebhookUrl('http://192.168.1.1/webhook')).toBe(false);
    expect(isSafeWebhookUrl('http://10.0.0.1/webhook')).toBe(false);
  });

  it('allows make.com URLs', () => {
    expect(isSafeWebhookUrl('https://hook.make.com/abc123')).toBe(true);
  });

  it('blocks unknown/non-https URLs', () => {
    expect(isSafeWebhookUrl('http://evil.com/steal')).toBe(false);
  });
});
