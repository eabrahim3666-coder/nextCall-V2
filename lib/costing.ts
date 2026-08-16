export type CostRates = {
  /** COGS per voice minute (Retell + telephony + LLM), dollars. */
  voicePerMinute: number;
  /** COGS per outbound+inbound SMS message, dollars. */
  smsPerMessage: number;
  /** COGS per WhatsApp message, dollars. */
  whatsappPerMessage: number;
  /** Fixed monthly per-phone-number cost. */
  phoneNumberPerMonth: number;
};

export const DEFAULT_COST_RATES: CostRates = {
  voicePerMinute: 0.13,
  smsPerMessage: 0.01,
  whatsappPerMessage: 0.015,
  phoneNumberPerMonth: 2,
};

function readEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function costRates(): CostRates {
  return {
    voicePerMinute: readEnv("NEXTCALL_COGS_VOICE_PER_MIN", DEFAULT_COST_RATES.voicePerMinute),
    smsPerMessage: readEnv("NEXTCALL_COGS_SMS_PER_MSG", DEFAULT_COST_RATES.smsPerMessage),
    whatsappPerMessage: readEnv("NEXTCALL_COGS_WHATSAPP_PER_MSG", DEFAULT_COST_RATES.whatsappPerMessage),
    phoneNumberPerMonth: readEnv("NEXTCALL_COGS_PHONE_PER_MONTH", DEFAULT_COST_RATES.phoneNumberPerMonth),
  };
}

/** Monthly subscription revenue we charge for a given plan. */
export function planRevenue(plan: string | undefined | null): number {
  switch (plan || "trial") {
    case "premium":
      return 399;
    case "standard":
      return 299;
    default:
      return 0;
  }
}

export type UsageCost = {
  voiceMinutes: number;
  smsMessages: number;
  whatsappMessages: number;
  phoneNumbers: number;
  voiceCost: number;
  smsCost: number;
  whatsappCost: number;
  phoneCost: number;
  totalCost: number;
  revenue: number;
  net: number;
  marginPct: number;
};

export function computeUsageCost(input: {
  voiceMinutes?: number;
  smsMessages?: number;
  whatsappMessages?: number;
  phoneNumbers?: number;
  plan?: string | undefined | null;
  rates?: CostRates;
}): UsageCost {
  const rates = input.rates || costRates();
  const voiceMinutes = Math.round((input.voiceMinutes || 0));
  const smsMessages = input.smsMessages || 0;
  const whatsappMessages = input.whatsappMessages || 0;
  const phoneNumbers = Math.max(0, input.phoneNumbers || 0);

  const voiceCost = voiceMinutes * rates.voicePerMinute;
  const smsCost = smsMessages * rates.smsPerMessage;
  const whatsappCost = whatsappMessages * rates.whatsappPerMessage;
  const phoneCost = phoneNumbers * rates.phoneNumberPerMonth;
  const totalCost = voiceCost + smsCost + whatsappCost + phoneCost;
  const revenue = planRevenue(input.plan);
  const net = revenue - totalCost;
  const marginPct = revenue > 0 ? Math.max(0, (net / revenue) * 100) : 0;

  return {
    voiceMinutes,
    smsMessages,
    whatsappMessages,
    phoneNumbers,
    voiceCost,
    smsCost,
    whatsappCost,
    phoneCost,
    totalCost,
    revenue,
    net,
    marginPct,
  };
}

export const money = (n: number): string =>
  "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
