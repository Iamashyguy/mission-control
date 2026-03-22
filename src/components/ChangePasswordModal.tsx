"use client";

import { useState } from "react";
import { X, Key, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setError(null); };
  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!currentPassword || !newPassword || !confirmPassword) { setError("All fields are required"); return; }
    if (newPassword !== confirmPassword) { setError("New passwords do not match"); return; }
    if (newPassword.length < 6) { setError("New password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_password", currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      resetForm();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem 1rem", paddingRight: "3rem",
    backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)",
    borderRadius: "0.5rem", color: "var(--text-primary)", fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={handleClose} />
      <div style={{
        position: "relative", backgroundColor: "var(--card)", borderRadius: "1rem",
        border: "1px solid var(--border)", width: "100%", maxWidth: "420px",
        margin: "1rem", padding: "1.5rem", boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ padding: "0.5rem", backgroundColor: "var(--accent-soft)", borderRadius: "0.5rem" }}>
              <Key className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)" }}>Change Password</h2>
          </div>
          <button onClick={handleClose} style={{ padding: "0.5rem", borderRadius: "0.5rem", border: "none", cursor: "pointer", backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", marginBottom: "1rem", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", color: "#f87171", fontSize: "0.875rem" }}>
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            { label: "Current Password", value: currentPassword, setter: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
            { label: "New Password", value: newPassword, setter: setNewPassword, show: showNew, toggle: () => setShowNew(!showNew) },
            { label: "Confirm Password", value: confirmPassword, setter: setConfirmPassword, show: showNew, toggle: () => {} },
          ].map((field) => (
            <div key={field.label}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                {field.label}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={field.show ? "text" : "password"}
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  style={inputStyle}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
                {field.label !== "Confirm Password" && (
                  <button type="button" onClick={field.toggle}
                    style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                    {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
            <button type="button" onClick={handleClose}
              style={{ flex: 1, padding: "0.75rem", borderRadius: "0.5rem", backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)", border: "none", cursor: "pointer", fontWeight: 500 }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 1, padding: "0.75rem", borderRadius: "0.5rem", backgroundColor: "var(--accent)", color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600, opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
