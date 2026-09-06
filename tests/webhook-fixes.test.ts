import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyRetellSignature } from '../lib/security';
import { classifyOptOutKeyword, setCustomerOptedOut, clearCustomerOptOut, isCustomerOptedOut, sendBusinessSms } from '../lib/sms-compliance';
import { redactObject, redactMessage } from '../lib/recovery/redaction';

const SECRET = 'retell-webhook-key-test';

// Signs a payload exactly the way Retell does (mirrors
// node_modules/retell-sdk/src/lib/webhook_auth.ts) so the tests prove the
// route accepts genuine Retell traffic.
function signLikeRetell(rawBody: string, secret = SECRET, timestamp = Date.now()): string {
  const digest = crypto.createHmac('sha256', secret).update(`${rawBody}${timestamp}`).digest('hex');
  return `v=${timestamp},d=${digest}`;
}

describe('verifyRetellSignature (Retell SDK scheme: v={ts},d={hmac(body+ts)})', () => {
  const body = JSON.stringify({ call_id: 'abc', metadata: { business_id: 'biz1' } });
  const candidates = [SECRET];

  it('accepts a signature built exactly like the Retell SDK builds it', () => {
    expect(verifyRetellSignature(body, signLikeRetell(body), candidates)).toBe(true);
  });

  it('accepts the signature when the correct key is the fallback candidate', () => {
    // Routes pass [RETELL_WEBHOOK_SECRET, RETELL_API_KEY] — the badge key may
    // be configured under either env var.
    expect(verifyRetellSignature(body, signLikeRetell(body), [undefined, SECRET])).toBe(true);
  });

  it('rejects a signature made with a different secret', () => {
    expect(verifyRetellSignature(body, signLikeRetell(body, 'wrong-secret'), candidates)).toBe(false);
  });

  it('rejects a signature over different body content', () => {
    expect(verifyRetellSignature(body, signLikeRetell('{"call_id":"tampered"}'), candidates)).toBe(false);
  });

  it('rejects stale timestamps beyond the 5-minute replay window', () => {
    const stale = Date.now() - 6 * 60 * 1000;
    expect(verifyRetellSignature(body, signLikeRetell(body, SECRET, stale), candidates)).toBe(false);
  });

  it('accepts a timestamp inside the 5-minute window', () => {
    const recent = Date.now() - 4 * 60 * 1000;
    expect(verifyRetellSignature(body, signLikeRetell(body, SECRET, recent), candidates)).toBe(true);
  });

  it('rejects a future timestamp beyond the replay window', () => {
    const future = Date.now() + 6 * 60 * 1000;
    expect(verifyRetellSignature(body, signLikeRetell(body, SECRET, future), candidates)).toBe(false);
  });

  it('rejects the old bare-hex-body-only scheme (the bug that was fixed)', () => {
    const bareHex = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
    expect(verifyRetellSignature(body, bareHex, candidates)).toBe(false);
  });

  it('fails closed when the signature header is missing', () => {
    expect(verifyRetellSignature(body, null, candidates)).toBe(false);
  });

  it('fails closed when no candidate secret is set', () => {
    expect(verifyRetellSignature(body, signLikeRetell(body), [undefined, undefined])).toBe(false);
    expect(verifyRetellSignature(body, signLikeRetell(body), [])).toBe(false);
  });

  it('rejects garbage signature formats', () => {
    expect(verifyRetellSignature(body, 'garbage', candidates)).toBe(false);
    expect(verifyRetellSignature(body, 'v=notanumber,d=abc', candidates)).toBe(false);
  });
});

