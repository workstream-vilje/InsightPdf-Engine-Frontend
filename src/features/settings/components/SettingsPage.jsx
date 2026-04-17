"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Mail, PencilLine, ShieldAlert, Trash2 } from "lucide-react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import authApi from "@/services/api/networking/apis/auth";
import { clearAuthSession, getStoredUserProfile, setAuthSession } from "@/services/auth";
import { useToast } from "@/components/toast/ToastProvider";
import { ROUTE_PATHS } from "@/utils/routepaths";

import styles from "./SettingsPage.module.css";

function SettingsContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = React.useState({ name: "", email: "" });
  const [nameValue, setNameValue] = React.useState("");
  const [isSavingName, setIsSavingName] = React.useState(false);
  const [deleteOverlayOpen, setDeleteOverlayOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const storedProfile = getStoredUserProfile();
    setProfile(storedProfile);
    setNameValue(storedProfile.name || "");
  }, []);

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

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageGradient} />
      <main className={styles.pageContent}>
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
