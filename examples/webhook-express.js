// examples/webhook-express.js
  // Minimal Express server that verifies Wax Seal webhook signatures.
  // Run: node webhook-express.js

  import express from "express";
  import { verifyWebhookSignature, isWaxSealWebhookEvent } from "@waxseal/verify/webhooks";

  const app = express();

  app.post("/webhook/waxseal", express.raw({ type: "*/*" }), (req, res) => {
    const signature = String(req.headers["x-waxseal-signature"] ?? "");
    const secret = process.env.WAXSEAL_WEBHOOK_SECRET ?? "";

    const valid = verifyWebhookSignature({ body: req.body, signature, secret });
    if (!valid) {
      console.warn("Rejected webhook: invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(req.body.toString());
    console.log("Event received:", event.event, event.id);

    if (isWaxSealWebhookEvent(event, "seal.minted")) {
      console.log("New seal minted:", event.data.fingerprint);
    }

    if (isWaxSealWebhookEvent(event, "seal.subscription.started")) {
      console.log("Subscription started:", event.data.fingerprint, "tier:", event.data.tier);
    }

    res.sendStatus(200);
  });

  app.listen(3000, () => console.log("Webhook server listening on :3000"));
  