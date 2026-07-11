import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, string> = {};

  // Check required environment variables
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

  for (const v of requiredVars) {
    checks[v] = process.env[v] ? 'set' : 'missing';
  }

  // Check optional but important variables
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

  const allEssential = requiredVars.every(v => process.env[v]);
  const status = allEssential ? 'healthy' : 'degraded';

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    checks,
  }, { status: allEssential ? 200 : 503 });
}
