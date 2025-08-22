import { WEBSITE_URL, getStripeItems } from "@/server/utils/stripe";
import {
	IS_CLOUD,
	findServersByUserId,
	findUserById,
	updateUser,
} from "@dokploy/server";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "../trpc";

export const stripeRouter = createTRPCRouter({
	getProducts: adminProcedure.query(async ({ ctx }) => {
		const user = await findUserById(ctx.user.ownerId);
		const stripeCustomerId = user.stripeCustomerId;

		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
			apiVersion: "2024-09-30.acacia",
		});

		const products = await stripe.products.list({
			expand: ["data.default_price"],
			active: true,
		});

		if (!stripeCustomerId) {
			return {
				products: products.data,
				subscriptions: [],
			};
		}

		const subscriptions = await stripe.subscriptions.list({
			customer: stripeCustomerId,
			status: "active",
			expand: ["data.items.data.price"],
		});

		return {
			products: products.data,
			subscriptions: subscriptions.data,
		};
	}),
	createCheckoutSession: adminProcedure
		.input(
			z.object({
				productId: z.string(),
				serverQuantity: z.number().min(1),
				isAnnual: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
				apiVersion: "2024-09-30.acacia",
			});

			const items = getStripeItems(input.serverQuantity, input.isAnnual);
			const user = await findUserById(ctx.user.id);

			let stripeCustomerId = user.stripeCustomerId;

			if (stripeCustomerId) {
				const customer = await stripe.customers.retrieve(stripeCustomerId);

				if (customer.deleted) {
					await updateUser(user.id, {
						stripeCustomerId: null,
					});
					stripeCustomerId = null;
				}
			}

			const session = await stripe.checkout.sessions.create({
				mode: "subscription",
				line_items: items,
				...(stripeCustomerId && {
					customer: stripeCustomerId,
				}),
				metadata: {
					adminId: user.id,
				},
				allow_promotion_codes: true,
				success_url: `${WEBSITE_URL}/dashboard/settings/servers?success=true`,
				cancel_url: `${WEBSITE_URL}/dashboard/settings/billing`,
			});

			return { sessionId: session.id };
		}),
	createCustomerPortalSession: adminProcedure.mutation(async ({ ctx }) => {
		const user = await findUserById(ctx.user.id);

		if (!user.stripeCustomerId) {
			console.error(
				"Stripe portal error: Missing stripeCustomerId for user",
				{ userId: user.id, email: (user as any)?.email },
			);
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Stripe Customer ID not found",
			});
		}
		const stripeCustomerId = user.stripeCustomerId;

		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
			apiVersion: "2024-09-30.acacia",
		});

		try {
			console.log("Creating Stripe customer portal session", {
				userId: user.id,
				stripeCustomerId,
				websiteUrl: WEBSITE_URL,
				mode:
					process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
						? "live"
						: "test",
			});
            const session = await stripe.billingPortal.sessions.create({
                customer: stripeCustomerId,
                return_url: `${WEBSITE_URL}/dashboard/settings/billing`,
                ...(process.env.STRIPE_PORTAL_CONFIGURATION_ID
                    ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID }
                    : {}),
            });
			console.log("Stripe customer portal session created", {
				sessionId: session.id,
				urlPresent: Boolean(session.url),
			});
			return { url: session.url };
		} catch (_) {
			console.error("Stripe portal creation failed", _);
			return {
				url: "",
			};
		}
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
