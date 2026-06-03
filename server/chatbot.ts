import type { ChatMessage } from "@shared/schema";
import type { IStorage } from "./storage";

const BOT_NAME = "TestBankBooks Assistant";

export const BOT_HANDOFF_HINT =
  "If you'd like a real person, just type \"agent\" and our team will jump in.";

export const BOT_WELCOME = (visitorName?: string | null): string => {
  const name = visitorName ? `, ${visitorName}` : "";
  return [
    `Hi${name}! I'm the TestBankBooks Assistant.`,
    "",
    "I can help with:",
    "• How you'll receive your order",
    "• Where to find your download",
    "• Payment methods, refunds, and policies",
    "",
    BOT_HANDOFF_HINT,
  ].join("\n");
};

interface Intent {
  name: string;
  patterns: RegExp[];
}

const INTENTS: Intent[] = [
  {
    name: "human_handoff",
    patterns: [
      /\b(agent|human|person|real (person|human|agent)|talk to (someone|support|staff)|live (agent|person))\b/i,
    ],
  },
  {
    name: "greeting",
    patterns: [/^\s*(hi|hello|hey|hola|salam|good (morning|afternoon|evening))\b/i],
  },
  {
    name: "thanks",
    patterns: [/\b(thanks|thank you|thx|appreciate)\b/i],
  },
  {
    name: "download_help",
    patterns: [
      /\b(download|file|link|access|zip|pdf)\b/i,
      /\b(can'?t|cannot|didn'?t|did not|haven'?t|have not)\b.*\b(get|receive|find|open)\b/i,
      /\bwhere\b.*\b(my|the)\b.*\b(file|download|order|book|test ?bank)\b/i,
      /\bnot received\b/i,
    ],
  },
  {
    name: "order_status",
    patterns: [
      /\b(order|purchase|bought|paid)\b.*\b(status|where|when|update)\b/i,
      /\b(track|tracking)\b/i,
      /\bmy (order|purchase)\b/i,
    ],
  },
  {
    name: "how_to_receive",
    patterns: [
      /\bhow\b.*\b(receive|get|delivery|delivered|deliver|sent|send)\b/i,
      /\b(shipping|ship|mail|post|courier|physical)\b/i,
      /\b(digital|instant|immediately|right away)\b/i,
    ],
  },
  {
    name: "payment_methods",
    patterns: [
      /\b(payment|pay|paying|card|credit|debit|paypal|stripe|apple ?pay|google ?pay|crypto|bitcoin)\b/i,
      /\bhow can i pay\b/i,
    ],
  },
  {
    name: "refund_policy",
    patterns: [/\b(refund|return|money back|cancel|cancellation)\b/i],
  },
  {
    name: "pricing",
    patterns: [/\b(price|cost|how much|expensive|cheap|discount|coupon|promo)\b/i],
  },
  {
    name: "what_is",
    patterns: [
      /\bwhat (is|are) (a |the )?test ?bank/i,
      /\bdo you (have|sell|offer)\b/i,
    ],
  },
  {
    name: "contact",
    patterns: [/\b(contact|email|phone|call|reach)\b/i],
  },
];

function detectIntent(text: string): string {
  const lower = text.toLowerCase().trim();
  for (const intent of INTENTS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(lower)) return intent.name;
    }
  }
  return "fallback";
}

function buildLinkLine(title: string, url: string | null | undefined): string {
  if (!url) return `• ${title} — (no link on file, our team will resend)`;
  // External http(s) links are sent verbatim; local /uploads/* paths are
  // expanded to fully-qualified URLs so the visitor can click them.
  const fullUrl = /^https?:\/\//i.test(url)
    ? url
    : `https://testbankbooks.com${url.startsWith("/") ? "" : "/"}${url}`;
  return `• ${title}\n  ${fullUrl}`;
}

const GENERIC_DOWNLOAD_INFO = [
  "Your test banks are 100% digital — there's no shipping. After payment you receive your download in two ways:",
  "",
  "1. **Email** — A confirmation email is sent right after checkout to the address you used. It contains a download link for each item.",
  "2. **Thank-you page** — Right after payment, the order confirmation page also shows direct download buttons.",
  "",
  "If you can't find your email:",
  "• Check your spam / promotions folder",
  "• Make sure you're checking the same inbox you used at checkout",
  "• Whitelist `support@testbankbooks.com`",
];

async function buildDownloadReply(visitorEmail?: string | null, storage?: IStorage): Promise<string> {
  if (!visitorEmail || !storage) {
    return [
      ...GENERIC_DOWNLOAD_INFO,
      "",
      "Reply with the email address you used at checkout and I'll look up your order and resend your download links right here in chat.",
      "",
      BOT_HANDOFF_HINT,
    ].join("\n");
  }

  try {
    const orders = await storage.getOrdersByEmail(visitorEmail);
    const paid = orders.filter((o) => (o.status || "").toLowerCase() === "paid");

    if (paid.length === 0) {
      return [
        `I checked our records for **${visitorEmail}** and couldn't find a completed order yet.`,
        "",
        "If you used a different email at checkout, share it here and I'll check again.",
        "",
        ...GENERIC_DOWNLOAD_INFO,
        "",
        BOT_HANDOFF_HINT,
      ].join("\n");
    }

    const latest = paid.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    )[0];

    const productIds = latest.productIds || [];
    const productTitles = latest.productTitles || [];

    // Resolve each product to its current download URL.
    const lines: string[] = [];
    let missing = 0;
    for (let i = 0; i < productIds.length; i++) {
      const pid = productIds[i];
      const fallbackTitle = productTitles[i] || "Your test bank";
      try {
        const product = await storage.getProductById(pid);
        const title = product?.title || fallbackTitle;
        const url = product?.downloadPath || null;
        if (!url) missing++;
        lines.push(buildLinkLine(title, url));
      } catch {
        missing++;
        lines.push(buildLinkLine(fallbackTitle, null));
      }
    }

    const intro = `Good news — I found your most recent paid order under **${visitorEmail}**. Here are your direct download links:`;
    const footer = missing > 0
      ? `\n\nA few items don't have a working link in our system right now — type "agent" and our team will resend those manually.`
      : `\n\nClick each link to download. For your security, please don't share these links with anyone else. If a link doesn't work, type "agent" and we'll resend it.`;

    return [intro, "", ...lines].join("\n") + footer;
  } catch {
    return [
      ...GENERIC_DOWNLOAD_INFO,
      "",
      BOT_HANDOFF_HINT,
    ].join("\n");
  }
}

