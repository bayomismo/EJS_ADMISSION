// Shared form-error helpers for admin managers.
//
// Server-side validation errors come back as Zod's flattened format:
//   { details: { fieldErrors: { code: ["..."], nameAr: ["..."] } } }
//
// This helper normalizes that into a { field: message } map and returns
// it ready to spread onto a form-state object.

import { ZodError } from "zod";

export type FieldErrors = Record<string, string | undefined>;

/** Parse a Zod error or API error response into a flat { field: firstMessage } map. */
export function parseFieldErrors(err: unknown): FieldErrors {
  // 1. If it's a ZodError directly (thrown client-side before fetch)
  if (err instanceof ZodError) {
    const flat = err.flatten().fieldErrors as Record<string, string[] | undefined>;
    const out: FieldErrors = {};
    for (const [k, v] of Object.entries(flat)) {
      if (v && v.length) out[k] = v[0];
    }
    return out;
  }

  // 2. If it's a fetch Response JSON (server-validated)
  const anyErr = err as any;
  const details = anyErr?.details?.fieldErrors || anyErr?.details?.formErrors;
  if (details && typeof details === "object") {
    const out: FieldErrors = {};
    for (const [k, v] of Object.entries(details)) {
      if (Array.isArray(v) && v.length) out[k] = v[0];
      else if (typeof v === "string") out[k] = v;
    }
    return out;
  }

  return {};
}

/** Extract a human-friendly error message from any error shape. */
export function extractErrorMessage(err: unknown, fallback = "حدث خطأ غير متوقع"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || fallback;
  const anyErr = err as any;
  return anyErr?.error || anyErr?.message || fallback;
}

/**
 * Parse a fetch Response that may carry Zod fieldErrors.
 * Throws an Error with `.fieldErrors` attached so the caller can spread it onto form state.
 */
export async function parseApiError(res: Response): Promise<Error & { fieldErrors?: FieldErrors }> {
  let body: any = null;
  try { body = await res.json(); } catch { /* ignore */ }
  const msg = body?.error || body?.message || `HTTP ${res.status}`;
  const err = new Error(msg) as Error & { fieldErrors?: FieldErrors };
  err.fieldErrors = parseFieldErrors(body);
  return err;
}

/** Focus the first DOM element that has `aria-invalid="true"`. Call after applying fieldErrors. */
export function focusFirstError(formEl: HTMLElement | null) {
  if (!formEl) return;
  // Wait one tick so React has rendered the new aria-invalid props
  requestAnimationFrame(() => {
    const el = formEl.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}