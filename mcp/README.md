# @waxseal/mcp

[![smithery badge](https://smithery.ai/badge/degenlegion-com/waxseal)](https://smithery.ai/servers/degenlegion-com/waxseal)

**WaxSeal MCP Server** — bring cryptographic identity, document signing, and AI approval gates into Claude Desktop, Cursor, Windsurf, and any MCP-compatible AI client.

Built on the [WaxSeal](https://waxseal.id) cryptographic trust infrastructure — one Ed25519 keypair, one 64-character fingerprint, permanent identity.

---

## Quick start

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "waxseal": {
      "command": "npx",
      "args": ["-y", "@waxseal/mcp"],
      "env": {
        "WAXSEAL_PRIVATE_KEY_PEM": "-----BEGIN PRIVATE KEY-----\n<your Ed25519 private key>\n-----END PRIVATE KEY-----"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project (or global `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "waxseal": {
      "command": "npx",
      "args": ["-y", "@waxseal/mcp"],
      "env": {
        "WAXSEAL_PRIVATE_KEY_PEM": "-----BEGIN PRIVATE KEY-----\n<your Ed25519 private key>\n-----END PRIVATE KEY-----"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "waxseal": {
      "command": "npx",
      "args": ["-y", "@waxseal/mcp"]
    }
  }
}
```

> **Don't have a WaxSeal yet?** Create one at [waxseal.id/create](https://waxseal.id/create). The free tier gives you an Ed25519 identity — no credit card required.

---

## Tools

### `waxseal_platform_info`
Returns an overview of the WaxSeal platform — the 11 trust infrastructure layers, available tiers, and how to use the other tools. Call this first if Claude or Cursor is unfamiliar with WaxSeal.

**No input required.**

---

### `waxseal_verify_identity`
Look up any WaxSeal fingerprint. Returns on-chain status, display name, owner wallet, lifecycle status, and chain.

```
Input:
  fingerprint  string  — 64-char hex (0x prefix optional)

Output:
  on_chain         boolean
  display_name     string
  lifecycle_status "active" | "revoked" | "superseded"
  chain            "base" | "eth" | "bsc"
  chain_name       string
  owner_wallet     string (0x address)
  minted_at        ISO timestamp
  verification_url string
  public_key_hex   string (raw 32-byte Ed25519 key)
```

**Example prompt:** *"Look up WaxSeal fingerprint a3b4c5d6... and tell me who owns it."*

---

### `waxseal_sign_document`
Sign any text or document with your WaxSeal Ed25519 private key. Returns a fingerprint, SHA-256 content hash, and base64 signature that can be independently verified.

**Requires `WAXSEAL_PRIVATE_KEY_PEM`.**

```
Input:
  content      string  — document text to sign
  description  string? — human-readable label (optional)

Output:
  fingerprint    string  — your 64-char WaxSeal fingerprint
  content_hash   string  — SHA-256 hex of the content
  signature      string  — base64 Ed25519 signature
  timestamp      number  — unix seconds
  signed_at      string  — ISO timestamp
  key_id         string  — last 16 chars of fingerprint (human-readable)
```

**Example prompt:** *"Sign this contract with my WaxSeal key: [contract text]"*

---

### `waxseal_verify_signature`
Verify a WaxSeal Ed25519 signature. Fetches the public key for the fingerprint from the WaxSeal network and verifies the signature locally.

```
Input:
  content      string  — the original document that was signed
  fingerprint  string  — 64-char hex fingerprint of the claimed signer
  signature    string  — base64 Ed25519 signature

Output:
  valid    boolean
  signer   string  — display name of the signer
  chain    string  — chain where the seal is minted
  message  string  — human-readable verification result
```

**Example prompt:** *"Verify this signature from fingerprint a1b2c3... against the document: [content]"*

---

### `waxseal_create_approval`
Create a cryptographically signed approval token that proves you authorized a specific AI agent action. The token is time-limited and tamper-evident — the agent verifies it before executing.

**Requires `WAXSEAL_PRIVATE_KEY_PEM`.**

```
Input:
  action              string  — description of the action being approved
  context             string? — additional parameters or context (optional)
  expires_in_minutes  number? — default 10

Output:
  approval_token  string  — base64-encoded signed token (pass to the agent)
  fingerprint     string  — your fingerprint
  action          string
  issued_at       string  — ISO timestamp
  expires_at      string  — ISO timestamp
```

**Example prompt:** *"Create an approval for the agent to deploy version 2.1.0 to production, valid for 5 minutes."*

---

### `waxseal_verify_approval`
Verify an approval token before executing a high-risk or irreversible action. Returns `valid: true` only when the token is cryptographically authentic, unexpired, and the signer has an active on-chain seal.

```
Input:
  approval_token        string  — token from waxseal_create_approval
  expected_fingerprint  string? — require a specific signer (optional)

Output:
  valid            boolean
  action           string
  signer           string
  fingerprint      string
  issued_at        string
  expires_at       string
  seconds_remaining number
  message          string
```

**Example prompt:** *"Before you deploy, verify this approval token: [token]"*

---

## Human-in-the-loop pattern

The `create_approval` + `verify_approval` pair is WaxSeal's answer to autonomous AI agents executing high-risk actions without explicit human consent:

```
1. Human tells Claude: "Deploy to production when ready, here's my approval:"
2. Claude calls waxseal_create_approval({ action: "Deploy v2.1.0 to production", expires_in_minutes: 30 })
3. Claude stores the approval_token
4. When ready to deploy, Claude calls waxseal_verify_approval({ approval_token })
5. Only if valid: true does Claude proceed
```

The signature is tied to an on-chain WaxSeal identity — unforgeable, auditable, and revocable.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `WAXSEAL_PRIVATE_KEY_PEM` | For signing tools | Ed25519 private key in PEM format |
| `WAXSEAL_API_URL` | No | Override API base (default: `https://api.waxseal.id`) |
| `WAXSEAL_API_TOKEN` | No | Bearer token for authenticated API calls |

**Verify-only tools** (`waxseal_verify_identity`, `waxseal_verify_signature`, `waxseal_verify_approval`, `waxseal_platform_info`) work without any environment variables — no key required.

---

## Get your WaxSeal

1. Go to [waxseal.id/create](https://waxseal.id/create)
2. Generate your Ed25519 keypair (done in-browser, private key never leaves your device)
3. Mint your seal on Base, Ethereum, or BNB Chain
4. Export your private key PEM and set `WAXSEAL_PRIVATE_KEY_PEM`

Free tier includes identity minting and QR code generation. Developer tier ($49/mo) unlocks AI agent signing, payment routing, and webhook authentication.

---

## Security

- **Private keys never leave your machine.** The MCP server runs locally; your key is only read from the environment variable, never transmitted.
- **Verification is on-chain.** Signatures are verified against public keys stored in the WaxSeal NFT contract on Ethereum/Base/BNB Chain — not a centralized database.
- **Approval tokens are replay-proof.** Each token includes an expiry and is signed with your Ed25519 key. A tampered token fails verification.

---

## Links

- [waxseal.id](https://waxseal.id) — Platform home
- [waxseal.id/platform](https://waxseal.id/platform) — Architecture overview
- [waxseal.id/developers](https://waxseal.id/developers) — Developer docs
- [waxseal.id/create](https://waxseal.id/create) — Get your seal

MIT License © Wax Seal
