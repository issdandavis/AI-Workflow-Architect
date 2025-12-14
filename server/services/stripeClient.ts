// Stripe Integration - Connected via Replit Connector
import Stripe from 'stripe';

let connectionSettings: any = null;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found - Stripe connection not available');
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.publishable && !connectionSettings.settings.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not found. Please connect in Integrations page.`);
  }

  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

export async function isStripeConnected(): Promise<boolean> {
  try {
    await getCredentials();
    return true;
  } catch {
    return false;
  }
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: '2025-04-30.basil' as any,
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}

export async function listStripeProducts() {
  const stripe = await getUncachableStripeClient();
  const products = await stripe.products.list({ active: true, limit: 100 });
  return products.data;
}

export async function listStripePrices(productId?: string) {
  const stripe = await getUncachableStripeClient();
  const params: any = { active: true, limit: 100 };
  if (productId) params.product = productId;
  const prices = await stripe.prices.list(params);
  return prices.data;
}

export async function createStripeCustomer(email: string, metadata?: Record<string, string>) {
  const stripe = await getUncachableStripeClient();
  return await stripe.customers.create({ email, metadata });
}

export async function createStripeCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  mode: 'subscription' | 'payment' = 'subscription'
) {
  const stripe = await getUncachableStripeClient();
  return await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

export async function createStripePortalSession(customerId: string, returnUrl: string) {
  const stripe = await getUncachableStripeClient();
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function getStripeSubscription(subscriptionId: string) {
  const stripe = await getUncachableStripeClient();
  return await stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelStripeSubscription(subscriptionId: string) {
  const stripe = await getUncachableStripeClient();
  return await stripe.subscriptions.cancel(subscriptionId);
}
