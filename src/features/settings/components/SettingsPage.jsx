"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ImagePlus,
  Mail,
  PencilLine,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PricingCards from "@/components/common/PricingCards/PricingCards";
import authApi from "@/services/api/networking/apis/auth";
import subscriptionApi from "@/services/api/networking/apis/subscription";
import { clearAuthSession, getStoredUserProfile, setAuthSession } from "@/services/auth";
import { useToast } from "@/components/toast/ToastProvider";
import { ROUTE_PATHS } from "@/utils/routepaths";

import styles from "./SettingsPage.module.css";

const formatUsageValue = (metric) => {
  if (!metric) return "0";
  if (metric.unit === "bytes") {
    const usedMb = Number(metric.used || 0) / (1024 * 1024);
    const limitMb =
      metric.limit == null ? null : Number(metric.limit || 0) / (1024 * 1024);
    const usedLabel = usedMb >= 1024 ? `${(usedMb / 1024).toFixed(1)} GB` : `${usedMb.toFixed(0)} MB`;
    if (limitMb == null) return usedLabel;
    const limitLabel =
      limitMb >= 1024 ? `${(limitMb / 1024).toFixed(1)} GB` : `${limitMb.toFixed(0)} MB`;
    return `${usedLabel} / ${limitLabel}`;
  }
  if (metric.limit == null) return `${metric.used}`;
  return `${metric.used} / ${metric.limit}`;
};

const formatPlanBadge = (subscription) => {
  if (!subscription) return "Loading";
  return subscription.image_add_on
    ? `${subscription.plan_label} + Image Add-on`
    : subscription.plan_label;
};

const getUsageProgress = (metric) => {
  if (!metric || metric.limit == null || Number(metric.limit) <= 0) return 0;
  return Math.min(100, Math.round((Number(metric.used || 0) / Number(metric.limit)) * 100));
};

function SettingsContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = React.useState({ name: "", email: "" });
  const [nameValue, setNameValue] = React.useState("");
  const [isSavingName, setIsSavingName] = React.useState(false);
  const [deleteOverlayOpen, setDeleteOverlayOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [subscription, setSubscription] = React.useState(null);
  const [plans, setPlans] = React.useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = React.useState(true);
  const [pendingPlanCode, setPendingPlanCode] = React.useState("");
  const [isTogglingImageAddOn, setIsTogglingImageAddOn] = React.useState(false);

  React.useEffect(() => {
    const storedProfile = getStoredUserProfile();
    setProfile(storedProfile);
    setNameValue(storedProfile.name || "");
  }, []);

  const loadSubscriptionData = React.useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      const [currentResponse, plansResponse] = await Promise.all([
        subscriptionApi.fetchCurrentSubscription(),
        subscriptionApi.fetchPlans(),
      ]);
      setSubscription(currentResponse?.data || null);
      setPlans(plansResponse?.data || []);
    } catch (error) {
      showToast({
        title: "Subscription",
        variant: "error",
        message: error?.message || "Failed to load subscription details.",
      });
    } finally {
      setIsLoadingPlans(false);
    }
  }, [showToast]);

  React.useEffect(() => {
    void loadSubscriptionData();
  }, [loadSubscriptionData]);

  const handleBack = React.useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(ROUTE_PATHS.WORKSPACE_UPLOAD);
  }, [router]);

  const handleUpdateName = async () => {
    const trimmedName = nameValue.trim();
    if (!trimmedName) {
      showToast({
        title: "Change user name",
        variant: "warning",
        message: "Enter a valid user name.",
      });
      return;
    }

    setIsSavingName(true);
    try {
      const response = await authApi.updateUserName(trimmedName);
      const nextName = response?.name || trimmedName;
      const nextProfile = { ...profile, name: nextName };
      setProfile(nextProfile);
      setNameValue(nextName);
      setAuthSession({
        userId: response?.user_id || profile.id,
        name: nextName,
        mailId: response?.mail_id || profile.email,
      });
      showToast({
        title: "Change user name",
        variant: "success",
        message: response?.message || "User name updated successfully.",
      });
    } catch (error) {
      showToast({
        title: "Change user name",
        variant: "error",
        message: error?.message || "Failed to update user name.",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await authApi.deleteAccount();
      clearAuthSession();
      router.replace(ROUTE_PATHS.AUTH_SIGNUP);
    } catch (error) {
      showToast({
        title: "Delete account",
        variant: "error",
        message: error?.message || "Failed to delete account.",
      });
    } finally {
      setIsDeleting(false);
      setDeleteOverlayOpen(false);
    }
  };

  const handlePlanChange = async (planCode) => {
    if (!subscription) return;

    const nextImageAddOn =
      planCode === "basic" ? false : Boolean(subscription.image_add_on);

    setPendingPlanCode(planCode);
    try {
      const response = await subscriptionApi.updateCurrentSubscription({
        plan_code: planCode,
        image_add_on: nextImageAddOn,
      });
      setSubscription(response?.data || null);
      showToast({
        title: "Subscription",
        variant: "success",
        message: `Plan switched to ${response?.data?.plan_label || planCode}.`,
      });
    } catch (error) {
      showToast({
        title: "Subscription",
        variant: "error",
        message: error?.message || "Failed to update the plan.",
      });
    } finally {
      setPendingPlanCode("");
    }
  };

  const handleImageAddOnToggle = async () => {
    if (!subscription) return;
    if (subscription.plan_code === "basic") {
      showToast({
        title: "Image add-on",
        variant: "warning",
        message: "Switch to Medium or High before enabling image workflows.",
      });
      return;
    }

    setIsTogglingImageAddOn(true);
    try {
      const response = await subscriptionApi.updateCurrentSubscription({
        plan_code: subscription.plan_code,
        image_add_on: !subscription.image_add_on,
      });
      setSubscription(response?.data || null);
      showToast({
        title: "Image add-on",
        variant: "success",
        message: response?.data?.image_add_on
          ? "Image workflows enabled."
          : "Image workflows disabled.",
      });
    } catch (error) {
      showToast({
        title: "Image add-on",
        variant: "error",
        message: error?.message || "Failed to update image access.",
      });
    } finally {
      setIsTogglingImageAddOn(false);
    }
  };

  const usageEntries = React.useMemo(
    () =>
      subscription?.usage
        ? [
            {
              key: "projects",
              label: "Projects",
              description: "Active workspaces under this account",
              metric: subscription.usage.projects,
            },
            {
              key: "queries",
              label: "Monthly queries",
              description: "Question-answer runs in the current billing period",
              metric: subscription.usage.queries,
            },
            {
              key: "uploads",
              label: "Monthly uploads",
              description: "New files uploaded during the current billing period",
              metric: subscription.usage.uploads,
            },
            {
              key: "storage",
              label: "Storage",
              description: "Total file storage consumed",
              metric: subscription.usage.storage,
            },
            {
              key: "imageUploads",
              label: "Image uploads",
              description: "Image jobs unlocked by the add-on",
              metric: subscription.usage.imageUploads,
            },
            {
              key: "processedFiles",
              label: "Processed files",
              description: "Files pushed through ingestion this month",
              metric: subscription.usage.processedFiles,
            },
          ]
        : [],
    [subscription],
  );

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageGradient} />
      <main className={styles.pageContent}>
        <div className={styles.pageActions}>
          <Button
            type="button"
            variant="outline"
            className={styles.backButton}
            onClick={handleBack}
          >
            <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
            Back
          </Button>
        </div>

        <section className={styles.pageIntro}>
          <p className={styles.eyebrow}>Account settings</p>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageLead}>
            Manage your profile information and account controls from one place.
          </p>
        </section>

        <section className={styles.settingsPanel}>
          <div className={styles.accountHeader}>
            <div className={styles.avatar}>{(profile.name || profile.email || "U").charAt(0).toUpperCase()}</div>
            <div className={styles.accountMeta}>
              <strong>{profile.name || "Unnamed user"}</strong>
              <div className={styles.mailRow}>
                <Mail size={16} />
                <span>{profile.email || "No mail id available"}</span>
              </div>
            </div>
          </div>

          <section className={styles.subscriptionSection}>
            <div className={styles.subscriptionHero}>
              <div className={styles.subscriptionHeroCopy}>
                <p className={styles.subscriptionEyebrow}>Subscription control</p>
                <h2 className={styles.subscriptionTitle}>Usage-aware pricing foundation</h2>
                <p className={styles.subscriptionText}>
                  The app now uses a central entitlement layer for projects, uploads, queries,
                  analytics, and image workflows.
                </p>
              </div>
              <div className={styles.subscriptionSummaryCard}>
                <div className={styles.summaryIcon}>
                  <Sparkles size={18} />
                </div>
                <div className={styles.summaryMeta}>
                  <span className={styles.summaryLabel}>Current plan</span>
                  <strong>{formatPlanBadge(subscription)}</strong>
                  <p>
                    {subscription?.status === "expired"
                      ? "Expired subscriptions fall back to Basic access."
                      : "This local plan switcher is a temporary bridge until Stripe is added."}
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.usageGrid}>
              {isLoadingPlans && usageEntries.length === 0 ? (
                <div className={styles.loadingCard}>Loading subscription usage...</div>
              ) : (
                usageEntries.map((item) => (
                  <article key={item.key} className={styles.usageCard}>
                    <div className={styles.usageCardHeader}>
                      <div>
                        <h3>{item.label}</h3>
                        <p>{item.description}</p>
                      </div>
                      <span className={styles.usageValue}>{formatUsageValue(item.metric)}</span>
                    </div>
                    <div className={styles.usageTrack}>
                      <span
                        className={styles.usageFill}
                        style={{ width: `${getUsageProgress(item.metric)}%` }}
                      />
                    </div>
                  </article>
                ))
              )}
            </div>

            {subscription?.upgrade_hints?.length ? (
              <div className={styles.hintsPanel}>
                <div className={styles.hintsHeader}>
                  <BarChart3 size={18} />
                  <strong>Upgrade hints</strong>
                </div>
                <div className={styles.hintsList}>
                  {subscription.upgrade_hints.map((hint) => (
                    <p key={hint}>{hint}</p>
                  ))}
                </div>
              </div>
            ) : null}

            <PricingCards
              plans={plans}
              isInteractive={true}
              currentPlanCode={subscription?.plan_code}
              pendingPlanCode={pendingPlanCode}
              onPlanChange={handlePlanChange}
            />

            <article className={styles.addOnCard}>
              <div className={styles.addOnHeader}>
                <div className={styles.addOnIcon}>
                  <ImagePlus size={18} />
                </div>
                <div>
                  <p className={styles.planAudience}>Image-heavy workflows</p>
                  <h3>Image Intelligence Add-on</h3>
                </div>
              </div>
              <p className={styles.planDescription}>
                Unlock image upload, auto-processing, and image Q&A without mixing that cost into every plan.
              </p>
              <div className={styles.planFeatureList}>
                <p>Separate image quota keeps PDF pricing simpler and more predictable.</p>
                <p>Designed as an add-on for Medium and High rather than a standalone low-tier plan.</p>
              </div>
              <Button
                type="button"
                variant={subscription?.image_add_on ? "outline" : "default"}
                className={styles.planButton}
                disabled={isTogglingImageAddOn || !subscription}
                onClick={handleImageAddOnToggle}
              >
                {isTogglingImageAddOn
                  ? "Updating..."
                  : subscription?.image_add_on
                    ? "Disable add-on"
                    : "Enable add-on"}
              </Button>
            </article>
          </section>

          <div className={styles.settingsList}>
            <article className={styles.settingRow}>
              <div className={styles.settingRowHeader}>
                <div className={styles.settingIcon}><PencilLine size={18} /></div>
                <div className={styles.settingBody}>
                  <h2 className={styles.settingTitle}>Change user name</h2>
                  <p className={styles.settingText}>
                    Update the display name used across the workspace.
                  </p>
                </div>
              </div>
              <div className={styles.nameForm}>
                <Input
                  value={nameValue}
                  onChange={(event) => setNameValue(event.target.value)}
                  placeholder="Enter user name"
                  className={styles.nameInput}
                  maxLength={255}
                />
                <Button
                  type="button"
                  variant="outline"
                  className={styles.saveNameButton}
                  onClick={handleUpdateName}
                  disabled={isSavingName || nameValue.trim() === "" || nameValue.trim() === profile.name}
                >
                  {isSavingName ? "Saving..." : "Save name"}
                </Button>
              </div>
            </article>

            <article className={`${styles.settingRow} ${styles.settingRowDanger}`}>
              <div className={styles.settingRowHeader}>
                <div className={`${styles.settingIcon} ${styles.deleteIcon}`}><ShieldAlert size={18} /></div>
                <div className={styles.settingBody}>
                  <h2 className={styles.settingTitle}>Delete account</h2>
                  <p className={styles.settingText}>
                    Permanently remove your account and all associated data.
                  </p>
                </div>
              </div>
              <div className={styles.dangerActions}>
                <Button
                  type="button"
                  variant="destructive"
                  className={styles.deleteButton}
                  onClick={() => setDeleteOverlayOpen(true)}
                >
                  <Trash2 size={16} />
                  Delete account
                </Button>
              </div>
            </article>
          </div>
        </section>
      </main>

      {deleteOverlayOpen && (
        <div
          className={styles.overlayBackdrop}
          role="presentation"
          onClick={() => {
            if (isDeleting) return;
            setDeleteOverlayOpen(false);
          }}
        >
          <div
            className={styles.overlayCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.overlayIcon}>
              <ShieldAlert size={20} />
            </div>
            <h2 id="delete-account-title" className={styles.overlayTitle}>
              Delete account
            </h2>
            <p className={styles.overlayText}>
              This action permanently deletes all your data including your projects, files and experiments.
            </p>
            <div className={styles.overlayActions}>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteAccount}
                className={styles.overlayDeleteButton}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
