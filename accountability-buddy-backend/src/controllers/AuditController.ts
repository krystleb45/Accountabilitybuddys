import { Request, Response, NextFunction } from "express";
import AuditLog from "../models/AuditLog"; // Ensure this model is defined and implemented correctly
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import sanitize from "mongo-sanitize";

/**
 * Log an event into the audit log
 */
export const logAuditEvent = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { action, details }: { action: string; details?: string } = sanitize(req.body);

      // Validate input
      if (!action || typeof action !== "string") {
        next(createError("Invalid or missing 'action' parameter", 400));
        return;
      }

      // Create new audit log entry
      const newAuditLog = new AuditLog({
        action,
        details: details || "No details provided",
        user: req.user?.id,
      });

      await newAuditLog.save();

      sendResponse(res, 201, true, "Audit event logged successfully", {
        auditLog: newAuditLog,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Fetch all audit logs
 */
export const getAuditLogs = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const auditLogs = await AuditLog.find().sort({ createdAt: -1 });

    if (!auditLogs || auditLogs.length === 0) {
      sendResponse(res, 404, false, "No audit logs found");
      return;
    }

    sendResponse(res, 200, true, "Audit logs fetched successfully", {
      auditLogs,
    });
  }
);

/**
 * Fetch audit logs by user
 */
export const getAuditLogsByUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        next(createError("User ID is required", 400));
        return;
      }

      const auditLogs = await AuditLog.find({ user: userId }).sort({
        createdAt: -1,
      });

      if (!auditLogs || auditLogs.length === 0) {
        sendResponse(res, 404, false, "No audit logs found for this user");
        return;
      }

      sendResponse(res, 200, true, "Audit logs fetched successfully", {
        auditLogs,
      });
    } catch (error) {
      next(error);
    }
  }
);
