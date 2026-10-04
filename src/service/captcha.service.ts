import svgCaptcha from "svg-captcha";
import { config } from "../config";
import { AppError } from "../apperror";

interface CaptchaStoreItem {
  answer: string;
  expiresAt: number;
}

class CaptchaService {
  private store = new Map<string, CaptchaStoreItem>();

  constructor() {
    // Periodically clean expired captchas
    setInterval(() => {
      const now = Date.now();
      for (const [id, item] of this.store.entries()) {
        if (item.expiresAt < now) {
          this.store.delete(id);
        }
      }
    }, 60000);
  }

  createChallenge(): { captcha_id: string; image: string } {
    const captcha = svgCaptcha.create({
      size: 5,
      noise: 2,
      color: true,
      background: "#ffffff",
      width: 150,
      height: 50,
      ignoreChars: "0o1iIl",
    });

    const captchaId = crypto.randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL

    this.store.set(captchaId, {
      answer: captcha.text.toLowerCase(),
      expiresAt,
    });

    const svgBase64 = Buffer.from(captcha.data).toString("base64");
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    return {
      captcha_id: captchaId,
      image: dataUrl,
    };
  }

  async verify(captchaId?: string, answer?: string, token?: string): Promise<boolean> {
    if (config.CAPTCHA_MODE === "disabled" || !config.CAPTCHA_REQUIRED) {
      return true;
    }

    if (config.CAPTCHA_MODE === "internal") {
      if (!captchaId || !answer) {
        throw AppError.badRequest("captcha_id and captcha_answer are required");
      }

      const item = this.store.get(captchaId);
      // Challenges are one-time use
      this.store.delete(captchaId);

      if (!item || item.expiresAt < Date.now()) {
        throw AppError.badRequest("captcha expired or invalid");
      }

      if (item.answer !== answer.trim().toLowerCase()) {
        throw AppError.badRequest("invalid captcha answer");
      }

      return true;
    }

    if (config.CAPTCHA_MODE === "provider") {
      if (!token) {
        throw AppError.badRequest("captcha_token is required");
      }
      try {
        const response = await fetch(config.CAPTCHA_VERIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: config.CAPTCHA_SECRET,
            response: token,
          }),
        });
        const data = (await response.json()) as { success?: boolean };
        if (!data.success) {
          throw AppError.badRequest("captcha provider verification failed");
        }
        return true;
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw AppError.badRequest("failed to verify captcha with provider");
      }
    }

    return true;
  }
}

export const captchaService = new CaptchaService();
