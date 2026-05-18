/**
 * API response helpers.
 *
 * All helpers apply toJSON() before serializing, which converts BigInt → string.
 * Use these in route handlers instead of bare Response.json().
 */

import { toJSON } from "@/lib/serialize"

// ─── apiOk ────────────────────────────────────────────────────────────────────

export function apiOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json(toJSON(data), { status: 200, ...init })
}

// ─── apiError ─────────────────────────────────────────────────────────────────

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "bad_request"
  | "conflict"
  | "payment_required"
  | "unprocessable"
  | "internal_error"

const STATUS_MAP: Record<ApiErrorCode, number> = {
  unauthorized:      401,
  payment_required:  402,
  forbidden:         403,
  not_found:         404,
  bad_request:       400,
  conflict:          409,
  unprocessable:     422,
  internal_error:    500,
}

export function apiError(
  code:     ApiErrorCode,
  message:  string,
  status?:  number,
  details?: Record<string, unknown>,
): Response {
  return Response.json(
    { error: code, message, ...details },
    { status: status ?? STATUS_MAP[code] ?? 500 },
  )
}

// ─── apiPaginated ─────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page:     number
  pageSize: number
  total:    number
}

export function apiPaginated<T>(
  items: T[],
  meta:  PaginationMeta,
): Response {
  const totalPages = Math.ceil(meta.total / meta.pageSize)
  return apiOk({
    items,
    total:      meta.total,
    page:       meta.page,
    pageSize:   meta.pageSize,
    totalPages,
    hasNext:    meta.page < totalPages,
    hasPrev:    meta.page > 1,
  })
}

// ─── apiCursor ────────────────────────────────────────────────────────────────

/** Cursor-based pagination response (used by v1 external API) */
export function apiCursor<T>(
  data:       T[],
  nextCursor: string | null,
  hasMore:    boolean,
  extra?:     Record<string, unknown>,
): Response {
  return apiOk({
    object:      "list",
    data,
    has_more:    hasMore,
    next_cursor: nextCursor,
    ...extra,
  })
}
