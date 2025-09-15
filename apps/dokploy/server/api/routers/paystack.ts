import {
  findServersByUserId,
  findUserById,
  IS_CLOUD,
  updateUser,
} from "@dokploy/server";
import { TRPCError } from "@trpc/server";
// @ts-ignore - Paystack doesn't have TypeScript definitions
import Paystack from "paystack";
import { z } from "zod";
import { WEBSITE_URL } from "@/server/utils/paystack";
import { adminProcedure, createTRPCRouter } from "../trpc";

export const paystackRouter = createTRPCRouter({
  getProducts: adminProcedure.query(async ({ ctx }) => {
    const user = await findUserById(ctx.user.ownerId);
    const paystackCustomerId = user.paystackCustomerId;

    const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY!);

    // Get plans from Paystack
    const plansResponse = await paystack.plan.list();
    const plans = plansResponse.data || [];

    if (!paystackCustomerId) {
      return {
        products: plans,
        subscriptions: [],
      };
    }

    // Get customer subscriptions
    const subscriptionsResponse = await paystack.subscription.list({
      customer: paystackCustomerId,
      status: "active",
    });
    const subscriptions = subscriptionsResponse.data || [];

    return {
      products: plans,
      subscriptions: subscriptions,
    };
  }),

  createCheckoutSession: adminProcedure
    .input(
      z.object({
        productId: z.string(),
        serverQuantity: z.number().min(1),
        isAnnual: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY!);
      const user = await findUserById(ctx.user.id);

      let paystackCustomerId = user.paystackCustomerId;

      // Create or retrieve customer
      if (!paystackCustomerId) {
        const customerResponse = await paystack.customer.create({
          email: user.email,
          first_name: user.name?.split(" ")[0] || "User",
          last_name: user.name?.split(" ").slice(1).join(" ") || "",
        });
        paystackCustomerId = customerResponse.data.customer_code;

        await updateUser(user.id, {
          paystackCustomerId: paystackCustomerId,
        });
      }

      // Create subscription
      const subscriptionResponse = await paystack.subscription.create({
        customer: paystackCustomerId,
        plan: input.productId,
        quantity: input.serverQuantity,
      });

      return {
        sessionId: subscriptionResponse.data.subscription_code,
        authorizationUrl: subscriptionResponse.data.authorization_url,
      };
    }),

  createCustomerPortalSession: adminProcedure.mutation(async ({ ctx }) => {
    const user = await findUserById(ctx.user.id);

    if (!user.paystackCustomerId) {
      console.error(
        "Paystack portal error: Missing paystackCustomerId for user",
        { userId: user.id, email: (user as any)?.email }
      );
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Paystack Customer ID not found",
      });
    }

    // For Paystack, we'll redirect to a customer management page
    // or create a custom portal URL
    const portalUrl = `${WEBSITE_URL}/dashboard/settings/billing?customer=${user.paystackCustomerId}`;

    return { url: portalUrl };
  }),

  canCreateMoreServers: adminProcedure.query(async ({ ctx }) => {
    const user = await findUserById(ctx.user.ownerId);
    const servers = await findServersByUserId(user.id);

    if (!IS_CLOUD) {
      return true;
    }

    return servers.length < user.serversQuantity;
  }),
});