describe('SMS opt-out (TCPA) enforcement', () => {
  it('classifies STOP-family keywords as opt-out', () => {
    for (const kw of ['STOP', 'stop', 'Stop.', ' STOP ', 'UNSUBSCRIBE', 'unsubscribe', 'STOPALL', 'STOP ALL']) {
      expect(classifyOptOutKeyword(kw)).toBe('opt_out');
    }
  });

  it('classifies START-family keywords as opt-in', () => {
    for (const kw of ['START', 'start', 'UNSTOP', 'unstop']) {
      expect(classifyOptOutKeyword(kw)).toBe('opt_in');
    }
  });

  it('does not classify normal conversation as opt keywords', () => {
    for (const kw of ['Can I book tomorrow at 3?', '1', '2', '3', 'hello', 'What are your hours?', '']) {
      expect(classifyOptOutKeyword(kw)).toBeNull();
    }
  });

  it('does NOT treat "cancel" as opt-out — customers cancel appointments by text', () => {
    // The AI chat flow tells customers to cancel/reschedule by replying, so
    // ambiguous words must not unsubscribe them. Only unambiguous STOP-family
    // words opt out (see OPT_OUT_KEYWORDS in lib/sms-compliance.ts).
    expect(classifyOptOutKeyword('cancel')).toBeNull();
    expect(classifyOptOutKeyword('cancel my appointment')).toBeNull();
    expect(classifyOptOutKeyword('I want to end this conversation')).toBeNull();
  });

  it('setCustomerOptedOut blocks sends through sendBusinessSms and START clears it', async () => {
    const business = { business_id: 'biz-optout-test', twilio_number: '+18885550001' };
    // Approved compliance record so the only blocker left is the opt-out flag.
    const { smsComplianceCollection } = await import('../lib/astra');
    await smsComplianceCollection.updateOne(
      { business_id: 'biz-optout-test' },
      { $set: { status: 'approved', sms_tollfree_number: '+18885550001' } },
      { upsert: true }
    );

    expect(await isCustomerOptedOut('biz-optout-test', '+15551234567')).toBe(false);

    await setCustomerOptedOut('biz-optout-test', '+15551234567');
    expect(await isCustomerOptedOut('biz-optout-test', '+15551234567')).toBe(true);

    // Blocked before any Twilio call is attempted.
    const blocked = await sendBusinessSms(business, { to: '+15551234567', body: 'reminder' });
    if (blocked.ok) throw new Error(`expected opt-out block, got send sid ${blocked.sid}`);
    expect(blocked.reason).toBe('opted_out');

    // whatsapp:-prefixed numbers hit the same opt-out record.
    const blockedWa = await sendBusinessSms(business, { to: 'whatsapp:+15551234567', body: 'reminder', channel: 'WhatsApp' });
    if (blockedWa.ok) throw new Error('expected opt-out block on WhatsApp send');
    expect(blockedWa.reason).toBe('opted_out');

    await clearCustomerOptOut('biz-optout-test', '+15551234567');
    expect(await isCustomerOptedOut('biz-optout-test', '+15551234567')).toBe(false);
  });

  it('opt-out records are scoped per business', async () => {
    await setCustomerOptedOut('biz-optout-a', '+15559990000');
    expect(await isCustomerOptedOut('biz-optout-b', '+15559990000')).toBe(false);
  });
});

describe('recovery redaction: customer PII never reaches GPT or incidents', () => {
  it('redacts E.164 phone numbers in strings and nested objects', () => {
    const out = redactObject({
      summary: 'Call failed for customer at +15551234567',
      nested: { description: 'Customer Phone: +15551234567 (home)' },
    }) as Record<string, any>;
    expect(JSON.stringify(out)).not.toContain('+15551234567');
    expect(out.summary).toContain('[REDACTED]');
  });

  it('redacts NANP-formatted phone numbers', () => {
    const out = redactMessage('Reached (415) 555-1234 but no answer, also tried 415-555-9876');
    expect(out).not.toContain('415');
    expect(out).not.toContain('555-1234');
    expect(out).not.toContain('555-9876');
  });

  it('redacts email addresses', () => {
    const out = redactObject({
      detail: 'Confirmation sent to john.doe@example.com and support@business.co',
    }) as Record<string, any>;
    expect(out.detail).not.toContain('john.doe@example.com');
    expect(out.detail).not.toContain('support@business.co');
  });

  it('still redacts tokens and SIDs alongside the new PII patterns', () => {
    const sid = 'AC' + 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'.slice(0, 32);
    const out = redactMessage(`token dead for ${sid}, customer +15551234567, ops@team.io`);
    expect(out).not.toContain(sid);
    expect(out).not.toContain('+15551234567');
    expect(out).not.toContain('ops@team.io');
  });
});
