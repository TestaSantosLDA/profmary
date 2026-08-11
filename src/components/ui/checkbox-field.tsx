"use client";

import * as React from "react";

/**
 * Themed checkbox row: 20px azulejo-filled box, whole label is the ≥44px
 * hit target. Replaces raw h-4 w-4 checkboxes in forms.
 */
export function CheckboxField({
  label,
  hint,
  ...props
}: React.ComponentProps<"input"> & { label: React.ReactNode; hint?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1.5 text-sm font-medium select-none">
      <span className="relative flex size-5 shrink-0">
        <input
          type="checkbox"
          className="peer size-5 cursor-pointer appearance-none rounded-[6px] border border-input bg-card transition-colors checked:border-primary checked:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          {...props}
        />
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute inset-0 size-5 fill-none stroke-white stroke-[2.5] opacity-0 transition-opacity peer-checked:opacity-100"
        >
          <path d="M5 10.5l3.2 3.2L15 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>
        {label}
        {hint && (
          <span className="block text-[13px] font-normal text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}
