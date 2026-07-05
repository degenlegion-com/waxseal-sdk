<p align="center">
    <img src="assets/banner.png" alt="Wax Seal SDK" width="100%" />
  </p>

  <h1 align="center">WaxSeal SDK</h1>

  <p align="center">
    <strong>Cryptographic identity for the open web and for AI agents.</strong><br/>
    One Ed25519 keypair. One 64-character fingerprint. Permanent on-chain record.
  </p>

  <p align="center">
    <a href="https://waxseal.id">waxseal.id</a> ·
    <a href="https://waxseal.id/developers">Developer Docs</a> ·
    <a href="https://waxseal.id/create">Get your seal</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/license-MIT-crimson.svg" alt="MIT License" />
    <img src="https://img.shields.io/badge/TypeScript-ready-blue.svg" alt="TypeScript" />
    <img src="https://img.shields.io/badge/REST%20API-no%20key%20required-green.svg" alt="REST API" />
    <a href="https://glama.ai/mcp/servers/degenlegion-com/waxseal-sdk"><img src="https://glama.ai/mcp/servers/degenlegion-com/waxseal-sdk/badges/score.svg" alt="waxseal-sdk MCP server" /></a>
  </p>

  ---

  ## Packages

  | Package | What it is |
  |---------|-----------|
  | [`@waxseal/verify`](#waxsealverify) | Browser + Node SDK — verify identities, validate signatures, embed badges, verify webhooks |
  | [`@waxseal/mcp`](./mcp) | MCP server for Claude, Cursor, and Windsurf — verify identities, sign documents, gate AI actions with human approvals |

  ---

  ## `@waxseal/mcp` — for AI agents

  <a href="https://smithery.ai/servers/degenlegion-com/waxseal"><img src="https://smithery.ai/badge/degenlegion-com/waxseal" alt="Smithery" /></a>
  <img src="https://img.shields.io/npm/v/@waxseal/mcp?color=crimson&label=npm" alt="npm" />

  Give Claude, Cursor, or Windsurf a cryptographic identity layer in two minutes.

  ```json
  {
    "mcpServers": {
      "waxseal": {
        "command": "npx",
        "args": ["-y", "@waxseal/mcp"],
        "env": {
          "WAXSEAL_PRIVATE_KEY_PEM": "-----BEGIN PRIVATE KEY-----\n<your key>\n-----END PRIVATE KEY-----"
        }
      }
    }
  }
  ```

  **What the 6 tools give your agent:**

  - Look up any WaxSeal fingerprint — name, chain, owner wallet, lifecycle status
  - Verify an Ed25519 signature against an on-chain public key
  - Sign documents and artifacts with your private key (stays on your machine)
  - Create a time-limited human approval token before a high-risk action runs
  - Verify that approval token — `valid: true` only if authentic, unexpired, and on-chain

  **Hosted server (no install):** `https://api.waxseal.id/mcp`

  → [Full MCP docs](./mcp/README.md) · [Smithery listing](https://smithery.ai/servers/degenlegion-com/waxseal) · [npm](https://www.npmjs.com/package/@waxseal/mcp)

  ---

  ## `@waxseal/verify` — for apps and backends {#waxsealverify}

  <img src="https://img.shields.io/npm/v/@waxseal/verify?color=blue&label=npm" alt="npm" />

  ```bash
  npm install @waxseal/verify
  ```

  Works in **React**, **Vue**, **Node.js**, **n8n**, serverless functions, and any runtime with `fetch`.

  <p align="center">
    <img src="assets/seals.png" alt="Wax Seal examples" width="80%" />
  </p>

  ### Two modes, one fingerprint

  #### Mode 1 · Badge Verification

  > *"Does this WaxSeal exist and is it real?"*

  Confirm a seal is on-chain. No user interaction required — the fingerprint alone is enough.

  **Use cases**
  - ✦ Verified author badge on blog posts and articles
  - ✦ Contributor identity on GitHub-style tools
  - ✦ Publisher verification on CMS platforms
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

  #### Mode 2 · Login & Action Approval

  > *"Did this person sign this, right now?"*

  A signed challenge proves the key holder is present — replaces passwords, OTP, and email loops entirely.

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
    signature:   "base64url...",
  });

  if (seal.valid && seal.onChain && seal.signatureValid) {
    // Cryptographic proof — no password, no session token
  }
  ```

  ---

  ### React Badge

  ```tsx
  import { WaxSealBadge } from "@waxseal/verify/badge";

  <WaxSealBadge fingerprint="a1b2c3d4..." />
  ```

  Or build your own:

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

  ### HTML Embed (no build step)

  ```html
  <script src="https://waxseal.id/embed.js"></script>
  <span data-wax-seal="YOUR_64_CHAR_FINGERPRINT"></span>
  ```

  > **Email** — script tags are blocked by mail clients. Use a plain link instead:
  > `<a href="https://waxseal.id/seal/YOUR_FINGERPRINT">Verify my Wax Seal</a>`

  ---

  ### Webhook Verification

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

    res.sendStatus(200);
  });
  ```

  **Webhook events**

  | Event | When it fires |
  |---|---|
  | `seal.verified` | A seal was verified via the API |
  | `seal.minted` | A new seal NFT was minted on-chain |
  | `seal.updated` | Seal name, avatar, or metadata changed |
  | `seal.subscription.started` | A seal holder started a paid subscription |
  | `seal.subscription.ended` | A subscription expired or was cancelled |
  | `challenge.approved` | A login challenge was verified — user authenticated |

  ---

  ### REST API — no SDK, no key required

  ```
  POST https://api.waxseal.id/v1/verify
  Content-Type: application/json

  {
    "fingerprint": "<64-char hex>",
    "message":     "...",
    "signature":   "..."
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

  ---

  ### Works with everything

  | Stack | How |
  |---|---|
  | **React / Vue / Svelte** | `npm install @waxseal/verify` |
  | **Node.js / Express** | Same package + webhook helper |
  | **n8n** | HTTP Request node → REST API, or npm package in Code node |
  | **Make.com** | HTTP module → REST API |
  | **Zapier** | Webhook by Zapier trigger |
  | **PHP / Python / Go** | Plain HTTP POST to the REST API |
  | **Static HTML / CMS** | Two-line `embed.js` snippet |
  | **Claude / Cursor / Windsurf** | [`@waxseal/mcp`](./mcp) |

  ---

  ### VerifyResult type

  ```ts
  type VerifyResult = {
    valid: boolean;
    fingerprint: string;
    onChain: boolean;
    chain?: "ethereum" | "base" | "polygon" | "bsc";
    walletAddress?: string;
    displayName?: string;
    publicKeyConfirmed?: boolean;
    signatureValid?: boolean;
    verifiedAt?: string;
    error?: string;
  };
  ```

  ---

  MIT © [Wax Seal](https://waxseal.id)
  