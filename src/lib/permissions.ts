// Centralized permission keys & module list for the RBAC matrix.
export const MODULES = [
  "dashboard",
  "schools",
  "governorates",
  "cities",
  "news",
  "faq",
  "documents",
  "announcements",
  "pages",
  "media",
  "banners",
  "menus",
  "reports",
  "users",
  "roles",
  "settings",
  "audit",
] as const;

export type ModuleKey = (typeof MODULES)[number];

export const ACTIONS = ["view", "create", "update", "delete"] as const;
export type ActionKey = (typeof ACTIONS)[number];

export const SYSTEM_PERMISSIONS: { key: string; module: string; description: string }[] =
  MODULES.flatMap((mod) =>
    ACTIONS.map((act) => ({
      key: `${mod}.${act}`,
      module: mod,
      description: `${act} ${mod}`,
    }))
  );

// System roles (seeded, cannot be deleted)
export const SYSTEM_ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  EDITOR: "content-editor",
  VIEWER: "viewer",
  STUDENT_ADMISSION_MANAGER: "student-admission-manager",
  TEACHER_ADMISSION_MANAGER: "teacher-admission-manager",
} as const;

// Permission matrix per system role: "*" = all actions on module
export const ROLE_PERMISSION_MATRIX: Record<string, Record<string, string[]>> = {
  [SYSTEM_ROLES.SUPER_ADMIN]: {
    "*": ["*"],
  },
  [SYSTEM_ROLES.ADMIN]: {
    dashboard: ["view"],
    schools: ["view", "create", "update", "delete"],
    governorates: ["view", "create", "update", "delete"],
    cities: ["view", "create", "update", "delete"],
    news: ["view", "create", "update", "delete"],
    faq: ["view", "create", "update", "delete"],
    documents: ["view", "create", "update", "delete"],
    announcements: ["view", "create", "update", "delete"],
    pages: ["view", "create", "update", "delete"],
    reports: ["view"],
    media: ["view", "create", "update", "delete"],
    banners: ["view", "create", "update", "delete"],
    menus: ["view", "create", "update", "delete"],
    users: ["view"],
    roles: ["view"],
    settings: ["view", "update"],
    audit: ["view"],
  },
  [SYSTEM_ROLES.EDITOR]: {
    dashboard: ["view"],
    schools: ["view", "create", "update"],
    governorates: ["view"],
    cities: ["view"],
    news: ["view", "create", "update"],
    faq: ["view", "create", "update"],
    documents: ["view", "create", "update"],
    announcements: ["view", "create", "update"],
    pages: ["view", "create", "update"],
    reports: ["view"],
    media: ["view", "create", "update"],
    banners: ["view", "create", "update"],
    menus: ["view"],
    settings: ["view"],
    audit: ["view"],
  },
  [SYSTEM_ROLES.VIEWER]: {
    dashboard: ["view"],
    schools: ["view"],
    governorates: ["view"],
    cities: ["view"],
    news: ["view"],
    faq: ["view"],
    documents: ["view"],
    announcements: ["view"],
    pages: ["view"],
    reports: ["view"],
    media: ["view"],
    banners: ["view"],
    menus: ["view"],
    users: ["view"],
    roles: ["view"],
    settings: ["view"],
    audit: ["view"],
  },
  [SYSTEM_ROLES.STUDENT_ADMISSION_MANAGER]: {
    dashboard: ["view"],
    reports: ["view"],
    schools: ["view"],
    governorates: ["view"],
    cities: ["view"],
    settings: ["view"],
    audit: ["view"],
  },
  [SYSTEM_ROLES.TEACHER_ADMISSION_MANAGER]: {
    dashboard: ["view"],
    reports: ["view"],
    schools: ["view"],
    governorates: ["view"],
    settings: ["view"],
    audit: ["view"],
  },
};

export function hasPermission(
  perms: Set<string>,
  module: string,
  action: string
): boolean {
  if (perms.has("*") || perms.has(`${module}.*`)) return true;
  return perms.has(`${module}.${action}`);
}

export function permissionKeysForRole(
  matrix: Record<string, string[]>
): string[] {
  const keys: string[] = [];
  for (const [mod, acts] of Object.entries(matrix)) {
    if (mod === "*") {
      keys.push("*");
      continue;
    }
    for (const a of acts) keys.push(`${mod}.${a}`);
  }
  return keys;
}
