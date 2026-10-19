export type LogLevel = "info" | "warn" | "error" | "security";

export interface LogPayload {
  event: string;
  userId?: string;
  email?: string;
  ip?: string;
  details?: Record<string, any>;
  [key: string]: any;
}

class StructuredLogger {
  private formatLog(level: LogLevel, payload: LogPayload) {
    const timestamp = new Date().toISOString();
    const { event, userId, email, ip, details, ...rest } = payload;
    const mergedDetails = { ...(details || {}), ...rest };
    return JSON.stringify({
      timestamp,
      level,
      event,
      userId: userId || null,
      email: email ? email.toLowerCase() : null,
      ip: ip || "unknown",
      ...(Object.keys(mergedDetails).length > 0 ? { details: mergedDetails } : {}),
    });
  }

  info(payload: LogPayload) {
    console.log(this.formatLog("info", payload));
  }

  warn(payload: LogPayload) {
    console.warn(this.formatLog("warn", payload));
  }

  error(payload: LogPayload) {
    console.error(this.formatLog("error", payload));
  }

  security(payload: LogPayload) {
    console.warn(this.formatLog("security", payload));
  }
}

export const logger = new StructuredLogger();