const STATIC_REPLIES: Record<string, string> = {
  greeting: [
    "Hi there! 👋 How can I help today?",
    "",
    "I can answer questions about delivery, downloads, payment, and refunds.",
    "",
    BOT_HANDOFF_HINT,
  ].join("\n"),

  thanks: "You're welcome! Anything else I can help with?",

  how_to_receive: [
    "All TestBankBooks products are **digital downloads** — there is no physical shipping.",
    "",
    "As soon as your payment goes through, you'll get:",
    "• A confirmation email with secure download links",
    "• A thank-you page with the same download buttons",
    "",
    "Delivery is instant. If your email hasn't arrived in a few minutes, check spam or reply here with the email you used and I'll look it up.",
  ].join("\n"),

  order_status: [
    "Orders are processed instantly because all products are digital. The moment your payment is confirmed, the order is marked **paid** and the download links are released.",
    "",
    "Reply with the email you used at checkout and I'll check the status of your most recent order.",
  ].join("\n"),

  payment_methods: [
    "We accept the following payment methods at checkout:",
    "",
    "• Credit / debit cards (Visa, Mastercard, Amex)",
    "• PayPal",
    "• Apple Pay & Google Pay",
    "• Link by Stripe",
    "",
    "All payments are processed securely through Stripe and PayPal — we never see your card details.",
  ].join("\n"),

  refund_policy: [
    "Because every product is delivered instantly as a digital download, refunds are only issued in specific cases (wrong file delivered, technical issues we can't resolve, accidental duplicate purchase).",
    "",
    "Full details are on our Refund Policy page: /refund-policy",
    "",
    `If you believe you qualify, type "agent" and our team will review your case.`,
  ].join("\n"),

  pricing: [
    "Each product page shows the current price. Most test banks are between $15–$25, with frequent sale prices.",
    "",
    "We don't currently offer discount codes, but sale prices are already applied automatically when you add the item to cart.",
  ].join("\n"),

  what_is: [
    "A **test bank** is a collection of practice questions (multiple-choice, true/false, short-answer, etc.) that match each chapter of your textbook. They're a fast way to study and self-quiz before exams.",
    "",
    "Browse our catalog: /shop",
  ].join("\n"),

  contact: [
    "You can reach us through:",
    "",
    "• This live chat — I'll route you to a human if I can't answer",
    "• Email: **support@testbankbooks.com**",
    "• Phone: **+1 (339) 228-4593**",
    "",
    "Our team usually replies within a few hours.",
  ].join("\n"),

  human_handoff: [
    "Got it — I've flagged this conversation for our team. A real person will reply here as soon as they're available.",
    "",
    "In the meantime, feel free to leave any details or questions and we'll have everything ready when we jump in.",
  ].join("\n"),

  fallback: [
    "I want to make sure I help you correctly — could you give me a bit more detail?",
    "",
    "I can help with: receiving your order, finding your download, payment methods, refunds, and pricing.",
    "",
    BOT_HANDOFF_HINT,
  ].join("\n"),
};

const HUMAN_HANDOFF_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours

export function shouldBotReply(recentMessages: ChatMessage[]): boolean {
  // If a human admin (non-bot) has replied within the last 12 hours,
  // step aside and let the human handle this conversation.
  const cutoff = Date.now() - HUMAN_HANDOFF_WINDOW_MS;
  const handedOff = recentMessages.some((m) => {
    if (m.senderType !== "admin") return false;
    const ts = new Date(m.createdAt || 0).getTime();
    return ts >= cutoff;
  });
  return !handedOff;
}

export async function generateBotReply(
  userMessage: string,
  visitorEmail?: string | null,
  storage?: IStorage,
): Promise<string> {
  const intent = detectIntent(userMessage);

  if (intent === "download_help" || intent === "order_status") {
    if (intent === "order_status" && visitorEmail && storage) {
      try {
        const orders = await storage.getOrdersByEmail(visitorEmail);
        if (orders.length > 0) {
          const paid = orders.filter(
            (o) => (o.status || "").toLowerCase() === "paid",
          );
          if (paid.length > 0) {
            const latest = paid.sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() -
                new Date(a.createdAt || 0).getTime(),
            )[0];
            return [
              `Found your order, ${visitorEmail}!`,
              `Status: **${latest.status}** • Total: $${latest.amount}`,
              "",
              "Your download links were emailed to you and are also available on the thank-you page right after checkout.",
              "",
              `If you can't find the email, type "download" and I'll walk you through it, or type "agent" to reach our team.`,
            ].join("\n");
          }
        }
      } catch {
        /* fall through */
      }
    }
    if (intent === "download_help") {
      return buildDownloadReply(visitorEmail, storage);
    }
  }

  return STATIC_REPLIES[intent] ?? STATIC_REPLIES.fallback;
}

export { BOT_NAME };
