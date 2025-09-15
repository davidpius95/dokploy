# Paystack Integration Setup Guide

This guide will help you set up Paystack payment integration in your Dokploy instance, replacing the previous Stripe integration.

## 🚀 Quick Start

### 1. Paystack Account Setup

1. **Create a Paystack Account**
   - Go to [Paystack Dashboard](https://dashboard.paystack.com/)
   - Sign up for a new account or log in to your existing account

2. **Get Your API Keys**
   - Navigate to Settings → API Keys & Webhooks
   - Copy your **Public Key** and **Secret Key**
   - For testing, use the test keys (they start with `pk_test_` and `sk_test_`)

3. **Create Plans**
   - Go to Plans in your Paystack dashboard
   - Create monthly and annual plans for your server subscriptions
   - Note down the Plan IDs (they start with `PLN_`)

### 2. Environment Configuration

Update your `.env` file with the following Paystack configuration:

```env
# Paystack Configuration
PAYSTACK_ENABLED=true
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key_here
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key_here
PAYSTACK_WEBHOOK_SECRET=your_paystack_webhook_secret_here

# Paystack Plan IDs (replace with your actual plan IDs)
BASE_PRICE_MONTHLY_ID=PLN_your_monthly_plan_id_here
BASE_ANNUAL_MONTHLY_ID=PLN_your_annual_plan_id_here
```

### 3. Webhook Configuration

1. **Set up Webhook Endpoint**
   - In your Paystack dashboard, go to Settings → Webhooks
   - Add a new webhook with URL: `https://yourdomain.com/api/paystack/webhook`
   - Select the following events:
     - `subscription.create`
     - `subscription.disable`
     - `subscription.enable`
     - `charge.success`
     - `charge.failed`
     - `invoice.create`
     - `invoice.update`

2. **Get Webhook Secret**
   - Copy the webhook secret from the webhook configuration
   - Add it to your `.env` file as `PAYSTACK_WEBHOOK_SECRET`

### 4. Database Migration

The database schema has been updated to include Paystack fields. If you haven't run the migration yet:

```bash
cd apps/dokploy
pnpm run migration:run
```

## 🔧 Technical Details

### API Endpoints

The following new API endpoints are available:

- `GET /api/trpc/paystack.getProducts` - Get available plans and subscriptions
- `POST /api/trpc/paystack.createCheckoutSession` - Create a new subscription
- `POST /api/trpc/paystack.createCustomerPortalSession` - Manage existing subscription
- `GET /api/trpc/paystack.canCreateMoreServers` - Check server creation limits

### Webhook Endpoint

- `POST /api/paystack/webhook` - Handles Paystack webhook events

### Database Schema Changes

New fields added to the `user_temp` table:
- `paystackCustomerId` - Paystack customer identifier
- `paystackSubscriptionId` - Paystack subscription identifier

## 🎯 Features

### Subscription Management
- **Plan Selection**: Choose between monthly and annual billing
- **Server Quantity**: Select the number of servers for your subscription
- **Real-time Updates**: Server limits update automatically based on subscription status

### Payment Processing
- **Secure Payments**: All payments processed through Paystack's secure infrastructure
- **Multiple Payment Methods**: Support for cards, bank transfers, and mobile money
- **Automatic Billing**: Recurring subscriptions with automatic renewals

### Webhook Events
- **Subscription Creation**: Automatically activates server limits
- **Payment Success**: Updates subscription status
- **Payment Failure**: Handles failed payments gracefully
- **Subscription Changes**: Updates server limits when plans change

## 🧪 Testing

### Test Mode
1. Use Paystack test keys (starting with `pk_test_` and `sk_test_`)
2. Test payments using Paystack's test card numbers
3. Verify webhook events are received correctly

### Test Card Numbers
- **Successful Payment**: `4084084084084081`
- **Failed Payment**: `4084084084084085`
- **Insufficient Funds**: `4084084084084085`

## 🔒 Security

### Webhook Verification
- All webhooks are verified using HMAC-SHA512 signatures
- Invalid signatures are rejected immediately
- Webhook secrets are stored securely in environment variables

### API Security
- All API endpoints require authentication
- Customer data is encrypted and stored securely
- Payment information is never stored locally

## 🚨 Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Check webhook URL is accessible from the internet
   - Verify webhook secret is correct
   - Ensure webhook events are enabled in Paystack dashboard

2. **Payment Failures**
   - Verify API keys are correct
   - Check plan IDs are valid
   - Ensure customer email is valid

3. **Database Errors**
   - Run database migrations: `pnpm run migration:run`
   - Check database connection
   - Verify schema changes are applied

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## 📚 API Reference

### Paystack Router Methods

#### `getProducts`
Returns available plans and current user subscriptions.

#### `createCheckoutSession`
Creates a new subscription checkout session.

**Input:**
```typescript
{
  productId: string;
  serverQuantity: number;
  isAnnual: boolean;
}
```

**Output:**
```typescript
{
  sessionId: string;
  authorizationUrl: string;
}
```

#### `createCustomerPortalSession`
Creates a customer portal session for subscription management.

**Output:**
```typescript
{
  url: string;
}
```

#### `canCreateMoreServers`
Checks if the user can create more servers based on their subscription.

**Output:**
```typescript
boolean
```

## 🔄 Migration from Stripe

If you're migrating from Stripe:

1. **Backup Data**: Export existing subscription data
2. **Update Environment**: Replace Stripe variables with Paystack variables
3. **Run Migration**: Apply database schema changes
4. **Test Integration**: Verify all functionality works correctly
5. **Update Webhooks**: Replace Stripe webhooks with Paystack webhooks

## 📞 Support

For issues related to:
- **Paystack Integration**: Check this documentation and Paystack's official docs
- **Dokploy Issues**: Refer to the main Dokploy documentation
- **Payment Processing**: Contact Paystack support

## 🎉 You're All Set!

Your Dokploy instance is now configured with Paystack payment processing. Users can:

- Subscribe to monthly or annual plans
- Manage their subscriptions
- Create servers based on their plan limits
- Receive automatic billing and renewals

Happy deploying! 🚀
