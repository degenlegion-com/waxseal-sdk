/**
   * @waxseal/webhooks
   * HMAC-SHA256 signature verification for Wax Seal webhook events.
   */
  import crypto from "crypto";

  export type WaxSealEventType =
    | "seal.verified"
    | "seal.minted"
    | "seal.updated"
    | "seal.subscription.started"
    | "seal.subscription.ended"
    | "challenge.approved";

  export interface WaxSealWebhookEvent<T extends WaxSealEventType = WaxSealEventType> {
    id: string;
    event: T;
    createdAt: string;
    data: Record<string, unknown>;
  }

  export interface VerifySignatureOptions {
    /** Raw request body as a Buffer or string. Use express.raw() to capture it. */
    body: Buffer | string;
    /** Value of the X-WaxSeal-Signature request header (format: sha256=...). */
    signature: string;
    /** Webhook secret from your Wax Seal Developer dashboard. */
    secret: string;
  }

  /**
   * Verify the HMAC-SHA256 signature on an incoming Wax Seal webhook event.
   * Always verify before acting on any event to prevent spoofing.
   *
   * @example
   * app.post("/webhook/waxseal", express.raw({ type: "*\/*" }), (req, res) => {
   *   const valid = verifyWebhookSignature({
   *     body: req.body,
   *     signature: String(req.headers["x-waxseal-signature"]),
   *     secret: process.env.WAXSEAL_WEBHOOK_SECRET,
   *   });
   *   if (!valid) return res.status(401).send("Invalid signature");
   *   const event = JSON.parse(req.body.toString());
   *   res.sendStatus(200);
   * });
   */
  export function verifyWebhookSignature(options: VerifySignatureOptions): boolean {
    const { body, signature, secret } = options;
    const payload = typeof body === "string" ? Buffer.from(body) : body;
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
  }

  /**
   * Type-safe narrowing for Wax Seal webhook events.
   */
  export function isWaxSealWebhookEvent<T extends WaxSealEventType>(
    event: unknown,
    type: T,
  ): event is WaxSealWebhookEvent<T> {
    return (
      typeof event === "object" && event !== null &&
      "event" in event &&
      (event as { event: string }).event === type
    );
  }
  