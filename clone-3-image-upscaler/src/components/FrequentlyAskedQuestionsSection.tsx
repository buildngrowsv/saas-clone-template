"use client";

/**
 * FREQUENTLY ASKED QUESTIONS SECTION — FrequentlyAskedQuestionsSection
 *
 * This component serves two critical purposes for UpscaleAI:
 *
 * 1. SEO VALUE: Each Q&A pair targets a long-tail search query related to
 *    AI image upscaling. Google often pulls FAQ content into featured snippets
 *    (the answer box at the top of search results). By structuring our content
 *    as clear questions and answers, we increase our chances of ranking for
 *    queries like:
 *    - "how to upscale image with AI for free"
 *    - "what is the best AI image upscaler"
 *    - "can AI really improve image quality"
 *    - "what resolution can AI upscaler achieve"
 *
 * 2. OBJECTION HANDLING: Each question addresses a common concern that
 *    might prevent a user from trying the tool or upgrading to Pro.
 *    The answers are honest and specific — vague or evasive answers
 *    reduce trust, while direct answers build confidence.
 *
 * CONTENT DIFFERENCES FROM CLONE-1 (BG Remover):
 * The FAQ content is entirely different because image upscaling raises
 * different questions than background removal:
 * - Quality concerns: "Will it look blurry?" (upscaling-specific)
 * - Resolution limits: "What's the max output size?" (upscaling-specific)
 * - Scale factors: "What's the difference between 2x, 4x, 8x?"
 * - Use cases: "Can I upscale for printing?" (print DPI is upscaling-specific)
 * - Technology: "How is this different from just resizing?" (key differentiator)
 *
 * WHY IT'S A CLIENT COMPONENT:
 * The Accordion component from shadcn/ui requires client-side JavaScript
 * for the expand/collapse animation. If we used static HTML with <details>
 * elements, we could make this a Server Component, but the Accordion
 * provides a smoother UX with animated transitions.
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
 * FAQ data structure — each entry is a question-answer pair specific to
 * image upscaling.
 *
 * Defined as a typed array outside the component for:
 * 1. Readability — easy to scan and update the FAQ content
 * 2. Testability — can be imported by tests to verify content
 * 3. Reusability — could be used on a dedicated /faq page later
 *
 * The "value" field is the Accordion's unique identifier for each item.
 * It must be unique within the accordion for expand/collapse to work.
 *
 * Each answer is crafted to:
 * - Be detailed enough for SEO (Google rewards comprehensive answers)
 * - Include secondary keywords naturally (not keyword-stuffed)
 * - Address the actual user concern behind the question
 * - End with a positive note that encourages trying the tool
 */
