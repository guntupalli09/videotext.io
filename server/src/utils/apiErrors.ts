/**
 * Consistent error envelope for the external API (/api/v1 and API-key
 * management routes). Never used to leak stack traces or internal paths —
 * callers pass a short, safe message.
 */
import type { Request, Response } from 'express'
import { RequestWithId } from '../middleware/requestId'

export type ApiErrorCode =
  | 'INVALID_API_KEY'
  | 'API_KEY_REVOKED'
  | 'UPGRADE_REQUIRED'
  | 'QUOTA_EXCEEDED'
  | 'FILE_TOO_LARGE'
  | 'DURATION_EXCEEDED'
  | 'UNSUPPORTED_FILE'
  | 'TRANSCRIPTION_NOT_FOUND'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'

/** HTTP status conventionally associated with each code (routes may still override). */
export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  INVALID_API_KEY: 401,
  API_KEY_REVOKED: 401,
  UPGRADE_REQUIRED: 403,
  QUOTA_EXCEEDED: 403,
  FILE_TOO_LARGE: 400,
  DURATION_EXCEEDED: 400,
  UNSUPPORTED_FILE: 400,
  TRANSCRIPTION_NOT_FOUND: 404,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 400,
  INTERNAL_ERROR: 500,
}

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    request_id?: string
  }
}

export function buildApiErrorBody(code: ApiErrorCode, message: string, req?: Request): ApiErrorBody {
  return {
    error: {
      code,
      message,
      request_id: (req as RequestWithId | undefined)?.requestId,
    },
  }
}

/** Sends a standard error envelope. Uses API_ERROR_STATUS[code] unless httpStatus is given. */
export function sendApiError(
  res: Response,
  code: ApiErrorCode,
  message: string,
  opts?: { req?: Request; httpStatus?: number; headers?: Record<string, string> }
): void {
  const status = opts?.httpStatus ?? API_ERROR_STATUS[code]
  if (opts?.headers) {
    for (const [k, v] of Object.entries(opts.headers)) res.setHeader(k, v)
  }
  res.status(status).json(buildApiErrorBody(code, message, opts?.req))
}
