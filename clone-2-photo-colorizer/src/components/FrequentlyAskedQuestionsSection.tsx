"use client";

/**
 * FREQUENTLY ASKED QUESTIONS SECTION — FrequentlyAskedQuestionsSection
 *
 * This component serves two critical purposes for the ColorizeAI product:
 *
 * 1. SEO VALUE: Each Q&A pair targets a long-tail search query related to
 *    photo colorization. Google often pulls FAQ content into featured snippets
 *    (the answer box at the top of search results). By structuring our content
 *    as clear questions and answers, we increase our chances of ranking for:
 *    - "how to colorize old photos for free"
 *    - "can AI colorize black and white photos"
 *    - "is AI photo colorization accurate"
 *    - "how does AI add color to black and white photos"
 *
 * 2. OBJECTION HANDLING: Each question addresses a common concern that
 *    might prevent a user from trying the tool or upgrading to Pro.
 *    Colorization has unique concerns compared to bg removal — users worry
 *    about COLOR ACCURACY (will grandma's dress be the right shade?),
 *    HISTORICAL ACCURACY (were cars really that color in the 1940s?),
 *    and QUALITY ON FACES (will skin tones look natural?). Our FAQ
 *    addresses these directly.
 *
 * WHY IT'S A CLIENT COMPONENT:
 * The Accordion component from shadcn/ui requires client-side JavaScript
 * for the expand/collapse animation.
 *
 * CONTENT STRATEGY:
 * Questions are ordered by estimated search volume (highest first) and
 * by position in the buyer's journey (awareness -> consideration -> decision).
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * FAQ data structure — each entry is a question-answer pair
 *
 * Defined as a typed array outside the component for:
 * 1. Readability — easy to scan and update the FAQ content
 * 2. Testability — can be imported by tests to verify content
 * 3. Reusability — could be used on a dedicated /faq page later
 *
 * Each question is crafted to match a specific search query that people
 * actually type into Google when looking for photo colorization tools.
 */
const frequentlyAskedQuestionsData: Array<{
  value: string;
  question: string;
  answer: string;
}> = [
  {
    value: "how-colorization-works",
    question: "How does AI photo colorization work?",
    answer:
      "Our AI uses deep learning models trained on millions of color photographs to understand what colors naturally appear in different scenes. When you upload a black and white photo, the AI analyzes the content — identifying people, landscapes, objects, clothing, and textures — and predicts the most likely realistic colors for each element. It understands context, like the fact that sky is blue, grass is green, and skin tones vary naturally. The result is a photo with historically plausible, natural-looking colors applied automatically in seconds.",
  },
  {
    value: "is-it-free",
    question: "Is this photo colorizer really free?",
    answer:
      "Yes! You can colorize up to 3 photos per day completely free — no signup, no credit card, no watermarks. The free tier delivers the same professional quality as our Pro plan. If you need to colorize more photos (for example, an entire family album), our Pro plan ($9.99/month) gives you unlimited colorizations with enhanced resolution and facial detail preservation.",
  },
  {
    value: "color-accuracy",
    question: "How accurate are the colors in the colorized photos?",
    answer:
      "Our AI produces historically plausible and realistic colors. It's trained on millions of photographs spanning different eras, cultures, and settings, so it understands period-appropriate colors for clothing, vehicles, architecture, and natural elements. Skin tones are rendered naturally across all ethnicities. However, it's important to note that the AI makes its best prediction — the exact shade of a specific dress or car may differ from the original since there's no way to know the true colors from a B&W image alone. Most users find the results very convincing and emotionally satisfying.",
  },
  {
    value: "what-photos-work-best",
    question: "What types of photos work best for colorization?",
    answer:
      "Our AI works well with a wide variety of black and white photos: portraits, family gatherings, landscapes, cityscapes, historical photos, wedding photos, military photos, and more. Photos with clear details and good contrast produce the best results. Very dark, blurry, or heavily damaged photos may have reduced quality — in those cases, we recommend scanning the original at the highest quality possible before uploading. The tool also works on sepia-toned and faded color photos to restore vivid colors.",
  },
  {
    value: "supported-formats",
    question: "What image formats are supported?",
    answer:
      "You can upload JPEG, PNG, and WebP images up to 10MB in size. The output is delivered as a high-quality JPEG or PNG file that you can download instantly. For best results, upload the highest resolution scan of your original photo available. If you have physical prints, scanning at 300 DPI or higher will give the AI more detail to work with for more accurate colorization.",
  },
  {
    value: "privacy-security",
    question: "Are my uploaded photos kept private and secure?",
    answer:
      "Absolutely. Your privacy is our top priority — we understand that old family photos are deeply personal. Uploaded images are processed in real-time and are NOT stored on our servers after processing is complete. We do not use your photos for training AI models, and we do not share them with any third parties. All uploads are encrypted in transit using HTTPS/TLS encryption. Your memories stay yours.",
  },
  {
    value: "batch-processing",
    question: "Can I colorize an entire photo album at once?",
    answer:
      "Batch album colorization is coming soon as a Pro feature! Currently, you can process photos one at a time. Each photo takes about 5-10 seconds to process. We're actively developing batch upload functionality that will let Pro users upload entire albums and colorize them all at once — perfect for families who have boxes of old black and white photos they want to bring to life.",
  },
  {
    value: "cancel-subscription",
    question: "Can I cancel my Pro subscription anytime?",
    answer:
      "Yes, you can cancel your Pro subscription at any time from your account settings. There are no long-term contracts or cancellation fees. When you cancel, you'll continue to have Pro access until the end of your current billing period. We also offer a 30-day money-back guarantee — if you're not satisfied with the colorization quality, contact us for a full refund, no questions asked.",
  },
];

/**
 * FrequentlyAskedQuestionsSection — Renders the FAQ accordion
 *
 * Called from: src/app/page.tsx (the landing page)
 * Depends on: shadcn/ui Accordion component (src/components/ui/accordion.tsx)
 *
 * The accordion allows multiple items to be open simultaneously ("multiple" type)
 * because users often want to compare answers or read several at once.
 */
export default function FrequentlyAskedQuestionsSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about AI photo colorization.
          </p>
        </div>

        {/* Accordion FAQ list — "multiple" type allows several open at once */}
        <Accordion multiple className="space-y-3">
          {frequentlyAskedQuestionsData.map((faqItem) => (
            <AccordionItem
              key={faqItem.value}
              value={faqItem.value}
              className="bg-card rounded-xl border px-6 data-[state=open]:shadow-sm transition-shadow"
            >
              <AccordionTrigger className="text-left font-medium py-5 hover:no-underline">
                {faqItem.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {faqItem.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Additional help prompt */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Still have questions?{" "}
          <a
            href="mailto:support@colorizeai.app"
            className="text-primary font-medium hover:underline underline-offset-4"
          >
            Contact our support team
          </a>
        </p>
      </div>
    </section>
  );
}
