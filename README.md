<p align="center">
    <img src="assets/banner.png" alt="Wax Seal SDK" width="100%" />
  </p>

  <h1 align="center">@waxseal/verify</h1>

  <p align="center">
    <strong>Cryptographic identity for the open web.</strong><br/>
    Verify seals, replace passwords, sign documents — one fingerprint, one on-chain record.
  </p>

  <p align="center">
    <a href="https://waxseal.id">waxseal.id</a> ·
    <a href="https://waxseal.id/developers">Developer Docs</a> ·
    <a href="https://waxseal.id/docs">API Reference</a> ·
    <a href="https://waxseal.id/developers/verify">Verify Guide</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/license-MIT-crimson.svg" alt="MIT License" />
    <img src="https://img.shields.io/badge/TypeScript-ready-blue.svg" alt="TypeScript" />
    <img src="https://img.shields.io/badge/REST%20API-no%20key%20required-green.svg" alt="REST API" />
  </p>

  ---

  <p align="center">
    <img src="assets/seals.png" alt="Wax Seal examples" width="80%" />
  </p>

  ## What is Wax Seal?

  Wax Seal turns a MetaMask wallet into a **cryptographic identity**. Every user gets a unique 64-character fingerprint tied to an NFT on-chain. That fingerprint is:

  - **Permanent** — stored on Ethereum, Base, BSC, or Polygon, forever
  - **Verifiable** — any server can confirm it in a single API call, no credentials stored
  - **Sovereign** — the private key never leaves the user's device

  This SDK is the developer interface to that identity layer.

  ---

  ## Two modes, one fingerprint

  ### Mode 1 · Badge Verification

  > *"Does this WaxSeal exist and is it real?"*

  Confirm a seal is on-chain. No user interaction required — the fingerprint alone is enough.

  **Use cases**
  - ✦ Verified author badge on blog posts and articles
  - ✦ Contributor identity on GitHub-style tools
  - ✦ Publisher verification on CMS platforms
  - ✦ Embed a "Sealed by" badge on any webpage
  - ✦ Prove you created something before AI did

  ```ts
  import { verifySeal } from "@waxseal/verify";

  const seal = await verifySeal({ fingerprint: "a1b2c3d4..." });

  if (seal.valid && seal.onChain) {
    console.log(seal.displayName, "·", seal.chain);
    // "Ada Lovelace · base"
  }
  ```

  ---

  ### Mode 2 · Login & Action Approval

  > *"Did this person sign this, right now?"*

  A signed challenge proves the key holder is present. This replaces passwords, OTP, and email verification loops entirely.

  **Use cases**
  - ✦ Passwordless sign-in — no email, no OTP, no credentials to breach
  - ✦ Approve a document or high-value transaction
  - ✦ Gate a comment, post, or vote behind verified identity
  - ✦ Issue an API key only to verified seal holders
  - ✦ Automate identity checks in n8n / Make.com / Zapier

  ```ts
  const seal = await verifySeal({
    fingerprint: "a1b2c3d4...",
    message:     "I approve this transfer.",
    signature:   "base64url...",           // signed by the user's wallet
  });

  if (seal.valid && seal.onChain && seal.signatureValid) {
    // Cryptographic proof — no password, no session token
  }
  ```

  ---

  ## Install

  ```bash
  npm install @waxseal/verify
  ```

  Works in **React**, **Vue**, **Node.js**, **n8n Code nodes**, serverless functions, and any runtime that supports `fetch`.

  ---

  ## React Badge

  Drop a live verified identity badge anywhere in your app:

  ```tsx
  import { WaxSealBadge } from "@waxseal/verify/badge";

  // Shows "✦ Wax Seal · Ada Lovelace" linked to the public seal page
  <WaxSealBadge fingerprint="a1b2c3d4..." />
  ```

  Or build your own with the hook:

  ```tsx
  import { useEffect, useState } from "react";
  import { verifySeal, type VerifyResult } from "@waxseal/verify";

  export function SealBadge({ fingerprint }: { fingerprint: string }) {
    const [seal, setSeal] = useState<VerifyResult | null>(null);

    useEffect(() => {
      let active = true;
      verifySeal({ fingerprint }).then((r) => active && setSeal(r));
      return () => { active = false; };
    }, [fingerprint]);

    if (!seal?.valid || !seal.onChain) return null;

    return (
      <a href={`https://waxseal.id/seal/${seal.fingerprint}`} target="_blank" rel="noopener noreferrer">
        ✦ {seal.displayName ?? seal.fingerprint.slice(0, 8)}
      </a>
    );
  }
  ```

  ---

  ## HTML Embed (no build step)

  Two lines, works on any static site, CMS, or blog:

  ```html
  <script src="https://waxseal.id/embed.js"></script>
  <span data-wax-seal="YOUR_64_CHAR_FINGERPRINT"></span>
  ```

  > **Email** — script tags are blocked by mail clients. Use a plain link instead:
  > `<a href="https://waxseal.id/seal/YOUR_FINGERPRINT">Verify my Wax Seal</a>`

  ---

  ## Webhook Verification

  Wax Seal signs every outgoing webhook event with HMAC-SHA256. Always verify before acting.

  ```ts
  import { verifyWebhookSignature, isWaxSealWebhookEvent } from "@waxseal/verify/webhooks";

  app.post("/webhook/waxseal", express.raw({ type: "*/*" }), (req, res) => {
    const valid = verifyWebhookSignature({
      body:      req.body,
      signature: String(req.headers["x-waxseal-signature"]),
      secret:    process.env.WAXSEAL_WEBHOOK_SECRET,
    });

    if (!valid) return res.status(401).send("Invalid signature");

    const event = JSON.parse(req.body.toString());

    if (isWaxSealWebhookEvent(event, "seal.minted")) {
      console.log("New seal:", event.data.fingerprint, "on", event.data.chain);
    }

    if (isWaxSealWebhookEvent(event, "seal.subscription.started")) {
      // Provision access, send welcome email, update your DB
    }

    res.sendStatus(200);
  });
  ```

  ### Webhook events

  | Event | When it fires |
  |---|---|
  | `seal.verified` | A seal was verified via the API |
  | `seal.minted` | A new seal NFT was minted on-chain |
  | `seal.updated` | Seal name, avatar, or metadata changed |
  | `seal.subscription.started` | A seal holder started a paid subscription |
  | `seal.subscription.ended` | A subscription expired or was cancelled |
  | `challenge.approved` | A login challenge was verified — user authenticated |

  Webhook URLs are registered in your [Developer dashboard](https://waxseal.id/developer). Native setup guides for **n8n**, **Make.com**, and **Zapier** at [waxseal.id/developers/webhooks](https://waxseal.id/developers/webhooks).

  ---

  ## REST API — no SDK, no API key

  For backends that can't run Node modules, or automation tools like Make.com and Zapier:

  ```
  POST https://api.waxseal.id/v1/verify
  Content-Type: application/json

  {
    "fingerprint": "<64-char hex>",
    "message":     "...",       // optional
    "signature":   "..."        // optional — triggers sig check
  }
  ```

  ```json
  {
    "valid": true,
    "onChain": true,
    "chain": "base",
    "displayName": "Ada Lovelace",
    "walletAddress": "0x…",
    "signatureValid": true,
    "verifiedAt": "2026-01-01T00:00:00Z"
  }
  ```

  No API key required for public verification. Use an **n8n HTTP Request** node or **Make.com HTTP** module — no custom connector needed.

  ---

  ## Works with everything

  | Stack | How |
  |---|---|
  | **React / Vue / Svelte** | `npm install @waxseal/verify` |
  | **Node.js / Express** | Same npm package + webhook helper |
  | **n8n** | HTTP Request node → REST API, or npm package in Code node |
  | **Make.com** | HTTP module → REST API |
  | **Zapier** | Webhook by Zapier trigger |
  | **PHP / Python / Go / Ruby** | Plain HTTP POST to the REST API |
  | **Static HTML / CMS** | Two-line `embed.js` snippet |

  ---

  ## VerifyResult type

  ```ts
  type VerifyResult = {
    valid: boolean;            // seal exists and is well-formed
    fingerprint: string;       // 64-char hex identifier
    onChain: boolean;          // confirmed in the on-chain registry
    chain?: "ethereum" | "base" | "polygon" | "bsc";
    walletAddress?: string;    // wallet that minted the seal
    displayName?: string;      // human-readable name
    publicKeyConfirmed?: boolean;
    signatureValid?: boolean;  // only when message + signature are provided
    verifiedAt?: string;       // ISO 8601
    error?: string;
  };
  ```

  ---

  ## License

  MIT © [Wax Seal](https://waxseal.id)
  