"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  /** Field label, Arabic. Use " * " suffix for required. The trailing * is rendered in red automatically. */
  label: string;
  /** Optional helper text shown below the input. */
  help?: string;
  /** Optional inline error message. When set, the input border + label turn red. */
  error?: string | null;
  /** Required for accessibility — link the input via htmlFor. */
  htmlFor?: string;
  /** Optional: render the label with a stronger weight or different size. */
  labelClassName?: string;
  /** Children (the input). They get `aria-invalid` and a red border automatically when error is set. */
  children: React.ReactNode;
  /** Layout — most fields are full-width, but in a grid you can pass a className. */
  className?: string;
}

export function Field({ label, help, error, htmlFor, labelClassName, children, className }: FieldProps) {
  // Split label to render trailing * in red
  const required = label.trimEnd().endsWith("*");
  const cleanLabel = required ? label.trimEnd().slice(0, -1).trimEnd() : label;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const helpId = htmlFor ? `${htmlFor}-help` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        htmlFor={htmlFor}
        className={cn(
          "flex items-center gap-1 text-xs font-medium",
          error ? "text-rose-600" : "text-foreground/80",
          labelClassName
        )}
      >
        <span>{cleanLabel}</span>
        {required && (
          <span aria-hidden="true" className="text-rose-600 font-bold">
            *
          </span>
        )}
      </Label>
      {/* Children get aria-invalid + red border via cloneElement */}
      <FieldChild error={!!error} ariaDescribedBy={[helpId, errorId].filter(Boolean).join(" ") || undefined}>
        {children}
      </FieldChild>
      {help && !error && (
        <p id={helpId} className="text-[11px] leading-relaxed text-muted-foreground">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-[11px] font-medium text-rose-600">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Clone the single child element to inject `aria-invalid` + a red border class when there's an error.
 * Falls back to a plain wrapper if the child can't be cloned (e.g., multiple children, fragment).
 */
function FieldChild({ error, ariaDescribedBy, children }: { error: boolean; ariaDescribedBy?: string; children: React.ReactNode }) {
  const child = React.Children.only(children) as React.ReactElement<any>;
  return React.cloneElement(child, {
    "aria-invalid": error || undefined,
    "aria-describedby": ariaDescribedBy,
    className: cn(
      child.props?.className,
      error && "border-rose-500 focus-visible:ring-rose-500"
    ),
  });
}

/** Section header used inside long forms to break the form into logical groups. */
export function FormSection({
  title,
  description,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number | string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2 border-b border-border pb-2">
        {Icon && (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
        </div>
        {count !== undefined && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
            {count}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}