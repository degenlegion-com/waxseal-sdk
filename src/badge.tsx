import { useEffect, useState } from "react";
  import { verifySeal, type VerifyResult } from "./verify";

  export interface WaxSealBadgeProps {
    /** 64-character hex fingerprint. */
    fingerprint: string;
    /** Custom link target. Defaults to the seal's public page on waxseal.id. */
    href?: string;
    className?: string;
  }

  /**
   * Drop-in React badge that shows a live on-chain verification status.
   *
   * @example
   * <WaxSealBadge fingerprint="a1b2c3d4..." />
   */
  export function WaxSealBadge({ fingerprint, href, className }: WaxSealBadgeProps) {
    const [seal, setSeal] = useState<VerifyResult | null>(null);

    useEffect(() => {
      let active = true;
      verifySeal({ fingerprint }).then((r) => { if (active) setSeal(r); });
      return () => { active = false; };
    }, [fingerprint]);

    if (!seal) return <span className={className}>Verifying…</span>;
    if (!seal.valid || !seal.onChain) return <span className={className}>Unverified</span>;

    const url = href ?? `https://waxseal.id/seal/${seal.fingerprint}`;

    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        ✦ Wax Seal · {seal.displayName ?? seal.fingerprint.slice(0, 8)}
      </a>
    );
  }
  