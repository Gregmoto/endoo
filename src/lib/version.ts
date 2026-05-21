export const APP_VERSION = "0.29.1"
export const APP_VERSION_DATE = "2026-05-21"
export const APP_BUILD_COMMIT =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev"
export const APP_BUILD_BRANCH =
  process.env.VERCEL_GIT_COMMIT_REF ?? "local"

export interface VersionInfo {
  version: string
  releasedAt: string
  commit: string
  branch: string
  environment: string
  databaseSchemaVersion: string
}

export function getVersionInfo(): VersionInfo {
  return {
    version: APP_VERSION,
    releasedAt: APP_VERSION_DATE,
    commit: APP_BUILD_COMMIT,
    branch: APP_BUILD_BRANCH,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    databaseSchemaVersion: process.env.PRISMA_SCHEMA_VERSION ?? "unknown",
  }
}
