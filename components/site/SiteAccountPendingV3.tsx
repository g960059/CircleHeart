import React from "react";

/** Shared by the anonymous first response and the browser's session restore. */
export function SiteAccountPendingV3({ createLabel }: { createLabel: string }) {
  return (
    <>
      <span
        className="site-account-pending-action"
        data-testid="site-account-pending-v3"
        aria-hidden="true"
      >
        <span>{createLabel}</span>
      </span>
      <span className="site-account-pending-avatar" aria-hidden="true" />
    </>
  );
}
