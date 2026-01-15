import React from "react";
import { Badge } from "./ui/badge";

interface StatusBadgeProps {
  status?: string | null;
  category?: 'order' | 'payment' | 'generic';
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
  icon?: React.ReactNode;
}

export default function StatusBadge({ status, category = 'generic', compact = false, className, ariaLabel, icon }: StatusBadgeProps) {
  const raw = String(status || "");
  const normalized = raw.toLowerCase().trim();
  const base = `${compact ? 'text-xs px-2 py-0.5' : 'text-sm font-medium px-3 py-1'} rounded-full inline-block`;

  const formatLabel = (str: string) => {
    return str
      .replace(/[-_]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const label = raw ? formatLabel(raw) : 'N/A';

  // Map statuses to semantic token classes
  const getColorClasses = () => {
    if (["delivered", "completed", "available", "confirmed", "claimed", "resolved", "active", "redeemed", "paid"].includes(normalized)) {
      return 'bg-status-success-100 text-status-success-800';
    }

    if (["preparing", "preparation"].includes(normalized)) {
      return 'bg-status-warning-100 text-status-warning-800';
    }

    if (["dispatched", "out-for-delivery", "in-transit", "inprogress", "in-progress"].includes(normalized)) {
      return 'bg-status-info-100 text-status-info-800';
    }

    if (["pending", "ordered", "pendingpayment"].includes(normalized)) {
      return 'bg-status-neutral-100 text-status-neutral-800';
    }

    if (["cancelled", "canceled", "cancel", "expired", "rejected", "failed"].includes(normalized)) {
      return 'bg-status-danger-100 text-status-danger-800';
    }

    if (["refunded", "refunded_partial"].includes(normalized)) {
      return 'bg-status-purple-100 text-status-purple-800';
    }

    // fallback
    return 'bg-status-neutral-100 text-status-neutral-800';
  };

  const colorClasses = getColorClasses();

  return (
    <Badge
      className={`${base} ${colorClasses} border-none ${className || ''}`}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel || label}
    >
      <span className="flex items-center gap-1">
        {icon && <span className="shrink-0">{icon}</span>}
        {label}
      </span>
    </Badge>
  );
}
