import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  createPrivateKey,
  createPublicKey,
  createHash,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";

// ── Configuration ─────────────────────────────────────────────────────────────

const API_BASE = (process.env["WAXSEAL_API_URL"] ?? "https://api.waxseal.id").replace(/\/$/, "");
const PRIVATE_KEY_PEM = process.env["WAXSEAL_PRIVATE_KEY_PEM"] ?? "";
const API_TOKEN = process.env["WAXSEAL_API_TOKEN"] ?? "";

// ── Crypto helpers ────────────────────────────────────────────────────────────

// Ed25519 SPKI DER prefix (12 bytes): ASN.1 SubjectPublicKeyInfo header for Ed25519
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function rawKeyHexToPem(rawHex: string): string {
  const rawBuf = Buffer.from(rawHex, "hex");
  const spkiDer = Buffer.concat([SPKI_PREFIX, rawBuf]);
  const b64 = spkiDer.toString("base64");
  return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
}

function pemToFingerprint(publicKeyPem: string): string {
  const pubKey = createPublicKey({ key: publicKeyPem, format: "pem" });
  const spkiDer = Buffer.from(pubKey.export({ type: "spki", format: "der" }));
  const rawKey = spkiDer.subarray(12);
  return createHash("sha256").update(rawKey).digest("hex");
}

function loadPrivateKey() {
  if (!PRIVATE_KEY_PEM) {
    throw new Error(
      "WAXSEAL_PRIVATE_KEY_PEM is not configured. " +
        "Set this environment variable to your Ed25519 private key PEM to enable signing tools.",
    );
  }
  return createPrivateKey({ key: PRIVATE_KEY_PEM, format: "pem" });
}

function deriveFingerprint(privKey: ReturnType<typeof createPrivateKey>): string {
  const pubKey = createPublicKey(privKey);
  const spkiDer = Buffer.from(pubKey.export({ type: "spki", format: "der" }));
  const rawKey = spkiDer.subarray(12);
  return createHash("sha256").update(rawKey).digest("hex");
}

function signContent(privKey: ReturnType<typeof createPrivateKey>, content: string): string {
  const contentHash = createHash("sha256").update(content).digest();
  const sig = cryptoSign(null, contentHash, privKey);
  return sig.toString("base64");
}

function verifySignatureWithPem(publicKeyPem: string, content: string, signatureB64: string): boolean {
  const pubKey = createPublicKey({ key: publicKeyPem, format: "pem" });
  const contentHash = createHash("sha256").update(content).digest();
  const sigBuf = Buffer.from(signatureB64, "base64");
  return cryptoVerify(null, contentHash, pubKey, sigBuf);
}

// ── API helpers ───────────────────────────────────────────────────────────────

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

async function apiGet(path: string): Promise<JsonValue> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (API_TOKEN) headers["Authorization"] = `Bearer ${API_TOKEN}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API GET ${path} → HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<JsonValue>;
}

async function apiPost(path: string, body: unknown): Promise<JsonValue> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (API_TOKEN) headers["Authorization"] = `Bearer ${API_TOKEN}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API POST ${path} → HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<JsonValue>;
}

// ── Seal metadata lookup (returns public key for local verification) ───────────

interface SealMeta {
  fingerprint: string;
  public_key: string; // raw 32-byte hex
  name: string;
  lifecycle_status: string;
  chain: string;
  chain_name: string;
  owner: string;
  minted_at: number;
  verification_url: string;
  recovery?: { display_name?: string };
}

