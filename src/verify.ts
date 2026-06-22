const API_BASE = "https://api.waxseal.id";

  export interface VerifyOptions {
    /** 64-character hex fingerprint of the seal to verify. */
    fingerprint: string;
    /** Optional message the seal holder is claimed to have signed. */
    message?: string;
    /** Base64url signature over `message`, required when `message` is provided. */
    signature?: string;
  }

  export interface VerifyResult {
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
  }

  /**
   * Verify a Wax Seal fingerprint against the on-chain registry.
   * Optionally verifies a cryptographic signature produced by the seal holder.
   */
  export async function verifySeal(options: VerifyOptions): Promise<VerifyResult> {
    const { fingerprint, message, signature } = options;

    if (!/^[0-9a-f]{64}$/i.test(fingerprint)) {
      return { valid: false, fingerprint, onChain: false, error: "Invalid fingerprint — expected 64 hex characters." };
    }

    try {
      const res = await fetch(`${API_BASE}/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: fingerprint.toLowerCase(), message, signature }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        return { valid: false, fingerprint, onChain: false, error: err.error ?? `HTTP ${res.status}` };
      }
      return res.json() as Promise<VerifyResult>;
    } catch (err) {
      return { valid: false, fingerprint, onChain: false, error: (err as Error).message };
    }
  }
  