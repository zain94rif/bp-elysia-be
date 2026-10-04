import { join } from "path";
import { config } from "../config";

export class LocalStorage {
  private basePath: string;

  constructor() {
    this.basePath = config.STORAGE_PATH;
  }

  async save(subDir: string, fileName: string, data: ArrayBuffer | Uint8Array | Blob | File): Promise<string> {
    const relativePath = join(subDir, fileName);
    const fullPath = join(this.basePath, relativePath);
    await Bun.write(fullPath, data);
    return relativePath;
  }

  getFile(relativePath: string) {
    const fullPath = join(this.basePath, relativePath);
    return Bun.file(fullPath);
  }

  async exists(relativePath: string): Promise<boolean> {
    const file = this.getFile(relativePath);
    return await file.exists();
  }

  async delete(relativePath: string): Promise<boolean> {
    const file = this.getFile(relativePath);
    if (await file.exists()) {
      const fullPath = join(this.basePath, relativePath);
      const { unlink } = require("fs/promises");
      try {
        await unlink(fullPath);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export const storage = new LocalStorage();