const frequentlyAskedQuestionsAboutImageUpscaling: Array<{
  value: string;
  question: string;
  answer: string;
}> = [
  {
    value: "how-ai-upscaling-works",
    question: "How does AI image upscaling work?",
    answer:
      "Our AI uses advanced deep learning models (based on Real-ESRGAN architecture) that have been trained on millions of image pairs at different resolutions. When you upload an image, the AI analyzes patterns, textures, edges, and details in the original — then intelligently generates new pixels to fill in the gaps when enlarging. Unlike traditional resizing (which just stretches existing pixels and creates blur), AI upscaling predicts what the missing detail SHOULD look like, resulting in sharp, natural-looking results with genuine detail enhancement.",
  },
  {
    value: "is-upscaler-free",
    question: "Is this AI image upscaler really free?",
    answer:
      "Yes! You can upscale up to 3 images per day completely free — no signup, no credit card, no watermarks. The free tier supports up to 2x upscaling and delivers the same AI quality as our Pro plan. If you need more than 3 upscales per day, or want access to 4x and 8x scale factors, our Pro plan ($9.99/month) gives you unlimited access with maximum resolution output.",
  },
  {
    value: "difference-between-scale-factors",
    question: "What's the difference between 2x, 4x, and 8x upscaling?",
    answer:
      "The scale factor determines how much the image dimensions are multiplied. A 2x upscale doubles width and height (so a 500x500 image becomes 1000x1000). A 4x upscale quadruples dimensions (500x500 becomes 2000x2000). An 8x upscale multiplies by eight (500x500 becomes 4000x4000). Higher scale factors produce larger images but may take longer to process. For most use cases, 2x or 4x is ideal. 8x is best for very small source images that need significant enlargement, like old photos or thumbnails.",
  },
  {
    value: "output-quality",
    question: "Will the upscaled image look blurry or pixelated?",
    answer:
      "No — that's the whole point of AI upscaling versus traditional resizing. Traditional image enlargement just stretches pixels, which creates blur and visible pixel blocks. Our AI generates new, realistic detail during the upscaling process. The result looks naturally sharp with textures, edges, and fine details that weren't visible in the original. That said, results depend on the source image quality — a very low-resolution or heavily compressed source may have some limitations. For best results, start with the highest quality source image available.",
  },
  {
    value: "max-resolution",
    question: "What is the maximum output resolution?",
    answer:
      "The maximum output resolution depends on your source image size and the scale factor you choose. With 8x upscaling, a 1000x1000 pixel source image becomes 8000x8000 pixels — that's 64 megapixels, more than enough for large-format printing. We support source images up to 10MB in size. Pro users get maximum resolution output at all scale factors, while free tier users get standard resolution at 2x. There is no hard cap on output dimensions, but extremely large outputs may take longer to process.",
  },
  {
    value: "supported-formats",
    question: "What image formats are supported?",
    answer:
      "You can upload JPEG, PNG, and WebP images up to 10MB in size. The output format matches your input — JPEG sources produce JPEG output (maintaining quality settings), and PNG sources produce PNG output. All outputs are optimized for the best quality-to-file-size ratio. We recommend uploading PNG for lossless quality or the highest-quality JPEG you have available, as the AI works best with clean source material.",
  },
  {
    value: "use-cases-for-upscaling",
    question: "What can I use AI image upscaling for?",
    answer:
      "AI upscaling is perfect for: printing photos at larger sizes without losing quality, enhancing product images for e-commerce (Amazon, Shopify, Etsy), restoring and enlarging old family photos, preparing images for large displays and banners, improving social media content quality, upscaling screenshots and digital art, preparing images for marketing materials and presentations, and enhancing thumbnails or cropped images. It's especially useful when you only have a low-resolution version of an important image.",
  },
  {
    value: "privacy-and-security",
    question: "Are my uploaded images kept private and secure?",
    answer:
      "Absolutely. Your privacy is our top priority. Uploaded images are processed in real-time and are NOT stored on our servers after processing is complete. We do not use your images for training AI models, and we do not share them with any third parties. All uploads are encrypted in transit using HTTPS/TLS encryption. You can use UpscaleAI with confidence for personal photos, confidential business images, and professional work.",
  },
  {
    value: "difference-from-simple-resize",
    question: "How is this different from just resizing an image in Photoshop?",
    answer:
      "Traditional resizing in Photoshop (or any image editor) uses interpolation algorithms like bilinear or bicubic resampling. These algorithms calculate new pixel values by averaging nearby pixels, which inevitably creates blur and softness. AI upscaling is fundamentally different — it uses neural networks trained on millions of images to PREDICT what real detail should exist in the enlarged image. The AI adds genuine texture, sharpness, and fine detail that interpolation can never produce. Think of it as the difference between stretching a photo and actually enhancing it.",
  },
  {
    value: "cancel-subscription",
    question: "Can I cancel my Pro subscription anytime?",
    answer:
      "Yes, you can cancel your Pro subscription at any time from your account settings. There are no long-term contracts or cancellation fees. When you cancel, you'll continue to have Pro access until the end of your current billing period. We also offer a 30-day money-back guarantee — if you're not satisfied with the upscaling quality, contact us for a full refund, no questions asked.",
  },
];

/**
 * FrequentlyAskedQuestionsSection — Renders the FAQ accordion for UpscaleAI
 *
 * Called from: src/app/page.tsx (the landing page)
 * Depends on: shadcn/ui Accordion component (src/components/ui/accordion.tsx)
 *
 * The accordion allows multiple items to be open simultaneously ("multiple" type)
 * because users often want to compare answers or read several at once.
 * This is especially important for upscaling FAQ where users might want to
 * see both "scale factors" and "max resolution" answers simultaneously to
 * plan their upscaling approach.
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
            Everything you need to know about AI image upscaling.
          </p>
        </div>

        {/* Accordion FAQ list — "multiple" type allows several open at once */}
        <Accordion multiple className="space-y-3">
          {frequentlyAskedQuestionsAboutImageUpscaling.map((faqItem) => (
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

        {/* Additional help prompt — catches users who didn't find their answer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Still have questions?{" "}
          <a
            href="mailto:support@upscaleai.app"
            className="text-primary font-medium hover:underline underline-offset-4"
          >
            Contact our support team
          </a>
        </p>
      </div>
    </section>
  );
}
