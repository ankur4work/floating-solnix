import React, { useEffect, useMemo, useState } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  Frame,
  Icon,
  Banner,
  Badge,
  Stack,
  SkeletonPage,
  SkeletonBodyText,
  Modal,
  TextContainer,
} from "@shopify/polaris";
import { CircleTickMinor } from "@shopify/polaris-icons";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useAuthenticatedFetch } from "../hooks";

/**
 * Pricing screen for Floating Cart Button
 * Frontend plans: "free" | "basic" | "premium"
 * Backend plans:  "premium" (MeroxIO Basic) | "unlimited" (MeroxIO Premium)
 * Mapping:
 *   frontend basic   -> backend premium
 *   frontend premium -> backend unlimited
 */

export default function Pricing() {
  const app = useAppBridge();
  const fetchAuth = useAuthenticatedFetch();
  const redirect = Redirect.create(app);

  // UI helpers
  const tick = useMemo(() => <Icon source={CircleTickMinor} color="success" />, []);

  // Current tier from server: "free" | "premium" | "unlimited"
  const [serverTier, setServerTier] = useState(null); // null while loading
  // Derived frontend selection: "free" | "basic" | "premium"
  const selectedPlan = useMemo(() => {
    if (!serverTier) return null;
    if (serverTier === "free") return "free";
    if (serverTier === "premium") return "basic";
    if (serverTier === "unlimited") return "premium";
    return "free";
  }, [serverTier]);

  // Loading flags
  const [loading, setLoading] = useState({
    page: true,
    action: null, // "free" | "basic" | "premium" while doing action
  });

  // Confirm modal
  const [confirm, setConfirm] = useState({
    open: false,
    target: null, // "free" | "basic" | "premium"
    title: "",
    message: "",
  });

  // Banner
  const [banner, setBanner] = useState({ msg: "", status: null }); // success | warning | critical | null

  // --- prices (shown in modal) ---
  const planPrices = {
    free: "0.00",
    basic: "10.00",
    premium: "100.00",
  };

  // ---------- load current plan ----------
  async function refreshTier() {
    try {
      setLoading((s) => ({ ...s, page: true }));
      const res = await fetchAuth("/api/hasActiveSubscription");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to fetch subscription");

      // backend returns tier: "free" | "premium" | "unlimited"
      if (["free", "premium", "unlimited"].includes(data?.tier)) {
        setServerTier(data.tier);
      } else {
        // fallback if only boolean provided
        setServerTier(data?.hasActiveSubscription ? "premium" : "free");
      }
    } catch (e) {
      console.error(e);
      setServerTier("free"); // safe fallback
      setBanner({ msg: "Failed to fetch subscription status.", status: "critical" });
    } finally {
      setLoading((s) => ({ ...s, page: false }));
    }
  }

  useEffect(() => {
    refreshTier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- confirm helpers ----------
  const openConfirm = (targetPlan) => {
    if (targetPlan === selectedPlan) {
      setBanner({
        msg: `You’re already on the ${labelOf(targetPlan)} plan.`,
        status: "warning",
      });
      return;
    }

    if (targetPlan === "free") {
      setConfirm({
        open: true,
        target: "free",
        title: "Switch to Free plan?",
        message:
          "You’ll cancel the current subscription and return to the Free plan. Customization settings, product total price and Design 2 button will be unavailable.",
      });
      return;
    }

    // Upgrades
    const title =
      targetPlan === "basic" ? "Upgrade to Basic?" : "Upgrade to Premium?";
    const message =
      targetPlan === "basic"
        ? "Basic enables customization settings and design changes. Product total price & Design 2 button remain disabled. Continue?"
        : "Premium enables all features, including customization settings, total product price, and Design 2 button. Continue?";
    setConfirm({
      open: true,
      target: targetPlan,
      title,
      message,
    });
  };

  const runConfirm = async () => {
    const target = confirm.target;
    setConfirm((c) => ({ ...c, open: false }));
    await changePlan(target);
  };

  // ---------- plan actions ----------
  const changePlan = async (targetPlan) => {
    if (!targetPlan) return;
    try {
      setLoading((s) => ({ ...s, action: targetPlan }));

      // Downgrade to free -> cancel
      if (targetPlan === "free") {
        const res = await fetchAuth("/api/cancelSubscription");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Cancel failed");
        if (data?.status && data?.status !== "No subscription found") {
          setBanner({ msg: "Subscription cancelled. You’re on Free.", status: "success" });
        } else {
          setBanner({ msg: "No active subscription found.", status: "warning" });
        }
        await refreshTier();
        return;
      }

      // Upgrades
      // Map frontend -> backend
      // basic -> premium (MeroxIO Basic), premium -> unlimited (MeroxIO Premium)
      const backendPlan = targetPlan === "basic" ? "premium" : "unlimited";
      const res = await fetchAuth(`/api/createSubscription?plan=${backendPlan}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Create subscription failed");

      if (data?.isActiveSubscription) {
        await refreshTier();
        setBanner({
          msg:
            targetPlan === "basic"
              ? "Basic is already active."
              : "Premium is already active.",
          status: "success",
        });
      } else if (data?.confirmationUrl) {
        setBanner({ msg: "Redirecting to Shopify billing page…", status: "success" });
        redirect.dispatch(Redirect.Action.REMOTE, String(data.confirmationUrl));
      } else {
        throw new Error("No confirmationUrl returned.");
      }
    } catch (e) {
      console.error(e);
      setBanner({
        msg:
          targetPlan === "free"
            ? "Failed to cancel subscription."
            : "Failed to create subscription.",
        status: "critical",
      });
    } finally {
      setLoading((s) => ({ ...s, action: null }));
    }
  };

  // ---------- helpers ----------
  const isCurrent = (plan) => selectedPlan === plan;
  const labelOf = (plan) =>
    plan === "free" ? "Free" : plan === "basic" ? "Basic" : "Premium";

  // ---------- feature bullets per plan ----------
  const Feature = ({ enabled, children }) => (
    <Stack spacing="tight" alignment="center">
      <Icon source={CircleTickMinor} color={enabled ? "success" : "subdued"} />
      <span style={{ opacity: enabled ? 1 : 0.55 }}>{children}</span>
    </Stack>
  );

  // ---------- Skeleton while page status loads ----------
  if (loading.page && !selectedPlan) {
    return (
      <Frame>
        <SkeletonPage title="Plans" primaryAction>
          <Layout>
            {[1, 2, 3].map((k) => (
              <Layout.Section oneThird key={k}>
                <Card sectioned>
                  <SkeletonBodyText lines={6} />
                </Card>
              </Layout.Section>
            ))}
          </Layout>
        </SkeletonPage>
      </Frame>
    );
  }

  const commonCardStyle = {
    borderRadius: 12,
    border: "1px solid var(--p-color-border-subdued, #E3E3E3)",
  };
  const glowIfCurrent = (plan) =>
    isCurrent(plan)
      ? {
          boxShadow: "0 10px 30px rgba(68, 138, 255, 0.22)",
          border: "2px solid rgba(68,138,255,0.55)",
        }
      : {};

  return (
    <Frame>
      {/* Confirm modal */}
      <Modal
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        title={confirm.title}
        primaryAction={{
          content:
            confirm.target === "free"
              ? "Yes, switch to Free"
              : `Subscribe for $${planPrices[confirm.target]} / month`,
          onAction: runConfirm,
          loading: loading.action === confirm.target,
          destructive: confirm.target === "free",
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setConfirm((c) => ({ ...c, open: false })) }]}
      >
        <Modal.Section>
          <TextContainer>
            <p>{confirm.message}</p>
          </TextContainer>
        </Modal.Section>
      </Modal>

      <Page title="Floating Cart Button – Plans" subtitle="Pick a plan that fits your store.">
        {!!banner.msg && !!banner.status && (
          <Banner status={banner.status} onDismiss={() => setBanner({ msg: "", status: null })}>
            {banner.msg}
          </Banner>
        )}

        <Layout>
          {/* FREE */}
          <Layout.Section oneThird>
            <Card
              sectioned
              title={
                <Stack alignment="center" spacing="tight">
                  <span>Free</span>
                  <Badge status="new">Starter</Badge>
                  {isCurrent("free") && <Badge status="attention">Current</Badge>}
                </Stack>
              }
              style={{ ...commonCardStyle, ...glowIfCurrent("free") }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>$0</div>
              <p style={{ color: "var(--p-text-subdued)" }}>
                Customization disabled • Design change disabled • Product total price hidden • Design 2 button disabled
              </p>

              <div style={{ height: 12 }} />
              <Stack vertical spacing="loose">
                <Feature enabled={false}>Customization settings</Feature>
                <Feature enabled={false}>Design change</Feature>
                <Feature enabled={false}>Product total price</Feature>
                <Feature enabled={false}>Design 2 button</Feature>
              </Stack>

              <div style={{ height: 16 }} />
              <Stack distribution="equalSpacing">
                <Button
                  destructive
                  onClick={() => openConfirm("free")}
                  disabled={isCurrent("free") || loading.action === "free"}
                  loading={loading.action === "free"}
                >
                  {isCurrent("free") ? "Current plan" : "Switch to Free"}
                </Button>
              </Stack>
            </Card>
          </Layout.Section>

          {/* BASIC ($10) */}
          <Layout.Section oneThird>
            <Card
              sectioned
              title={
                <Stack alignment="center" spacing="tight">
                  <span>Basic</span>
                  <Badge status="success">Popular</Badge>
                  {isCurrent("basic") && <Badge status="success">Current</Badge>}
                </Stack>
              }
              style={{ ...commonCardStyle, ...glowIfCurrent("basic") }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>$10</div>
              <p style={{ color: "var(--p-text-subdued)" }}>
                Customization enabled • Design change enabled • Product total price hidden • Design 2 button disabled
              </p>

              <div style={{ height: 12 }} />
              <Stack vertical spacing="loose">
                <Feature enabled={true}>Customization settings</Feature>
                <Feature enabled={true}>Design change</Feature>
                <Feature enabled={false}>Product total price</Feature>
                <Feature enabled={false}>Design 2 button</Feature>
              </Stack>

              <div style={{ height: 16 }} />
              <Stack distribution="equalSpacing">
                <Button
                  primary
                  onClick={() => openConfirm("basic")}
                  disabled={isCurrent("basic") || loading.action === "basic"}
                  loading={loading.action === "basic"}
                >
                  {isCurrent("basic") ? "Basic Active" : "Upgrade to Basic"}
                </Button>
              </Stack>
            </Card>
          </Layout.Section>

          {/* PREMIUM ($100) */}
          <Layout.Section oneThird>
            <Card
              sectioned
              title={
                <Stack alignment="center" spacing="tight">
                  <span>Premium</span>
                  <Badge status="info">Full features</Badge>
                  {isCurrent("premium") && <Badge status="info">Current</Badge>}
                </Stack>
              }
              style={{ ...commonCardStyle, ...glowIfCurrent("premium") }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>$100</div>
              <p style={{ color: "var(--p-text-subdued)" }}>
                Customization enabled • Design change enabled • Product total price shown • Design 2 button enabled
              </p>

              <div style={{ height: 12 }} />
              <Stack vertical spacing="loose">
                <Feature enabled={true}>Customization settings</Feature>
                <Feature enabled={true}>Design change</Feature>
                <Feature enabled={true}>Product total price</Feature>
                <Feature enabled={true}>Design 2 button</Feature>
              </Stack>

              <div style={{ height: 16 }} />
              <Stack distribution="equalSpacing">
                <Button
                  primary
                  onClick={() => openConfirm("premium")}
                  disabled={isCurrent("premium") || loading.action === "premium"}
                  loading={loading.action === "premium"}
                >
                  {isCurrent("premium") ? "Premium Active" : "Upgrade to Premium"}
                </Button>
              </Stack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
