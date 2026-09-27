export type LogLevel = "info" | "warn" | "error" | "security";

export interface LogPayload {
  event: string;
  userId?: string;
  email?: string;
  ip?: string;
  details?: Record<string, any>;
}

class StructuredLogger {
  private formatLog(level: LogLevel, payload: LogPayload) {
    const timestamp = new Date().toISOString();
    return JSON.stringify({
      timestamp,
      level,
      event: payload.event,
      userId: payload.userId || null,
      email: payload.email ? payload.email.toLowerCase() : null,
      ip: payload.ip || "unknown",
      ...(payload.details ? { details: payload.details } : {}),
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
