# @waxseal/mcp

<p align="left">
  <a href="https://smithery.ai/servers/degenlegion-com/waxseal"><img src="https://smithery.ai/badge/degenlegion-com/waxseal" alt="Smithery" /></a>
  <img src="https://img.shields.io/npm/v/@waxseal/mcp?color=crimson&label=npm" alt="npm" />
  <img src="https://img.shields.io/badge/MCP-2025--03--26-blue.svg" alt="MCP" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT" />
</p>

**WaxSeal MCP Server** — give your AI agents a cryptographic identity layer. Verify who someone is, sign documents, and require explicit human approval before any high-risk action runs.

AI agents can now say: *"I have a signed human approval before I do this."* And you can verify it's real.

---

## What it enables

- **Verify any identity** — look up a WaxSeal fingerprint on Ethereum, Base, or BNB Chain and confirm who it belongs to, whether it's active, and what wallet owns it
- **Sign documents** — attach a tamper-evident Ed25519 signature to any text, code, or artifact — verifiable by anyone, forever
- **Human-in-the-loop approvals** — create a time-limited approval token that proves *you* authorized a specific AI action; the agent verifies it before executing
- **Verify signatures** — confirm that a document or message was signed by the holder of a specific on-chain fingerprint
- **No central trust** — verification goes directly to the on-chain NFT contract; there is no WaxSeal server in the trust chain

---

## 6 tools at a glance

| Tool | What it does | Key required? |
|------|-------------|:---:|
| `waxseal.info` | Platform overview, tiers, trust layers, and tool guide | No |
| `waxseal.identity.verify` | Look up fingerprint → name, chain, wallet, status | No |
| `waxseal.signature.verify` | Confirm an Ed25519 signature against an on-chain public key | No |
| `waxseal.approval.verify` | Validate a human approval token before executing | No |
| `waxseal.document.sign` | Sign any content with your WaxSeal private key | **Yes** |
| `waxseal.approval.create` | Create a signed, time-limited approval token | **Yes** |

Verify-only tools work with zero configuration. Signing tools require `WAXSEAL_PRIVATE_KEY_PEM`.

---

## Hosted server — no install needed

Use directly in any HTTP-capable MCP client:

```
https://api.waxseal.id/mcp
```

The hosted server provides all 6 tools. Signing tools return a setup prompt (private keys cannot run server-side by design — they must stay on your device).

---

## Quick start

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`

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

### Cursor

`.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global)

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

### VS Code (GitHub Copilot)

`.vscode/mcp.json` (project) or User Settings → MCP

```json
{
  "servers": {
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

> Requires VS Code 1.99+ with GitHub Copilot (agent mode enabled).

### Windsurf

`~/.codeium/windsurf/mcp_config.json`

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

> **Don't have a WaxSeal yet?** Get one free at [waxseal.id/create](https://waxseal.id/create) — Ed25519 keypair generated in-browser, private key never leaves your device.

---

## Tool reference

### `waxseal.info`

Returns a full overview of the WaxSeal trust infrastructure — available tiers, trust layers, and a guide to the other MCP tools. Call this first if your AI client is unfamiliar with WaxSeal.

**No input required.**

---

### `waxseal.identity.verify`

Look up any WaxSeal fingerprint. Returns on-chain status, display name, owner wallet, chain, and lifecycle status.

```
fingerprint  string  64-char hex (0x prefix optional)
```

```json
{
  "on_chain": true,
  "display_name": "Ada Lovelace",
  "lifecycle_status": "active",
  "chain": "base",
  "owner_wallet": "0x1234...",
  "minted_at": "2025-01-15T10:00:00Z",
  "verification_url": "https://waxseal.id/seal/a1b2c3..."
}
```

**Example:** *"Look up WaxSeal a3b4c5d6... and tell me who owns it."*

---

### `waxseal.document.sign`

Signs any text or document with your WaxSeal Ed25519 private key. Returns a fingerprint, SHA-256 content hash, and base64 signature verifiable by anyone with `waxseal.signature.verify`.

**Requires `WAXSEAL_PRIVATE_KEY_PEM`.**

```
content      string   the document or text to sign
description  string?  optional label (informational only)
```

```json
{
  "fingerprint": "a1b2c3...",
  "content_hash": "sha256hex...",
  "signature": "base64...",
  "signed_at": "2026-06-01T12:00:00Z"
}
```

**Example:** *"Sign this contract with my WaxSeal key."*

---

### `waxseal.signature.verify`

Verifies an Ed25519 signature against the public key stored on-chain for the given fingerprint. The seal must be active for verification to pass.

```
content      string  the original document that was signed
fingerprint  string  64-char hex fingerprint of the claimed signer
signature    string  base64 Ed25519 signature
```

```json
{
  "valid": true,
  "signer": "Ada Lovelace",
  "chain": "Base",
  "message": "Signature is valid. Signed by Ada Lovelace (a1b2c3...)."
}
```

**Example:** *"Verify this signature from fingerprint a1b2c3... against the document."*

---

### `waxseal.approval.create`

Creates a cryptographically signed approval token proving you explicitly authorized a specific action. The token is time-limited, tamper-evident, and tied to your on-chain identity.

**Requires `WAXSEAL_PRIVATE_KEY_PEM`.**

```
action              string   description of the action being approved
context             string?  optional additional parameters or context
expires_in_minutes  number?  default 10
```

```json
{
  "approval_token": "base64...",
  "action": "Deploy v2.1.0 to production",
  "expires_at": "2026-06-01T12:10:00Z",
  "instructions": "Pass approval_token to the agent. Agent calls waxseal.approval.verify before executing."
}
```

**Example:** *"Create an approval for the agent to deploy v2.1.0 to production, valid for 5 minutes."*

---

### `waxseal.approval.verify`

Verifies an approval token before executing a high-risk or irreversible action. Returns `valid: true` only when the token is cryptographically authentic, unexpired, and the signer has an active on-chain seal.

```
approval_token        string   token from waxseal.approval.create
expected_fingerprint  string?  require a specific signer (optional)
```

```json
{
  "valid": true,
  "action": "Deploy v2.1.0 to production",
  "signer": "Ada Lovelace",
  "seconds_remaining": 287,
  "message": "Approval is valid. Authorized by Ada Lovelace. Expires in 287s."
}
```

**Example:** *"Before you deploy, verify this approval token: [token]"*

---

## Human-in-the-loop pattern

The standard problem with autonomous AI agents is that they execute consequential actions — deploys, transfers, deletions — without cryptographic proof that a human actually approved it at that moment.

WaxSeal solves this:

```
1.  Human → Claude: "Deploy when ready. Here's my approval:"
2.  Human runs:   waxseal.approval.create({ action: "Deploy v2.1.0", expires_in_minutes: 30 })
                  → returns approval_token
