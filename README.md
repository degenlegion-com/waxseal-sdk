# @waxseal/verify

  Official JavaScript / TypeScript SDK for [Wax Seal](https://waxseal.id) — the cryptographic identity platform.

  Two utilities:

  | Package | Purpose |
  |---|---|
  | `@waxseal/verify` | Verify a seal exists on-chain and optionally check a cryptographic signature |
  | `@waxseal/webhooks` | Verify the HMAC-SHA256 signature on incoming Wax Seal webhook events |

  ---

  ## Install

  ```bash
  npm install @waxseal/verify
  ```

  ---

  ## Verify a Seal

  ```ts
  import { verifySeal } from "@waxseal/verify";

  // Basic on-chain check
  const seal = await verifySeal({ fingerprint: "a1b2c3d4..." });

  if (seal.valid && seal.onChain) {
    console.log(seal.displayName, seal.chain);
  }

  // With signature verification
  const seal2 = await verifySeal({
    fingerprint: "a1b2c3d4...",
    message: "I authored this post.",
    signature: "base64url...",
  });

  if (seal2.valid && seal2.onChain && seal2.signatureValid) {
    // Content is cryptographically signed by the seal holder
  }
  ```

  ### React Badge

  ```tsx
  import { WaxSealBadge } from "@waxseal/verify/badge";

  // Drop-in verified identity badge
  <WaxSealBadge fingerprint="a1b2c3d4..." />
  ```

  ### HTML Embed (no build step)

  ```html
  <!-- Load once, anywhere on the page -->
  <script src="https://waxseal.id/embed.js"></script>

  <!-- Place wherever the badge should appear -->
  <span data-wax-seal="YOUR_64_CHAR_FINGERPRINT"></span>
  ```

  ---

  ## Verify Webhooks

  ```ts
  import { verifyWebhookSignature, isWaxSealWebhookEvent } from "@waxseal/webhooks";

  // Express example
  app.post("/webhook/waxseal", express.raw({ type: "*/*" }), (req, res) => {
    const signature = req.headers["x-waxseal-signature"];
    const body = req.body; // raw Buffer

    const valid = verifyWebhookSignature({
      body,
      signature: String(signature),
      secret: process.env.WAXSEAL_WEBHOOK_SECRET,
    });

    if (!valid) return res.status(401).send("Invalid signature");

    const event = JSON.parse(body.toString());

    if (isWaxSealWebhookEvent(event, "seal.minted")) {
      console.log("New seal:", event.data.fingerprint);
    }

    res.sendStatus(200);
  });
  ```

  ### Webhook Events

  | Event | Description |
  |---|---|
  | `seal.verified` | A seal was successfully verified via the API |
  | `seal.minted` | A new seal NFT was minted on any supported chain |
  | `seal.updated` | Seal metadata (display name, avatar) was updated |
  | `seal.subscription.started` | A seal holder started a paid subscription |
  | `seal.subscription.ended` | A seal holder's subscription expired or was cancelled |
  | `challenge.approved` | A login challenge was verified — user authenticated |

  ---

  ## VerifyResult type

  ```ts
  type VerifyResult = {
    valid: boolean;            // seal exists and is well-formed
    fingerprint: string;       // 64-char hex identifier
    onChain: boolean;          // confirmed in the on-chain registry
    chain?: "ethereum" | "base" | "polygon";
    walletAddress?: string;    // wallet that minted the seal
    displayName?: string;      // human-readable name from the seal
    signatureValid?: boolean;  // only present when message + signature were provided
    verifiedAt?: string;       // ISO 8601 timestamp
  };
  ```

  ---

  ## REST API (no SDK needed)

  ```
  POST https://api.waxseal.id/v1/verify
  Content-Type: application/json

  { "fingerprint": "<64-char hex>", "message"?: "...", "signature"?: "..." }
  ```

  No API key required for public verification.

  ---

  ## License

  MIT © [Wax Seal](https://waxseal.id)
  