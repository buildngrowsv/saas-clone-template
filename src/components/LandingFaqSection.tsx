/**
 * LandingFaqSection — Frequently Asked Questions for the landing page.
 * 
 * WHY FAQ MATTERS FOR CONVERSION:
 * FAQs serve two purposes:
 *   1. SEO — FAQ content ranks well for long-tail "how to" and "what is" queries
 *   2. Objection handling — each FAQ addresses a reason someone might NOT buy
 * 
 * The questions are ordered by importance:
 *   - First question handles the biggest objection (is it really free?)
 *   - Middle questions explain value (quality, speed, safety)
 *   - Last question handles the "what if" fear (can I cancel?)
 * 
 * REUSABILITY:
 * These FAQs are generic enough for any AI image tool. Customize the answers
 * per clone if the tool has unique characteristics worth highlighting.
 */

"use client";

import { useState } from "react";
import { PRODUCT_CONFIG } from "@/lib/config";

/**
 * FAQ data — each item has a question and answer.
 * Stored as data (not JSX) so it's easy to modify per clone.
 */
const FAQ_ITEMS = [
  {
    question: `Is ${PRODUCT_CONFIG.name} really free?`,
    answer: `Yes! You get ${PRODUCT_CONFIG.pricing.free.limit} free uses every ${PRODUCT_CONFIG.pricing.free.period} with no credit card required. For more uses, our paid plans start at just $${PRODUCT_CONFIG.pricing.basic.price}/month.`,
  },
  {
    question: "How good is the quality?",
    answer:
      "We use state-of-the-art AI models that produce professional-grade results. Our output quality is comparable to — or better than — manual editing by a skilled designer, and it takes seconds instead of hours.",
  },
  {
    question: "How fast is the processing?",
    answer:
      "Most files are processed in 5-15 seconds. Processing time depends on file size and complexity. Pro users get priority processing for the fastest results.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Absolutely. Your uploaded files are processed and then deleted from our servers within 1 hour. We never use your files for training or share them with third parties. All transfers are encrypted with TLS.",
  },
  {
    question: "What file formats are supported?",
    answer:
      "We support PNG, JPEG, and WebP formats for both input and output. Files up to 10MB are accepted. Pro users also get access to higher resolution outputs.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes, you can cancel anytime from your dashboard. Your paid features remain active until the end of your billing period. No cancellation fees, no tricks.",
  },
];

/**
 * Individual FAQ item with accordion behavior.
 * WHY accordion: Prevents the page from being overwhelmingly long.
 * Users can scan questions quickly and expand only what interests them.
 */
function FaqAccordionItem({
  question,
  answer,
  isExpanded,
  onToggle,
}: {
  question: string;
  answer: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/5">
      <button
        onClick={onToggle}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg font-medium text-text-primary group-hover:text-brand-400 transition-colors pr-4">
          {question}
        </span>
        <svg
          className={`w-5 h-5 text-text-muted flex-shrink-0 transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? "max-h-96 pb-6" : "max-h-0"
        }`}
      >
        <p className="text-text-secondary leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export function LandingFaqSection() {
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  const handleFaqToggle = (index: number) => {
    setExpandedFaqIndex(expandedFaqIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 px-6 border-t border-white/5">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          Frequently Asked{" "}
          <span className="gradient-text">Questions</span>
        </h2>
        <p className="text-text-secondary text-center mb-16">
          Everything you need to know about {PRODUCT_CONFIG.name}.
        </p>

        <div>
          {FAQ_ITEMS.map((faqItem, faqIndex) => (
            <FaqAccordionItem
              key={faqIndex}
              question={faqItem.question}
              answer={faqItem.answer}
              isExpanded={expandedFaqIndex === faqIndex}
              onToggle={() => handleFaqToggle(faqIndex)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
