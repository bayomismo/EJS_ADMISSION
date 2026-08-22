/**
 * Shared helpers for applicant-uploaded application documents.
 * Used by both the public upload endpoints and the admin review endpoints.
 */
import { db } from "@/lib/db";
import {
  APPLICATION_DOC_TYPES,
  MAX_APPLICATION_DOC_BYTES,
  APPLICATION_DOC_MIMES,
} from "@/lib/constants";

export type ApplicationKind = "students" | "teachers";

export function isApplicationKind(v: unknown): v is ApplicationKind {
  return v === "students" || v === "teachers";
}

export function isDocTypeAllowed(kind: ApplicationKind, docType: string): boolean {
  return APPLICATION_DOC_TYPES[kind].some((t) => t.value === docType);
}

export function isDocMimeAllowed(mime: string): boolean {
  return APPLICATION_DOC_MIMES.has(mime);
}

export interface OwnedApplication {
  id: string;
  referenceNo: string;
  nationalId: string;
  status: string;
}

/**
 * Verify that an application exists AND belongs to the requester by matching
 * both the reference number and the national ID. Returns null when no match.
 */
export async function findOwnedApplication(
  kind: ApplicationKind,
  referenceNo: string,
  nationalId: string,
): Promise<OwnedApplication | null> {
  if (!referenceNo || !/^\d{14}$/.test(nationalId)) return null;
  const app =
    kind === "teachers"
      ? await db.teacherApplication.findFirst({
          where: { referenceNo, nationalId },
          select: { id: true, referenceNo: true, nationalId: true, status: true },
        })
      : await db.studentApplication.findFirst({
          where: { referenceNo, nationalId },
          select: { id: true, referenceNo: true, nationalId: true, status: true },
        });
  return app;
}

/** Count of documents already attached to an owned application. */
export async function countDocuments(appId: string, kind: ApplicationKind): Promise<number> {
  return kind === "teachers"
    ? db.applicationDocument.count({ where: { teacherAppId: appId } })
    : db.applicationDocument.count({ where: { studentAppId: appId } });
}

export function exceedsMaxSize(size: number): boolean {
  return size > MAX_APPLICATION_DOC_BYTES;
}
