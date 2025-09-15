import { PAYSTACK_ENABLED } from "@dokploy/server/constants";
// import clsx from "clsx";
import {
  AlertTriangle,
  // CheckIcon,
  CreditCard,
  Loader2,
  MinusIcon,
  PlusIcon,
} from "lucide-react";
// import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { cn } from "@/lib/utils";
import { api } from "@/utils/api";

// TODO: Change this to the actual price
export const calculatePrice = (count: number, isAnnual = false) => {
  if (isAnnual) {
    if (count <= 1) return 2;
    return 2 * count;
  }
  if (count <= 1) return 1;
  return count * 1.3;
};

export const ShowPaystackBilling = () => {
  const { data: servers } = api.server.count.useQuery();
  const { data: admin } = api.user.get.useQuery();
  const { data, isLoading } = api.paystack.getProducts.useQuery();

  if (!PAYSTACK_ENABLED) {
    return (
      <div className="w-full">
        <Card className="h-full bg-sidebar p-2.5 rounded-xl max-w-5xl mx-auto">
          <div className="rounded-xl bg-background shadow-md">
            <CardHeader>
              <CardTitle className="text-xl flex flex-row gap-2">
                <CreditCard className="size-6 text-muted-foreground self-center" />
                Billing
              </CardTitle>
              <CardDescription>
                Billing is disabled for this instance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-8 border-t">
              <div className="text-center">
                <p className="text-muted-foreground">
                  Paystack billing has been disabled. You can use all features
                  without any restrictions.
                </p>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    );
  }

  const { mutateAsync: createCheckoutSession } =
    api.paystack.createCheckoutSession.useMutation();

  const { mutateAsync: createCustomerPortalSession } =
    api.paystack.createCustomerPortalSession.useMutation();

  const [serverQuantity, setServerQuantity] = useState(1);
  const [isAnnual, setIsAnnual] = useState(false);

  const handleCheckout = async (productId: string) => {
    if (data && data.subscriptions.length === 0) {
      try {
        const result = await createCheckoutSession({
          productId,
          serverQuantity: serverQuantity,
          isAnnual,
        });

        // Redirect to Paystack payment page
        if (result.authorizationUrl) {
          window.location.href = result.authorizationUrl;
        }
      } catch (error) {
        toast.error("Failed to create checkout session");
        console.error("Checkout error:", error);
      }
    }
  };

  const products = data?.products.filter((product: any) => {
    // Filter plans based on interval (monthly vs annual)
    const interval = product.interval;
    return isAnnual ? interval === "annually" : interval === "monthly";
  });

  const maxServers = admin?.user.serversQuantity ?? 1;
  const percentage = ((servers ?? 0) / maxServers) * 100;

  if (isLoading) {
    return (
      <div className="w-full">
        <Card className="h-full bg-sidebar p-2.5 rounded-xl max-w-5xl mx-auto">
          <div className="rounded-xl bg-background shadow-md">
            <CardHeader>
              <CardTitle className="text-xl flex flex-row gap-2">
                <CreditCard className="size-6 text-muted-foreground self-center" />
                Billing
              </CardTitle>
              <CardDescription>Loading billing information...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-8 border-t">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card className="h-full bg-sidebar p-2.5 rounded-xl max-w-5xl mx-auto">
        <div className="rounded-xl bg-background shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex flex-row gap-2">
              <CreditCard className="size-6 text-muted-foreground self-center" />
              Billing
            </CardTitle>
            <CardDescription>
              Manage your subscription and billing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 border-t">
            {/* Server Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Server Usage</span>
                <span className="text-sm text-muted-foreground">
                  {servers ?? 0} / {maxServers} servers
                </span>
              </div>
              <Progress value={percentage} className="h-2" />
              {percentage >= 90 && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>You're approaching your server limit</span>
                </div>
              )}
            </div>

            {/* Subscription Status */}
            {data?.subscriptions && data.subscriptions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Current Subscription</h3>
                {data.subscriptions.map((subscription) => (
                  <Card key={subscription.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {subscription.plan?.name || "Active Plan"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Status:{" "}
                          <Badge variant="outline">{subscription.status}</Badge>
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => createCustomerPortalSession()}
                      >
                        Manage Subscription
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Available Plans */}
            {(!data?.subscriptions || data.subscriptions.length === 0) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Choose a Plan</h3>
                  <Tabs
                    value={isAnnual ? "annual" : "monthly"}
                    onValueChange={(value) => setIsAnnual(value === "annual")}
                  >
                    <TabsList>
                      <TabsTrigger value="monthly">Monthly</TabsTrigger>
                      <TabsTrigger value="annual">Annual</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Server Quantity Selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Number of Servers
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setServerQuantity(Math.max(1, serverQuantity - 1))
                      }
                      disabled={serverQuantity <= 1}
                    >
                      <MinusIcon className="h-4 w-4" />
                    </Button>
                    <NumberInput
                      value={serverQuantity}
                      onChange={(e) =>
                        setServerQuantity(Number.parseInt(e.target.value) || 1)
                      }
                      min={1}
                      className="w-20 text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setServerQuantity(serverQuantity + 1)}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Plans Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {products?.map((product) => (
                    <Card key={product.id} className="relative">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {product.name}
                        </CardTitle>
                        <CardDescription>{product.description}</CardDescription>
                        <div className="text-2xl font-bold">
                          ${calculatePrice(serverQuantity, isAnnual)}
                          <span className="text-sm font-normal text-muted-foreground">
                            /{isAnnual ? "year" : "month"}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button
                          className="w-full"
                          onClick={() => handleCheckout(product.id)}
                        >
                          Subscribe
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  );
};
