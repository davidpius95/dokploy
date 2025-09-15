export const WEBSITE_URL =
  process.env.PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : process.env.SITE_URL);

const BASE_PRICE_MONTHLY_ID = process.env.BASE_PRICE_MONTHLY_ID!; // Monthly plan ID
const BASE_ANNUAL_MONTHLY_ID = process.env.BASE_ANNUAL_MONTHLY_ID!; // Annual plan ID

export const getPaystackItems = (serverQuantity: number, isAnnual: boolean) => {
  const planId = isAnnual ? BASE_ANNUAL_MONTHLY_ID : BASE_PRICE_MONTHLY_ID;

  return {
    plan: planId,
    quantity: serverQuantity,
  };
};

// Paystack webhook event types
export const PAYSTACK_WEBHOOK_EVENTS = {
  SUBSCRIPTION_CREATE: "subscription.create",
  SUBSCRIPTION_DISABLE: "subscription.disable",
  SUBSCRIPTION_ENABLE: "subscription.enable",
  CHARGE_SUCCESS: "charge.success",
  CHARGE_FAILED: "charge.failed",
  INVOICE_CREATE: "invoice.create",
  INVOICE_UPDATE: "invoice.update",
} as const;

export type PaystackWebhookEvent =
  (typeof PAYSTACK_WEBHOOK_EVENTS)[keyof typeof PAYSTACK_WEBHOOK_EVENTS];