3.  Human passes  approval_token to Claude
4.  Claude finishes work, then calls: waxseal.approval.verify({ approval_token })
5.  ✓ valid: true  →  Claude deploys
    ✗ valid: false →  Claude stops and requests a fresh approval
```

The approval signature is tied to an on-chain WaxSeal identity — unforgeable by the agent, auditable after the fact, and automatically expired.

**Why this matters beyond "just use a password":**
- The approval is *content-specific* — "Deploy v2.1.0 to production" cannot be reused for a database wipe
- The approval is *time-limited* — a 10-minute window, not a permanent credential
- The approval is *on-chain verifiable* — any third party can confirm the signer's identity independently
- The approval *expires automatically* — no revocation step needed

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WAXSEAL_PRIVATE_KEY_PEM` | For signing tools | Ed25519 private key in PEM format |
| `WAXSEAL_API_URL` | No | Override API base (default: `https://api.waxseal.id`) |
| `WAXSEAL_API_TOKEN` | No | Bearer token for authenticated API calls |

---

## Security model

- **Private keys never leave your machine.** The local MCP server reads your key from the environment variable only — it is never transmitted or logged.
- **Verification is on-chain.** Public keys are read from the WaxSeal NFT contract on Ethereum, Base, or BNB Chain — not from a WaxSeal-controlled database.
- **Approval tokens are replay-proof.** Each token encodes the action, expiry, and an Ed25519 signature. A tampered or expired token returns `valid: false`.
- **No key, no signing.** The hosted server at `api.waxseal.id/mcp` intentionally cannot sign — private keys must stay on the user's device.

---

## Get your seal

1. Go to [waxseal.id/create](https://waxseal.id/create)
2. Generate your Ed25519 keypair in-browser (private key never transmitted)
3. Mint your seal on Base, Ethereum, or BNB Chain
4. Export the private key PEM and set `WAXSEAL_PRIVATE_KEY_PEM`

Free tier includes identity minting. Developer tier ($49/mo) unlocks AI agent signing, approval gate APIs, webhooks, and payment routing.

---

## Links

| | |
|---|---|
| Platform | [waxseal.id](https://waxseal.id) |
| Architecture | [waxseal.id/platform](https://waxseal.id/platform) |
| Developer docs | [waxseal.id/developers](https://waxseal.id/developers) |
| AI governance | [waxseal.id/ai-governance](https://waxseal.id/ai-governance) |
| Get your seal | [waxseal.id/create](https://waxseal.id/create) |
| Smithery listing | [smithery.ai/servers/degenlegion-com/waxseal](https://smithery.ai/servers/degenlegion-com/waxseal) |
| npm | [@waxseal/mcp](https://www.npmjs.com/package/@waxseal/mcp) |

MIT License © [Wax Seal](https://waxseal.id)
