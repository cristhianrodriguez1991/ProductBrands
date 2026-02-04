import { prisma } from "./prisma"
import { NextRequest } from "next/server"

export interface AuditLogData {
  actorUserId: string
  action: string
  entityType: string
  entityId: string
  before?: any
  after?: any
  metadata?: any
  req?: NextRequest
}

/**
 * Create an audit log entry
 */
export async function logAudit(data: AuditLogData) {
  try {
    // Extract IP and user agent from request if provided
    let ip: string | undefined
    let userAgent: string | undefined

    if (data.req) {
      ip = data.req.headers.get("x-forwarded-for")?.split(",")[0] ||
           data.req.headers.get("x-real-ip") ||
           undefined
      userAgent = data.req.headers.get("user-agent") || undefined
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        before: data.before ? JSON.parse(JSON.stringify(data.before)) : null,
        after: data.after ? JSON.parse(JSON.stringify(data.after)) : null,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
        ip,
        userAgent,
      },
    })
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error("Failed to create audit log:", error)
  }
}

/**
 * Helper to create before/after diff for updates
 */
export function createAuditDiff<T extends Record<string, any>>(
  before: T,
  after: T
): { before: Partial<T>; after: Partial<T> } {
  const changedFields: (keyof T)[] = []
  
  for (const key in after) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedFields.push(key)
    }
  }

  const beforeDiff: Partial<T> = {}
  const afterDiff: Partial<T> = {}

  changedFields.forEach((key) => {
    beforeDiff[key] = before[key]
    afterDiff[key] = after[key]
  })

  return { before: beforeDiff, after: afterDiff }
}