async function fetchSealMeta(fingerprint: string): Promise<SealMeta | null> {
  try {
    const data = await apiGet(`/api/waxseal/seal-meta/${fingerprint}`);
    return data as unknown as SealMeta;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("404") || msg.includes("400")) return null;
    throw err;
  }
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    name: "waxseal.info",
    description:
      "Returns an overview of the WaxSeal cryptographic trust infrastructure platform — what it is, " +
      "the 11 trust layers it covers, available tiers, and how to use these MCP tools. " +
      "Call this first if you are unfamiliar with WaxSeal.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "waxseal.identity.verify",
    description:
      "Look up a WaxSeal cryptographic identity by its 64-character hex fingerprint. " +
      "Returns on-chain status, display name, chain, owner wallet, lifecycle status, and the public key. " +
      "Works for any minted WaxSeal on Ethereum, Base, or BNB Chain.",
    inputSchema: {
      type: "object",
      required: ["fingerprint"],
      properties: {
        fingerprint: {
          type: "string",
          description:
            "64-character hex fingerprint — the SHA-256 of the raw Ed25519 public key. " +
            "Also accepted with a 0x prefix.",
        },
      },
    },
  },
  {
    name: "waxseal.document.sign",
    description:
      "Sign a document or message with the user's WaxSeal Ed25519 private key. " +
      "Requires the WAXSEAL_PRIVATE_KEY_PEM environment variable to be set. " +
      "Returns the fingerprint, SHA-256 content hash, and base64 Ed25519 signature — " +
      "verifiable by anyone using waxseal.signature.verify.",
    inputSchema: {
      type: "object",
      required: ["content"],
      properties: {
        content: {
          type: "string",
          description: "The document text or data to sign.",
        },
        description: {
          type: "string",
          description: "Human-readable label for what is being signed (optional, informational only).",
        },
      },
    },
  },
  {
    name: "waxseal.signature.verify",
    description:
      "Verify an Ed25519 signature produced by waxseal.document.sign (or any WaxSeal-compatible signer). " +
      "Fetches the public key for the fingerprint from the WaxSeal network, then verifies locally. " +
      "The seal must be minted on-chain for verification to succeed.",
    inputSchema: {
      type: "object",
      required: ["content", "fingerprint", "signature"],
      properties: {
        content: {
          type: "string",
          description: "The original document text or data that was signed.",
        },
        fingerprint: {
          type: "string",
          description: "64-character hex fingerprint of the signer.",
        },
        signature: {
          type: "string",
          description: "Base64 Ed25519 signature returned by waxseal.document.sign.",
        },
      },
    },
  },
  {
    name: "waxseal.approval.create",
    description:
      "Create a signed approval token that proves a human explicitly authorized a specific AI agent action. " +
      "The token encodes the action, context, expiry, and is signed with the user's WaxSeal key. " +
      "Pass the token to the AI agent — it calls waxseal.approval.verify before executing. " +
      "Requires WAXSEAL_PRIVATE_KEY_PEM.",
    inputSchema: {
      type: "object",
      required: ["action"],
      properties: {
        action: {
          type: "string",
          description:
            "Description of the action being approved " +
            "(e.g. 'Deploy v2.1.0 to production', 'Transfer 500 USDC to vendor wallet 0xabc...').",
        },
        context: {
          type: "string",
          description: "Additional parameters or context for the action (optional).",
        },
        expires_in_minutes: {
          type: "number",
          description: "Minutes until the approval expires. Defaults to 10.",
        },
      },
    },
  },
  {
    name: "waxseal.approval.verify",
    description:
      "Verify a WaxSeal approval token before an AI agent executes a high-risk or irreversible action. " +
      "Checks the cryptographic signature, expiry, and optionally confirms the signer's fingerprint. " +
      "Returns valid: true only when the token is authentic, unexpired, and the signer is on-chain.",
    inputSchema: {
      type: "object",
      required: ["approval_token"],
      properties: {
        approval_token: {
          type: "string",
          description: "The base64-encoded approval token returned by waxseal.approval.create.",
        },
        expected_fingerprint: {
          type: "string",
          description:
            "If provided, the verification also confirms the token was signed by this specific fingerprint.",
        },
      },
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────────

function handlePlatformInfo() {
  return {
    name: "Wax Seal",
    tagline: "Cryptographic Trust Infrastructure",
    description:
      "WaxSeal is a permanent fingerprint layer for every entity that needs to be trusted. " +
      "One Ed25519 keypair produces a 64-character fingerprint — the SHA-256 of the raw public key. " +
      "That fingerprint is the root of trust for identity, signing, approvals, credentials, payments, and governance.",
    fingerprint_format:
      "SHA-256 of the raw 32-byte Ed25519 public key — 64 lowercase hex characters",
    verification_time: "< 1 second (local Ed25519 verify)",
    supported_chains: ["Ethereum", "Base", "BNB Chain"],
    platform_layers: [
      "01 Humans — permanent individual identity not tied to any platform",
      "02 Organizations — team identity with delegation trees and governance",
      "03 Software — microservices sign requests; no shared secrets",
      "04 APIs — Ed25519-signed webhook delivery and stateless auth",
      "05 AI Agents — every agent carries a signed identity; human approval gates",
      "06 Products — physical goods with on-chain provenance",
      "07 Physical Assets — IoT digital twins anchored on-chain",
      "08 QR Codes — permanent code, updatable destination via fingerprint",
      "09 Payments — signed payment routing; agents pay the right address",
      "10 Credentials — W3C-compatible verifiable credentials from a fingerprint",
      "11 Governance — delegation, attestation, revocation, audit trail",
    ],
    tiers: [
      { name: "Free", price: "$0/mo", includes: "Humans, QR Codes" },
      { name: "Pro", price: "$9/mo", includes: "Credentials, custom profile" },
      { name: "Developer", price: "$49/mo", includes: "Software, APIs, AI Agents, Payments" },
      { name: "Business", price: "$299/mo", includes: "Organizations, Governance, multi-agent" },
      { name: "Sovereign", price: "$2,499/mo", includes: "All 11 layers — own chain, own key" },
    ],
    website: "https://waxseal.id",
    platform_overview: "https://waxseal.id/platform",
    developers: "https://waxseal.id/developers",
    get_your_seal: "https://waxseal.id/create",
    mcp_tools: [
      "waxseal.info — this overview",
      "waxseal.identity.verify — look up any WaxSeal fingerprint",
      "waxseal.document.sign — sign content with your WaxSeal private key",
      "waxseal.signature.verify — verify a WaxSeal Ed25519 signature",
      "waxseal.approval.create — create a signed human-approval token for an AI agent",
      "waxseal.approval.verify — verify an approval token before executing a high-risk action",
    ],
    env_vars: {
      WAXSEAL_PRIVATE_KEY_PEM:
        "Ed25519 private key PEM — required for sign_document and create_approval",
      WAXSEAL_API_URL:
        "Override API base URL (default: https://api.waxseal.id)",
      WAXSEAL_API_TOKEN:
        "Optional bearer token for authenticated API calls",
    },
  };
}

async function handleVerifyIdentity(args: Record<string, unknown>) {
  const raw = typeof args["fingerprint"] === "string" ? args["fingerprint"] : "";
  const fingerprint = raw.replace(/^0x/i, "").toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(fingerprint)) {
    throw new Error("fingerprint must be 64 hex characters (0x prefix is optional)");
  }

  const meta = await fetchSealMeta(fingerprint);

  if (!meta) {
    return {
      on_chain: false,
      fingerprint,
      message:
        "This fingerprint is not minted on-chain. " +
        "It may be a free-tier WaxSeal (local only) or an invalid fingerprint. " +
        "Visit https://waxseal.id/create to mint a seal.",
    };
  }

  const displayName = meta.recovery?.display_name ?? meta.name ?? null;

  return {
    on_chain: true,
    fingerprint: meta.fingerprint,
    display_name: displayName,
    lifecycle_status: meta.lifecycle_status,
    chain: meta.chain,
    chain_name: meta.chain_name,
    owner_wallet: meta.owner,
    minted_at: meta.minted_at ? new Date(meta.minted_at * 1000).toISOString() : null,
    verification_url: meta.verification_url,
    public_key_hex: meta.public_key,
    key_id: fingerprint.slice(-16).toUpperCase(),
  };
}

async function handleSignDocument(args: Record<string, unknown>) {
  const content = typeof args["content"] === "string" ? args["content"] : "";
  const description =
    typeof args["description"] === "string" ? args["description"] : "";

  if (!content) throw new Error("content is required");

  const privKey = loadPrivateKey();
  const fingerprint = deriveFingerprint(privKey);
  const timestamp = Math.floor(Date.now() / 1000);
  const contentHash = createHash("sha256").update(content).digest("hex");
  const signature = signContent(privKey, content);

  return {
    fingerprint,
    content_hash: contentHash,
    signature,
    timestamp,
    signed_at: new Date(timestamp * 1000).toISOString(),
    description: description || undefined,
    key_id: fingerprint.slice(-16).toUpperCase(),
    verification_url: `https://waxseal.id/verify?fp=${fingerprint}`,
    how_to_verify:
      "Share fingerprint + content + signature with the verifier. " +
      "They call waxseal.signature.verify({ content, fingerprint, signature }) or POST /api/verify/seal.",
  };
}

async function handleVerifySignature(args: Record<string, unknown>) {
  const content = typeof args["content"] === "string" ? args["content"] : "";
  const raw = typeof args["fingerprint"] === "string" ? args["fingerprint"] : "";
  const fingerprint = raw.replace(/^0x/i, "").toLowerCase();
  const signature = typeof args["signature"] === "string" ? args["signature"] : "";

  if (!content) throw new Error("content is required");
  if (!/^[0-9a-f]{64}$/.test(fingerprint)) {
    throw new Error("fingerprint must be 64 hex characters");
  }
  if (!signature) throw new Error("signature is required");

  // Fetch the seal to get the raw public key
  const meta = await fetchSealMeta(fingerprint);
  if (!meta) {
    return {
      valid: false,
      fingerprint,
      message:
        "No on-chain seal found for this fingerprint. " +
        "Signature cannot be verified without a minted seal's public key.",
    };
  }

  if (meta.lifecycle_status !== "active") {
    return {
      valid: false,
      fingerprint,
      lifecycle_status: meta.lifecycle_status,
      message: `Seal lifecycle status is "${meta.lifecycle_status}" — only active seals are accepted.`,
    };
  }

  // Reconstruct PEM from raw 32-byte key
  const publicKeyPem = rawKeyHexToPem(meta.public_key);

  // Double-check the public key matches the claimed fingerprint
  let derivedFp: string;
  try {
    derivedFp = pemToFingerprint(publicKeyPem);
  } catch {
    return { valid: false, fingerprint, message: "Failed to parse the on-chain public key." };
  }

  if (derivedFp !== fingerprint) {
    return {
      valid: false,
      fingerprint,
      message: "On-chain public key fingerprint mismatch — data integrity error.",
    };
  }

  let valid: boolean;
  try {
    valid = verifySignatureWithPem(publicKeyPem, content, signature);
  } catch {
    return {
      valid: false,
      fingerprint,
      message: "Signature format is invalid — expected base64 Ed25519 signature.",
    };
  }

  const displayName = meta.recovery?.display_name ?? meta.name ?? fingerprint.slice(-16);

  return {
    valid,
    fingerprint,
    key_id: fingerprint.slice(-16).toUpperCase(),
    signer: displayName,
    chain: meta.chain_name,
    message: valid
      ? `Signature is valid. The content was signed by "${displayName}" (${fingerprint.slice(0, 8)}…).`
      : "Signature verification failed — the content may have been modified, or the signature is incorrect.",
  };
}

interface ApprovalPayload {
  action: string;
  context: string;
  fingerprint: string;
  issued_at: number;
  expires_at: number;
}

async function handleCreateApproval(args: Record<string, unknown>) {
  const action = typeof args["action"] === "string" ? args["action"].trim() : "";
  const context = typeof args["context"] === "string" ? args["context"].trim() : "";
  const expiresInMinutes =
    typeof args["expires_in_minutes"] === "number" ? args["expires_in_minutes"] : 10;

  if (!action) throw new Error("action is required");

  const privKey = loadPrivateKey();
  const fingerprint = deriveFingerprint(privKey);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + Math.round(expiresInMinutes * 60);

  const payload: ApprovalPayload = {
    action,
    context,
    fingerprint,
    issued_at: now,
    expires_at: expiresAt,
  };

  const payloadJson = JSON.stringify(payload);
  const signature = signContent(privKey, payloadJson);

  const token = Buffer.from(
    JSON.stringify({ payload: payloadJson, signature }),
  ).toString("base64");

  return {
    approval_token: token,
    fingerprint,
    key_id: fingerprint.slice(-16).toUpperCase(),
    action,
    context: context || undefined,
    issued_at: new Date(now * 1000).toISOString(),
    expires_at: new Date(expiresAt * 1000).toISOString(),
    instructions:
      "Pass approval_token to the AI agent. " +
      "The agent calls waxseal.approval.verify({ approval_token }) before executing the action. " +
      "The token expires in " + expiresInMinutes + " minute(s).",
  };
}

async function handleVerifyApproval(args: Record<string, unknown>) {
  const tokenB64 = typeof args["approval_token"] === "string" ? args["approval_token"] : "";
  const expectedFp =
    typeof args["expected_fingerprint"] === "string"
      ? args["expected_fingerprint"].replace(/^0x/i, "").toLowerCase()
      : null;

  if (!tokenB64) throw new Error("approval_token is required");

  // Decode the token
  let wrapped: { payload: string; signature: string };
  try {
    wrapped = JSON.parse(Buffer.from(tokenB64, "base64").toString("utf8")) as {
      payload: string;
      signature: string;
    };
  } catch {
    return { valid: false, message: "approval_token is malformed — cannot decode." };
  }

  let payload: ApprovalPayload;
  try {
    payload = JSON.parse(wrapped.payload) as ApprovalPayload;
  } catch {
    return { valid: false, message: "Payload inside approval_token is malformed." };
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (now > payload.expires_at) {
    return {
      valid: false,
      expired: true,
      action: payload.action,
      fingerprint: payload.fingerprint,
      expired_at: new Date(payload.expires_at * 1000).toISOString(),
      message: `Approval expired at ${new Date(payload.expires_at * 1000).toISOString()}. Request a new approval.`,
    };
  }

  // Check expected fingerprint
  if (expectedFp && payload.fingerprint.toLowerCase() !== expectedFp) {
    return {
      valid: false,
      message: `Approval was signed by fingerprint ${payload.fingerprint}, not the expected ${expectedFp}.`,
    };
  }

  // Fetch the public key from on-chain
  const meta = await fetchSealMeta(payload.fingerprint);
  if (!meta) {
    return {
      valid: false,
      fingerprint: payload.fingerprint,
      message:
        `No on-chain seal found for fingerprint ${payload.fingerprint}. ` +
        "Approval cannot be verified without a minted seal.",
    };
  }

  if (meta.lifecycle_status !== "active") {
    return {
      valid: false,
      fingerprint: payload.fingerprint,
      lifecycle_status: meta.lifecycle_status,
      message: `Signer's seal status is "${meta.lifecycle_status}" — only active seals are accepted.`,
    };
  }

  const publicKeyPem = rawKeyHexToPem(meta.public_key);

  // Verify signature
  let sigValid: boolean;
  try {
    sigValid = verifySignatureWithPem(publicKeyPem, wrapped.payload, wrapped.signature);
  } catch {
    return { valid: false, message: "Signature verification failed — invalid format." };
  }

  if (!sigValid) {
    return {
      valid: false,
      message: "Signature verification failed — the approval token has been tampered with.",
    };
  }

  const displayName = meta.recovery?.display_name ?? meta.name ?? payload.fingerprint.slice(-16);

  return {
    valid: true,
    action: payload.action,
    context: payload.context || undefined,
    fingerprint: payload.fingerprint,
    key_id: payload.fingerprint.slice(-16).toUpperCase(),
    signer: displayName,
    chain: meta.chain_name,
    issued_at: new Date(payload.issued_at * 1000).toISOString(),
    expires_at: new Date(payload.expires_at * 1000).toISOString(),
    seconds_remaining: payload.expires_at - now,
    message:
      `Approval is valid. Action "${payload.action}" was authorized by "${displayName}" ` +
      `(${payload.fingerprint.slice(0, 8)}…). Expires in ${payload.expires_at - now}s.`,
  };
}

// ── MCP server ────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "@waxseal/mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const safeArgs = (args ?? {}) as Record<string, unknown>;

  try {
    let result: unknown;

    switch (name) {
      case "waxseal.info":
        result = handlePlatformInfo();
        break;
      case "waxseal.identity.verify":
        result = await handleVerifyIdentity(safeArgs);
        break;
      case "waxseal.document.sign":
        result = await handleSignDocument(safeArgs);
        break;
      case "waxseal.signature.verify":
        result = await handleVerifySignature(safeArgs);
        break;
      case "waxseal.approval.create":
        result = await handleCreateApproval(safeArgs);
        break;
      case "waxseal.approval.verify":
        result = await handleVerifyApproval(safeArgs);
        break;
      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
