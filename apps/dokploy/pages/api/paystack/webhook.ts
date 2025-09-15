import { findUserById } from "@dokploy/server";
import { db } from "@dokploy/server/db";
import { organization, server, users_temp } from "@dokploy/server/db/schema";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";
import { updateServersBasedOnQuantity } from "@/server/utils/server-management";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper functions
const disableServers = async (userId: string) => {
  const organizations = await db.query.organization.findMany({
    where: eq(organization.ownerId, userId),
  });

  for (const org of organizations) {
    await db
      .update(server)
      .set({
        serverStatus: "inactive",
      })
      .where(eq(server.organizationId, org.id));
  }
};

const findUserByPaystackCustomerId = async (paystackCustomerId: string) => {
  const user = db.query.users_temp.findFirst({
    where: eq(users_temp.paystackCustomerId, paystackCustomerId),
  });
  return user;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET!;
  if (!webhookSecret) {
    return res
      .status(400)
      .send("Webhook Error: Missing Paystack Webhook Secret");
  }

  // Get the raw body for signature verification
  const body = JSON.stringify(req.body);
  const signature = req.headers["x-paystack-signature"] as string;

  // Verify webhook signature
  const hash = crypto
    .createHmac("sha512", webhookSecret)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    console.error("Webhook signature verification failed");
    return res.status(400).send("Webhook Error: Invalid signature");
  }

  const event = req.body;

  const webhooksAllowed = [
    "subscription.create",
    "subscription.disable",
    "subscription.enable",
    "charge.success",
    "charge.failed",
    "invoice.create",
    "invoice.update",
  ];

  if (!webhooksAllowed.includes(event.event)) {
    return res.status(400).send("Webhook Error: Invalid Event Type");
  }

  try {
    switch (event.event) {
      case "subscription.create": {
        const subscription = event.data;
        const customerCode = subscription.customer.customer_code;
        const adminId = subscription.metadata?.adminId;

        if (adminId) {
          await db
            .update(users_temp)
            .set({
              paystackCustomerId: customerCode,
              paystackSubscriptionId: subscription.subscription_code,
              serversQuantity: subscription.quantity || 1,
            })
            .where(eq(users_temp.id, adminId))
            .returning();

          const admin = await findUserById(adminId);
          if (admin) {
            await updateServersBasedOnQuantity(admin.id, admin.serversQuantity);
          }
        }
        break;
      }

      case "subscription.disable": {
        const subscription = event.data;
        const customerCode = subscription.customer.customer_code;

        await db
          .update(users_temp)
          .set({
            paystackSubscriptionId: null,
            serversQuantity: 0,
          })
          .where(eq(users_temp.paystackCustomerId, customerCode));

        const admin = await findUserByPaystackCustomerId(customerCode);
        if (admin) {
          await disableServers(admin.id);
        }
        break;
      }

      case "subscription.enable": {
        const subscription = event.data;
        const customerCode = subscription.customer.customer_code;

        await db
          .update(users_temp)
          .set({
            paystackSubscriptionId: subscription.subscription_code,
            serversQuantity: subscription.quantity || 1,
          })
          .where(eq(users_temp.paystackCustomerId, customerCode));

        const admin = await findUserByPaystackCustomerId(customerCode);
        if (admin) {
          await updateServersBasedOnQuantity(admin.id, admin.serversQuantity);
        }
        break;
      }

      case "charge.success": {
        const charge = event.data;
        const customerCode = charge.customer.customer_code;

        // Update user's subscription status if needed
        const admin = await findUserByPaystackCustomerId(customerCode);
        if (admin && charge.subscription) {
          await db
            .update(users_temp)
            .set({
              paystackSubscriptionId: charge.subscription.subscription_code,
            })
            .where(eq(users_temp.id, admin.id));
        }
        break;
      }

      case "charge.failed": {
        const charge = event.data;
        console.log("Payment failed for charge:", charge.reference);
        // Handle failed payment - could send notification, disable services, etc.
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).send("Webhook Error: Processing failed");
  }
}
