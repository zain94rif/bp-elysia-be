import { appendFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { config } from "./config";

export class Logger {
  private logFilePath: string;

  constructor() {
    this.logFilePath = config.LOG_FILE_PATH;
  }

  private async ensureLogDirectory() {
    try {
      const dir = dirname(this.logFilePath);
      await mkdir(dir, { recursive: true });
    } catch {
      // Directory already exists or unable to create
    }
  }

  private async writeLog(level: "INFO" | "WARN" | "ERROR", message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    let metaStr = "";
    if (meta) {
      try {
        metaStr = ` ${JSON.stringify(meta)}`;
      } catch {
        metaStr = ` [object]`;
      }
    }
    const logLine = `[${timestamp}] [${level}] ${message}${metaStr}\n`;

    // Console output
    if (level === "ERROR") {
      console.error(logLine.trim());
    } else if (level === "WARN") {
      console.warn(logLine.trim());
    } else {
      console.log(logLine.trim());
    }

    // Append to log file
    try {
      await this.ensureLogDirectory();
      await appendFile(this.logFilePath, logLine, "utf-8");
    } catch (err) {
      console.error("Failed to write to log file:", err);
    }
  }

  info(message: string, meta?: any) {
    this.writeLog("INFO", message, meta);
  }

  warn(message: string, meta?: any) {
    this.writeLog("WARN", message, meta);
  }

  error(message: string, meta?: any) {
    this.writeLog("ERROR", message, meta);
  }
}

export const logger = new Logger();
