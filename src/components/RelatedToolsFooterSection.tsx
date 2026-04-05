/**
 * RelatedToolsFooterSection — cross-links to sibling AI tools in the SymplyAI portfolio.
 *
 * WHY THIS EXISTS (atlas-7842, 2026-04-05, SEO internal linking):
 * Google distributes PageRank through internal links. Every clone tool linking
 * to 6–8 sibling tools creates a web of authority that helps ALL tools rank
 * higher. This is the cheapest, most reliable SEO lever for a portfolio of
 * 40+ sites on the same domain (symplyai.io subdomains + custom domains).
 *
 * HOW IT WORKS:
 * - Renders a compact grid of tool links in the footer
 * - Each clone's site.ts can override `relatedTools` to show contextually
 *   relevant siblings (e.g., photo tools link to other photo tools)
 * - Falls back to a curated default set of the highest-traffic tools
 * - Links use target="_blank" since they go to different subdomains/domains
 *
 * IMPORTED BY: SiteFooter.tsx (above the copyright line)
 */

/**
 * Default set of related tools — shown when the clone's siteConfig
 * doesn't specify a custom relatedTools array. Curated for variety
 * across the portfolio's strongest categories.
 */
const DEFAULT_RELATED_TOOLS: RelatedTool[] = [
  { name: "AI Logo Generator", url: "https://generateailogo.com" },
  { name: "AI Background Remover", url: "https://removebgapp.com" },
  { name: "AI Hairstyle Generator", url: "https://hairstyle.symplyai.io" },
  { name: "AI Cartoon Generator", url: "https://cartoon.symplyai.io" },
  { name: "AI Interior Design", url: "https://airoomredesigner.com" },
  { name: "AI Face Swap", url: "https://faceswap.symplyai.io" },
  { name: "AI Tattoo Generator", url: "https://tattoo.symplyai.io" },
  { name: "AI Product Photos", url: "https://aiproductphotomaker.com" },
];

export interface RelatedTool {
  name: string;
  url: string;
}

interface RelatedToolsFooterSectionProps {
  /**
   * Optional custom list — clone's siteConfig can pass contextually
   * relevant tools (e.g., all photo-editing tools for the colorizer).
   * Falls back to DEFAULT_RELATED_TOOLS if not provided or empty.
   */
  tools?: RelatedTool[];
  /**
   * The current site's URL — used to filter out self-links so the tool
   * doesn't link to itself in the related section. Pass siteConfig.siteUrl.
   */
  currentSiteUrl?: string;
}

export function RelatedToolsFooterSection({
  tools,
  currentSiteUrl,
}: RelatedToolsFooterSectionProps) {
  const toolList = tools && tools.length > 0 ? tools : DEFAULT_RELATED_TOOLS;

  /**
   * Filter out the current site so we don't show a self-link.
   * Normalize by stripping protocol and trailing slash for comparison.
   */
  const normalize = (url: string) =>
    url.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

  const currentNorm = currentSiteUrl ? normalize(currentSiteUrl) : "";
  const filtered = toolList.filter((t) => normalize(t.url) !== currentNorm);

  if (filtered.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-800/40">
      <p className="mb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
        More AI Tools
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {filtered.map((tool) => (
          <a
            key={tool.url}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {tool.name}
          </a>
        ))}
      </div>
    </div>
  );
}
