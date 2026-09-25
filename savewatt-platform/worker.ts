// OpenNext only emits a fetch handler; this entry adds the Email Service event consumer.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- resolves only after `opennextjs-cloudflare build`
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";
import {
  handleEmailEventBatch,
  type EmailSendingEvent,
} from "./src/lib/offers/offer-delivery-events.ts";

export default {
  fetch: handler.fetch,
  async queue(batch: MessageBatch<EmailSendingEvent>, env: CloudflareEnv) {
    await handleEmailEventBatch(batch, env.DB);
  },
} satisfies ExportedHandler<CloudflareEnv, EmailSendingEvent>;
