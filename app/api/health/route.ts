import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Inlined constant-time Bearer check — importing lib/security here would drag
// the Twilio SDK into this lightweight endpoint's bundle.
function isTrustedCaller(request: Request): boolean {
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined;
  const provided = request.headers.get('authorization');
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const requiredVars = [
    'ASTRA_DB_APPLICATION_TOKEN',
    'ASTRA_DB_ID',
    'ASTRA_DB_REGION',
    'ASTRA_DB_KEYSPACE',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'OPENAI_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
  ] as const;

  const allEssential = requiredVars.every(v => process.env[v]);
  const status = allEssential ? 'healthy' : 'degraded';

  // Only a trusted caller (uptime tool / ops, holding CRON_SECRET) gets the
  // per-variable detail — a public response listing which secrets are set is
  // free recon information.
  const trusted = isTrustedCaller(request);

  if (!trusted) {
    return NextResponse.json(
      { status, timestamp: new Date().toISOString() },
      { status: allEssential ? 200 : 503 }
    );
  }

  const checks: Record<string, string> = {};
  for (const v of requiredVars) {
    checks[v] = process.env[v] ? 'set' : 'missing';
  }

  const optionalVars = [
    'RESEND_API_KEY',
    'STRIPE_SECRET_KEY',
    'PADDLE_WEBHOOK_SECRET',
    'RETELL_WEBHOOK_SECRET',
    'META_APP_SECRET',
    'CRON_SECRET',
  ] as const;

  for (const v of optionalVars) {
    if (process.env[v]) checks[v] = 'set';
  }

  return NextResponse.json(
    { status, timestamp: new Date().toISOString(), checks },
    { status: allEssential ? 200 : 503 }
  );
}
