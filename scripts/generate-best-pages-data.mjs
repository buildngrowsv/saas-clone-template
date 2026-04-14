#!/usr/bin/env node
/**
 * generate-best-pages-data.mjs — Injects bestPages SEO data into clone seo-pages.ts files
 *
 * WHY THIS EXISTS:
 * The 32 AI tool clone repos were built from saas-clone-template before the
 * SeoBestConfig / bestPages field existed in SeoPageConfig. This script
 * back-fills three listicle SEO entries per product:
 *   1. "Best Free [Tool] in 2026"              — free-tier search intent
 *   2. "Best [Tool] for [Use Case] in 2026"    — niche / primary use case intent
 *   3. "Best [Tool] with No Signup in 2026"    — friction-averse / privacy intent
 *
 * WHAT IT CHANGES PER FILE:
 *   - Adds SeoBestConfig interface (after SeoUseCaseConfig interface)
 *   - Adds `readonly bestPages: SeoBestConfig[];` to SeoPageConfig interface
 *   - Adds `bestPages: [...]` block before the closing `};` of the config object
 *
 * USAGE:
 *   node scripts/generate-best-pages-data.mjs              # dry-run (prints diffs)
 *   node scripts/generate-best-pages-data.mjs --apply      # writes files
 *
 * INVOKED FROM: saas-clone-template root (script reads sibling repos in ../Github/)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const GITHUB_DIR = resolve(__dirname, "../../");

/* ------------------------------------------------------------------ */
/* Target repos                                                         */
/* ------------------------------------------------------------------ */

const TARGET_REPOS = [
  "ai-animated-photo-generator-web",
  "ai-anime-portrait-generator",
  "ai-avatar-generator",
  "ai-baby-generator",
  "ai-birthday-card-generator",
  "ai-business-card-generator",
  "ai-cartoon-generator",
  "ai-chart-from-data",
  "ai-chart-generator",
  "ai-coloring-page-generator",
  "ai-face-swap",
  "ai-food-photography-generator",
  "ai-hairstyle-generator",
  "ai-icon-generator",
  "ai-meme-generator",
  "ai-music-generator",
  "ai-outfit-generator",
  "ai-pet-portrait",
  "ai-photo-colorizer",
  "ai-photo-restorer",
  "ai-presentation-maker",
  "ai-professional-headshots",
  "ai-qr-code-art",
  "ai-resume-photo-generator",
  "ai-sketch-to-image",
  "ai-storybook-illustrator",
  "ai-tattoo-generator",
  "ai-text-to-speech",
  "ai-vector-illustration",
  "ai-wallpaper-generator",
  "ai-watercolor-generator",
  "ai-yearbook-photo-generator",
];

/* ------------------------------------------------------------------ */
/* Product keyword derivation from repo name                           */
/* ------------------------------------------------------------------ */

/**
 * Strips "ai-" prefix and common suffixes (-generator, -maker, -web) to
 * yield the core product keyword used in slugs and titles.
 *
 * Examples:
 *   ai-cartoon-generator     → "cartoon"
 *   ai-face-swap             → "face-swap"
 *   ai-chart-from-data       → "chart-from-data"
 *   ai-animated-photo-generator-web → "animated-photo"
 *   ai-text-to-speech        → "text-to-speech"
 *   ai-professional-headshots → "professional-headshots"
 */
function deriveProductKeyword(repoName) {
  let keyword = repoName;
  // Strip leading "ai-"
  keyword = keyword.replace(/^ai-/, "");
  // Strip trailing suffixes (-generator-web, -generator, -maker, -web)
  keyword = keyword.replace(/-generator-web$/, "").replace(/-generator$/, "").replace(/-maker$/, "").replace(/-web$/, "");
  return keyword;
}

/**
 * Converts a kebab-case keyword to Title Case for display in headings.
 * "face-swap" → "Face Swap"
 * "text-to-speech" → "Text to Speech"
 * "professional-headshots" → "Professional Headshots"
 */
function toTitleCase(keyword) {
  const lowers = new Set(["to", "of", "in", "for", "with", "and", "or", "the", "a"]);
  return keyword
    .split("-")
    .map((word, i) => (i === 0 || !lowers.has(word)) ? word.charAt(0).toUpperCase() + word.slice(1) : word)
    .join(" ");
}

/* ------------------------------------------------------------------ */
/* Per-product SEO data definitions                                    */
/* ------------------------------------------------------------------ */

/**
 * Product data table — primary use case and 5 features per bestPages entry.
 * Keyed by the derived product keyword. Each entry has:
 *   - primaryUseCase: used in slug 2 ("best [keyword] for [primaryUseCase]")
 *   - useCaseLabel: human-readable label for the use case
 *   - freeFeatures: 5 features for the "best free" entry
 *   - useCaseFeatures: 5 features for the primary use case entry
 *   - noSignupFeatures: 5 features for the "no signup" entry
 */
const PRODUCT_DATA = {
  "animated-photo": {
    primaryUseCase: "social-media",
    useCaseLabel: "Social Media",
    freeFeatures: [
      "Free daily animated photo credits with no credit card required",
      "AI-powered motion generation that makes still photos come alive",
      "Multiple animation styles including zoom, pan, and particle effects",
      "Export as GIF or MP4 for instant sharing across platforms",
      "High-quality output without watermarks on the free tier",
    ],
    useCaseFeatures: [
      "One-click animated posts optimized for Instagram Reels and TikTok",
      "Portrait and landscape animation modes for any feed format",
      "Smooth looping animations that capture attention mid-scroll",
      "Instant processing — no wait time between uploads",
      "Download in platform-ready resolutions for every major network",
    ],
    noSignupFeatures: [
      "No account required — upload a photo and animate immediately",
      "No email or phone verification to start creating",
      "No payment details needed to access free animations",
      "No watermarks on free-tier outputs",
      "No software to install — runs entirely in your browser",
    ],
  },

  "anime-portrait": {
    primaryUseCase: "digital-artists",
    useCaseLabel: "Digital Artists",
    freeFeatures: [
      "Free daily anime portrait conversions with no signup required",
      "High-fidelity anime style transfer that preserves facial structure",
      "Multiple art styles including shōnen, shōjo, and chibi aesthetics",
      "High-resolution output suitable for printing and digital display",
      "No watermarks on free outputs",
    ],
    useCaseFeatures: [
      "Style consistency tools that match existing character sheets",
      "Fine-grained control over line weight, shading, and color palette",
      "Layer-compatible PNG exports for further editing in Procreate or Photoshop",
      "Batch conversion for turning photo series into consistent character art",
      "Reference image support to match a specific anime art style",
    ],
    noSignupFeatures: [
      "No account creation — convert photos to anime style immediately",
      "No email verification or onboarding steps",
      "No credit card required for free portrait conversions",
      "No watermarks on free-tier anime outputs",
      "No app download — works in any modern browser",
    ],
  },

  "avatar": {
    primaryUseCase: "professional-profiles",
    useCaseLabel: "Professional Profiles",
    freeFeatures: [
      "Free daily AI avatar generations with no credit card required",
      "Photorealistic avatar styles for professional and social use",
      "Wide range of aesthetic styles from hyper-real to illustrated",
      "High-resolution downloads suitable for profile photos",
      "No watermarks on free-tier avatar outputs",
    ],
    useCaseFeatures: [
      "Business-appropriate styles designed for LinkedIn and corporate profiles",
      "Consistent background options including studio white and gradient",
      "Professional lighting simulation that matches headshot photography",
      "Multiple outfit and attire styles to match your industry",
      "Neutral expression and confident pose guidance built into the AI",
    ],
    noSignupFeatures: [
      "No account required — generate avatars without registering",
      "No email capture or personal data required",
      "No payment method needed for free avatar creation",
      "No watermarks on free outputs",
      "No browser extension or software download required",
    ],
  },

  "baby": {
    primaryUseCase: "expecting-parents",
    useCaseLabel: "Expecting Parents",
    freeFeatures: [
      "Free daily baby photo generations with no credit card required",
      "Blends both parent photos to predict realistic baby features",
      "Multiple age stage previews from newborn to toddler",
      "High-resolution output for printing and sharing",
      "No watermarks on free-tier baby photo outputs",
    ],
    useCaseFeatures: [
      "Gender prediction mode with both boy and girl baby previews",
      "Skin tone and eye color inheritance modeling from both parents",
      "Adorable milestone photos from newborn through first birthday",
      "Shareable social-ready images perfect for pregnancy announcement posts",
      "Private processing — uploaded photos are never stored or shared",
    ],
    noSignupFeatures: [
      "No account required — generate baby photos instantly",
      "No email or personal information required to start",
      "No payment details needed for free baby photo generation",
      "No watermarks on free outputs",
      "No app installation — fully browser-based processing",
    ],
  },

  "birthday-card": {
    primaryUseCase: "personal-gifting",
    useCaseLabel: "Personal Gifting",
    freeFeatures: [
      "Free daily birthday card generations with no credit card required",
      "AI-personalized messages tailored to the recipient's relationship",
      "Hundreds of illustrated styles from minimalist to festive",
      "Print-ready PDF and digital sharing formats",
      "No watermarks on free-tier card outputs",
    ],
    useCaseFeatures: [
      "Personal photo integration to create cards featuring the birthday person",
      "Custom message generation tuned to age, personality, and your relationship",
      "Matching envelope designs and gift tag templates included",
      "Bulk card creation for multiple recipients in one session",
      "Instant delivery option with digital share links via email or SMS",
    ],
    noSignupFeatures: [
      "No account required — create birthday cards without registering",
      "No email verification or profile setup needed",
      "No payment details required for free card generation",
      "No watermarks on free outputs",
      "No app download — runs entirely in the browser",
    ],
  },

  "business-card": {
    primaryUseCase: "freelancers",
    useCaseLabel: "Freelancers",
    freeFeatures: [
      "Free AI business card designs with no credit card required",
      "Professional layouts covering dozens of industries and roles",
      "Smart typography pairing that matches your brand colors",
      "Export as print-ready PDF with bleed marks",
      "No watermarks on free-tier business card outputs",
    ],
    useCaseFeatures: [
      "Portfolio-linked QR code generation built into the card design",
      "Personal branding templates that scale from freelancer to agency",
      "Double-sided designs with project showcase on the back",
      "NFC-ready digital card format for paperless networking",
      "Social media handle integration with clean icon layout",
    ],
    noSignupFeatures: [
      "No account creation required — design business cards immediately",
      "No email verification or sign-in flow to complete",
      "No payment information needed for free card designs",
      "No watermarks on free outputs",
      "No desktop software required — full browser-based design tool",
    ],
  },

  "cartoon": {
    primaryUseCase: "content-creators",
    useCaseLabel: "Content Creators",
    freeFeatures: [
      "Free daily cartoon conversions with no credit card required",
      "Multiple cartoon styles including comic book, Pixar-style, and flat vector",
      "High-resolution output for print and digital use",
      "Preserve facial features for recognizable character-style art",
      "No watermarks on free-tier cartoon outputs",
    ],
    useCaseFeatures: [
      "Consistent character style across multiple photos for series content",
      "Brand-matching color palette tools for mascot and channel art",
      "Animated cartoon loop export for YouTube intros and thumbnails",
      "Transparent PNG output for overlaying onto any background",
      "Batch cartoon conversion for processing entire photo sets",
    ],
    noSignupFeatures: [
      "No account required — convert photos to cartoons without registering",
      "No email or phone number verification needed",
      "No credit card required for free cartoon conversions",
      "No watermarks on free outputs",
      "No software installation — works in any modern browser",
    ],
  },

  "chart-from-data": {
    primaryUseCase: "business-reporting",
    useCaseLabel: "Business Reporting",
    freeFeatures: [
      "Free chart generation from CSV, Excel, and pasted data",
      "AI auto-selects the best chart type for your dataset",
      "Multiple chart styles including bar, line, pie, and scatter",
      "Export as SVG, PNG, or embed-ready HTML",
      "No watermarks on free-tier chart outputs",
    ],
    useCaseFeatures: [
      "Boardroom-ready chart themes that match corporate brand palettes",
      "Narrative annotations that auto-generate insights from data trends",
      "Slide-ready 16:9 output for direct paste into PowerPoint or Google Slides",
      "Multi-dataset comparison charts for KPI dashboards",
      "Automated axis labeling and legend formatting",
    ],
    noSignupFeatures: [
      "No account required — paste data and generate charts immediately",
      "No email verification or profile needed",
      "No credit card required for free chart generation",
      "No watermarks on free chart outputs",
      "No software to install — browser-based data visualization",
    ],
  },

  "chart": {
    primaryUseCase: "data-analysts",
    useCaseLabel: "Data Analysts",
    freeFeatures: [
      "Free AI chart generation from text descriptions or data uploads",
      "Supports bar, line, area, scatter, heatmap, and funnel chart types",
      "AI interprets natural language chart requests instantly",
      "Export in SVG, PNG, PDF, and interactive HTML formats",
      "No watermarks on free-tier chart outputs",
    ],
    useCaseFeatures: [
      "Statistical annotation tools for highlighting outliers and trends",
      "Python and R code export for reproducible chart generation",
      "Interactive chart previews with hover tooltips and drill-down",
      "Color-blind-safe palette options for accessible data reporting",
      "Automated insight summaries generated alongside each chart",
    ],
    noSignupFeatures: [
      "No account required — describe a chart and generate it instantly",
      "No email or sign-in needed to access free chart generation",
      "No credit card required for free charts",
      "No watermarks on free outputs",
      "No desktop app — fully browser-based chart creation",
    ],
  },

  "coloring-page": {
    primaryUseCase: "kids-and-parents",
    useCaseLabel: "Kids and Parents",
    freeFeatures: [
      "Free AI coloring page generation with no credit card required",
      "Clean, printable black-and-white line art from any description",
      "Age-appropriate complexity options from toddler to adult",
      "Print-ready PDF output at full page size",
      "No watermarks on free-tier coloring page outputs",
    ],
    useCaseFeatures: [
      "Child-safe imagery filters ensure all content is age appropriate",
      "Custom character generation from a child's imagination or story",
      "Difficulty level selector from simple shapes to detailed illustrations",
      "Themed page sets for holidays, seasons, and school topics",
      "Unlimited pages for classroom and home printing",
    ],
    noSignupFeatures: [
      "No account required — generate coloring pages immediately",
      "No parental consent form or email verification needed",
      "No credit card required for free coloring page generation",
      "No watermarks on free printable outputs",
      "No app installation — runs in any browser on any device",
    ],
  },

  "face-swap": {
    primaryUseCase: "creative-projects",
    useCaseLabel: "Creative Projects",
    freeFeatures: [
      "Free daily face swap generations with no credit card required",
      "Realistic skin tone and lighting blending for natural-looking results",
      "Supports single-face and group photo swaps",
      "High-resolution output for print and digital sharing",
      "No watermarks on free-tier face swap outputs",
    ],
    useCaseFeatures: [
      "Scene-aware compositing that matches the subject to the target environment",
      "Multiple swap targets from a single source face in one session",
      "Video frame face swap for short clips and GIF creation",
      "Expression and head-angle matching for seamless results",
      "Batch swap for replacing faces consistently across an image series",
    ],
    noSignupFeatures: [
      "No account required — upload photos and swap faces immediately",
      "No email verification or registration required",
      "No credit card needed for free face swaps",
      "No watermarks on free outputs",
      "No app download — entirely browser-based processing",
    ],
  },

  "food-photography": {
    primaryUseCase: "restaurants-and-food-brands",
    useCaseLabel: "Restaurants and Food Brands",
    freeFeatures: [
      "Free AI food photo enhancement with no credit card required",
      "Color grading optimized to make dishes look fresh and appetizing",
      "Background replacement with studio-quality kitchen and table settings",
      "High-resolution output for menus and social media",
      "No watermarks on free-tier food photography outputs",
    ],
    useCaseFeatures: [
      "Menu-ready image formatting with consistent lighting and white balance",
      "Instagram-optimized square and portrait crops for food posts",
      "Delivery app image standards compliance for Uber Eats and DoorDash",
      "Bulk processing for updating an entire menu photoshoot in one run",
      "Brand color palette integration for cohesive food photography across campaigns",
    ],
    noSignupFeatures: [
      "No account required — enhance food photos without registering",
      "No email or subscription required to use free enhancements",
      "No credit card needed for free food photo processing",
      "No watermarks on free outputs",
      "No software to install — browser-based food photo editing",
    ],
  },

  "hairstyle": {
    primaryUseCase: "hair-salon-clients",
    useCaseLabel: "Hair Salon Clients",
    freeFeatures: [
      "Free daily hairstyle try-on with no credit card required",
      "Realistic hair rendering that respects your natural face shape",
      "Hundreds of styles from pixie cuts to long waves and braids",
      "Color options spanning natural shades to bold fashion colors",
      "No watermarks on free-tier hairstyle outputs",
    ],
    useCaseFeatures: [
      "Salon consultation mode with printable reference photos for your stylist",
      "Before-and-after comparison view for showing clients transformations",
      "Color swatch library matching real salon dye brands",
      "Face-shape analysis that recommends the most flattering styles",
      "Seasonal trend suggestions based on current salon looks",
    ],
    noSignupFeatures: [
      "No account required — try hairstyles on your photo without registering",
      "No email verification or profile setup needed",
      "No credit card required for free hairstyle try-ons",
      "No watermarks on free outputs",
      "No app installation — fully browser-based hairstyle simulator",
    ],
  },

  "icon": {
    primaryUseCase: "app-developers",
    useCaseLabel: "App Developers",
    freeFeatures: [
      "Free AI icon generation with no credit card required",
      "Multiple icon styles including flat, outlined, gradient, and 3D",
      "Exports as SVG, PNG, and ICO at all standard resolutions",
      "Consistent icon sets generated from a single style description",
      "No watermarks on free-tier icon outputs",
    ],
    useCaseFeatures: [
      "App icon export bundles for iOS, Android, and web at all required sizes",
      "Brand-consistent icon sets with locked color palette and stroke weight",
      "Dark mode and light mode icon variant generation in one click",
      "App Store and Google Play asset checklist compliance",
      "Vector source output editable in Figma, Illustrator, and Sketch",
    ],
    noSignupFeatures: [
      "No account required — generate icons without registering",
      "No email verification or API key setup needed",
      "No credit card required for free icon generation",
      "No watermarks on free icon outputs",
      "No design software required — browser-based AI icon generation",
    ],
  },

  "meme": {
    primaryUseCase: "social-media-managers",
    useCaseLabel: "Social Media Managers",
    freeFeatures: [
      "Free daily AI meme generation with no credit card required",
      "Thousands of popular meme templates plus custom image uploads",
      "AI-written captions tuned for virality and comedic timing",
      "One-click size presets for Twitter, Instagram, and Reddit",
      "No watermarks on free-tier meme outputs",
    ],
    useCaseFeatures: [
      "Trending meme format detection to match current viral cycles",
      "Brand-safe content filter for corporate and professional accounts",
      "Batch meme generation for scheduling an entire week of content",
      "Caption A/B variants for testing engagement before posting",
      "Hashtag suggestions and posting time recommendations built in",
    ],
    noSignupFeatures: [
      "No account required — generate memes without registering",
      "No email or phone verification needed",
      "No credit card required for free meme creation",
      "No watermarks on free meme outputs",
      "No app download — create memes in any browser instantly",
    ],
  },

  "music": {
    primaryUseCase: "content-creators",
    useCaseLabel: "Content Creators",
    freeFeatures: [
      "Free AI music generation with no credit card required",
      "Multiple genres including lo-fi, cinematic, pop, and ambient",
      "Custom tempo, mood, and instrumentation controls",
      "Royalty-free output suitable for videos, podcasts, and streams",
      "No watermarks on free-tier music outputs",
    ],
    useCaseFeatures: [
      "YouTube and TikTok copyright-safe music for monetized content",
      "Loop points built into every track for seamless background music",
      "Stems export (drums, bass, melody separately) for remix flexibility",
      "Video sync mode that generates music matched to your clip's duration",
      "Commercial license included with all generated tracks",
    ],
    noSignupFeatures: [
      "No account required — generate music without registering",
      "No email verification or subscription flow needed",
      "No credit card required for free music generation",
      "No watermarks or branding on free audio outputs",
      "No DAW or software installation — browser-based music creation",
    ],
  },

  "outfit": {
    primaryUseCase: "fashion-shoppers",
    useCaseLabel: "Fashion Shoppers",
    freeFeatures: [
      "Free daily AI outfit generation with no credit card required",
      "Virtual try-on that places outfits on your own photo",
      "Styled for seasons, occasions, and personal aesthetic preferences",
      "Shop-the-look links to find real matching garments",
      "No watermarks on free-tier outfit outputs",
    ],
    useCaseFeatures: [
      "Budget filter that builds outfits within a specified spending limit",
      "Occasion-specific looks from job interviews to weekend casual",
      "Color coordination analysis that highlights outfit harmony",
      "Existing wardrobe integration — remix clothes you already own",
      "Style trend reports updated weekly with current fashion season looks",
    ],
    noSignupFeatures: [
      "No account required — generate outfit ideas without registering",
      "No personal style quiz or profile setup required",
      "No credit card needed for free outfit generation",
      "No watermarks on free fashion outputs",
      "No app installation — browser-based virtual styling tool",
    ],
  },

  "pet-portrait": {
    primaryUseCase: "pet-owners",
    useCaseLabel: "Pet Owners",
    freeFeatures: [
      "Free daily AI pet portrait generation with no credit card required",
      "Artistic styles including oil painting, watercolor, and pencil sketch",
      "Preserves breed-specific features and your pet's unique markings",
      "High-resolution output suitable for canvas printing",
      "No watermarks on free-tier pet portrait outputs",
    ],
    useCaseFeatures: [
      "Custom background scenes from royal portraits to space adventures",
      "Multi-pet portraits that compose multiple animals into one artwork",
      "Print-ready sizing for standard canvas and frame formats",
      "Gift-wrapping presentation mode for birthdays and holidays",
      "Memorial portrait option for creating lasting tributes to beloved pets",
    ],
    noSignupFeatures: [
      "No account required — create pet portraits without registering",
      "No email verification or profile needed",
      "No credit card required for free pet portrait generation",
      "No watermarks on free portrait outputs",
      "No software installation — browser-based AI pet portrait creation",
    ],
  },

  "photo-colorizer": {
    primaryUseCase: "family-historians",
    useCaseLabel: "Family Historians",
    freeFeatures: [
      "Free daily photo colorization with no credit card required",
      "AI color restoration that produces historically plausible tones",
      "Preserves fine details like clothing textures, skin tones, and backgrounds",
      "High-resolution output for printing restored family photos",
      "No watermarks on free-tier colorized photo outputs",
    ],
    useCaseFeatures: [
      "Batch colorization of entire photo albums in one session",
      "Manual color hint tools for correcting AI color choices",
      "Era-specific color modeling (1920s, 1940s, 1960s palettes)",
      "Before-and-after comparison view for sharing restorations",
      "Print-ready TIF and PNG export for archival-quality preservation",
    ],
    noSignupFeatures: [
      "No account required — colorize old photos without registering",
      "No email or personal data needed to use free colorization",
      "No credit card required for free photo colorization",
      "No watermarks on free colorized outputs",
      "No software download — browser-based AI colorization tool",
    ],
  },

  "photo-restorer": {
    primaryUseCase: "family-history-preservation",
    useCaseLabel: "Family History Preservation",
    freeFeatures: [
      "Free daily photo restoration with no credit card required",
      "AI removes scratches, tears, fading, and water damage automatically",
      "Sharpens blurry faces and restores detail from low-resolution originals",
      "High-resolution output at 4x the original scan resolution",
      "No watermarks on free-tier restored photo outputs",
    ],
    useCaseFeatures: [
      "Batch restoration for digitizing and restoring entire family albums",
      "Before-and-after comparison view for sharing restorations with relatives",
      "Archival-quality TIFF export for long-term digital preservation",
      "Damage severity detection that auto-selects the right restoration model",
      "Color restoration option to add historically accurate tones to black-and-white photos",
    ],
    noSignupFeatures: [
      "No account required — restore damaged photos without registering",
      "No email or personal data needed for free restorations",
      "No credit card required for free photo restoration",
      "No watermarks on free restored photo outputs",
      "No software download — fully browser-based restoration tool",
    ],
  },

  "presentation": {
    primaryUseCase: "business-professionals",
    useCaseLabel: "Business Professionals",
    freeFeatures: [
      "Free AI presentation generation with no credit card required",
      "Auto-creates slide decks from a topic description or document upload",
      "Professional themes designed for investor, sales, and internal presentations",
      "Export as PPTX for direct editing in PowerPoint or Google Slides",
      "No watermarks on free-tier presentation outputs",
    ],
    useCaseFeatures: [
      "Pitch deck templates optimized for investor storytelling and traction slides",
      "Data visualization integration that turns spreadsheets into chart slides",
      "Executive summary auto-generation from long documents",
      "Brand kit upload to enforce company colors, fonts, and logos",
      "Presenter notes auto-generated for each slide to support speaker delivery",
    ],
    noSignupFeatures: [
      "No account required — generate presentations without registering",
      "No email or company verification required",
      "No credit card needed for free presentation creation",
      "No watermarks on free presentation outputs",
      "No software installation — browser-based AI presentation builder",
    ],
  },

  "professional-headshots": {
    primaryUseCase: "job-seekers",
    useCaseLabel: "Job Seekers",
    freeFeatures: [
      "Free AI professional headshot generation with no credit card required",
      "Studio-quality background replacement and lighting correction",
      "Formal attire virtual overlay for polished professional appearance",
      "High-resolution output suitable for LinkedIn and resumes",
      "No watermarks on free-tier headshot outputs",
    ],
    useCaseFeatures: [
      "LinkedIn-optimized framing and composition guidance built in",
      "Industry-specific style recommendations from tech casual to finance formal",
      "Resume photo crop presets for common application portal formats",
      "Before-and-after comparison for confident application submission",
      "Multiple headshot variations in different backgrounds and outfits in one session",
    ],
    noSignupFeatures: [
      "No account required — create professional headshots without registering",
      "No email verification or profile setup needed",
      "No credit card required for free headshot generation",
      "No watermarks on free headshot outputs",
      "No photography appointment or software installation required",
    ],
  },

  "qr-code-art": {
    primaryUseCase: "marketers",
    useCaseLabel: "Marketers",
    freeFeatures: [
      "Free AI QR code art generation with no credit card required",
      "Scannable artistic QR codes that embed your brand's visual identity",
      "Supports URLs, vCards, WiFi credentials, and custom text payloads",
      "High-resolution PNG and SVG export for print and digital use",
      "No watermarks on free-tier QR art outputs",
    ],
    useCaseFeatures: [
      "Brand-consistent QR art that integrates logos and color palettes seamlessly",
      "Campaign-specific scan tracking with UTM parameter support",
      "Print-ready sizes with minimum module width validation for reliable scans",
      "A/B design variants for split-testing engagement in print campaigns",
      "Animated QR code option for digital signage and email marketing",
    ],
    noSignupFeatures: [
      "No account required — generate QR code art without registering",
      "No email or phone verification needed",
      "No credit card required for free QR code art generation",
      "No watermarks on free QR outputs",
      "No software download — browser-based QR art creation tool",
    ],
  },

  "resume-photo": {
    primaryUseCase: "recent-graduates",
    useCaseLabel: "Recent Graduates",
    freeFeatures: [
      "Free AI resume photo enhancement with no credit card required",
      "Professional background replacement for candid or casual source photos",
      "Automatic clothing and grooming touch-ups for a polished appearance",
      "High-resolution output meeting international CV photo standards",
      "No watermarks on free-tier resume photo outputs",
    ],
    useCaseFeatures: [
      "Country-specific format guidance for European, Asian, and North American CVs",
      "Neutral expression coaching guidance overlaid on output previews",
      "Interview-ready attire detection and virtual upgrade suggestions",
      "Multiple file format exports (JPEG, PNG, PDF) for any application system",
      "LinkedIn profile photo sync with optimized framing and crop",
    ],
    noSignupFeatures: [
      "No account required — create resume photos without registering",
      "No email verification or profile needed to start",
      "No credit card required for free resume photo generation",
      "No watermarks on free outputs",
      "No expensive photo studio required — use a selfie with any background",
    ],
  },

  "sketch-to-image": {
    primaryUseCase: "designers",
    useCaseLabel: "Designers",
    freeFeatures: [
      "Free daily sketch-to-image conversions with no credit card required",
      "Transforms rough pencil sketches into polished digital illustrations",
      "Multiple rendering styles including realistic, illustrated, and concept art",
      "High-resolution output suitable for client presentations",
      "No watermarks on free-tier sketch outputs",
    ],
    useCaseFeatures: [
      "Style reference input to match an existing design language or brand",
      "Iterative refinement workflow — refine AI output with additional sketches",
      "Perspective and proportion correction for architectural and product sketches",
      "Line art to color illustration pipeline with palette lock",
      "Version history for comparing sketch iterations and client feedback cycles",
    ],
    noSignupFeatures: [
      "No account required — convert sketches to images without registering",
      "No email or portfolio verification needed",
      "No credit card required for free sketch conversions",
      "No watermarks on free rendered outputs",
      "No graphics tablet software required — upload any photo of a hand-drawn sketch",
    ],
  },

  "storybook-illustrator": {
    primaryUseCase: "children-book-authors",
    useCaseLabel: "Children's Book Authors",
    freeFeatures: [
      "Free daily storybook illustration generation with no credit card required",
      "Child-safe, age-appropriate illustration styles from whimsical to educational",
      "Consistent character appearance across multiple pages and scenes",
      "Print-ready resolution output for self-publishing and print-on-demand",
      "No watermarks on free-tier storybook illustration outputs",
    ],
    useCaseFeatures: [
      "Character consistency tools to lock hero characters across a full book",
      "Page layout templates formatted for standard children's book dimensions",
      "Scene description to illustration pipeline with narrative context support",
      "Full color and line-art mode for coloring book editions",
      "KDP and IngramSpark upload-ready file export for independent publishing",
    ],
    noSignupFeatures: [
      "No account required — generate storybook illustrations without registering",
      "No email verification or children's content policy review required to start",
      "No credit card needed for free illustration generation",
      "No watermarks on free storybook illustration outputs",
      "No software installation — browser-based AI illustration tool",
    ],
  },

  "tattoo": {
    primaryUseCase: "tattoo-enthusiasts",
    useCaseLabel: "Tattoo Enthusiasts",
    freeFeatures: [
      "Free daily AI tattoo design generation with no credit card required",
      "Multiple styles including traditional, neo-traditional, blackwork, and fine-line",
      "High-contrast outputs optimized for skin transfer and stencil use",
      "High-resolution downloads suitable for printing at actual tattoo size",
      "No watermarks on free-tier tattoo design outputs",
    ],
    useCaseFeatures: [
      "Virtual placement preview on body area photos for realistic size reference",
      "Artist-shareable reference sheets with multiple angle views",
      "Custom text integration with hand-lettering and script style options",
      "Symbol combination tools for building meaningful personal designs",
      "Style transfer from a reference photo to match your tattoo artist's portfolio",
    ],
    noSignupFeatures: [
      "No account required — design tattoos without registering",
      "No email or age verification required to access free designs",
      "No credit card needed for free tattoo design generation",
      "No watermarks on free tattoo outputs",
      "No app download — browser-based AI tattoo design tool",
    ],
  },

  "text-to-speech": {
    primaryUseCase: "podcasters",
    useCaseLabel: "Podcasters",
    freeFeatures: [
      "Free daily text-to-speech conversions with no credit card required",
      "Natural-sounding voices with human-like pacing and intonation",
      "Multiple voice options across genders, accents, and speaking styles",
      "High-quality MP3 and WAV export for professional audio production",
      "No watermarks on free-tier audio outputs",
    ],
    useCaseFeatures: [
      "Long-form article narration up to 10,000 words per batch",
      "Episode intro and outro voice branding templates",
      "SSML support for controlling pauses, emphasis, and pronunciation",
      "Transcript sync export for auto-generating captions and show notes",
      "Commercial use license included with all generated audio",
    ],
    noSignupFeatures: [
      "No account required — convert text to speech without registering",
      "No email verification or subscription needed",
      "No credit card required for free text-to-speech conversions",
      "No watermarks or branding on free audio outputs",
      "No software installation — browser-based AI voice generation",
    ],
  },

  "vector-illustration": {
    primaryUseCase: "graphic-designers",
    useCaseLabel: "Graphic Designers",
    freeFeatures: [
      "Free daily AI vector illustration generation with no credit card required",
      "Clean SVG outputs fully editable in Illustrator, Figma, and Inkscape",
      "Multiple illustration styles from minimal line art to detailed technical",
      "Scalable output with no pixel degradation at any print size",
      "No watermarks on free-tier vector illustration outputs",
    ],
    useCaseFeatures: [
      "Layer-organized SVG export with named groups for easy editing",
      "Brand asset generation with locked color swatches and stroke weights",
      "Icon set creation that maintains consistent visual language across dozens of icons",
      "Isometric and flat illustration modes for product and UI mockups",
      "CMYK color profile support for print-production-ready vector artwork",
    ],
    noSignupFeatures: [
      "No account required — generate vector illustrations without registering",
      "No design software subscription required to start",
      "No credit card needed for free vector illustration generation",
      "No watermarks on free SVG outputs",
      "No Illustrator license required — browser-based AI vector creation",
    ],
  },

  "wallpaper": {
    primaryUseCase: "desktop-customizers",
    useCaseLabel: "Desktop Customizers",
    freeFeatures: [
      "Free daily AI wallpaper generation with no credit card required",
      "High-resolution outputs at 4K and 8K for crisp display on any monitor",
      "Hundreds of styles from abstract gradients to photorealistic landscapes",
      "Tiling and seamless repeat options for multi-monitor setups",
      "No watermarks on free-tier wallpaper outputs",
    ],
    useCaseFeatures: [
      "Custom aspect ratio presets for ultrawide, standard, and mobile screens",
      "Seasonal and mood-based wallpaper collections updated monthly",
      "Device-specific optimization for OLED, IPS, and retina displays",
      "Dynamic wallpaper generation that creates a unique image on every download",
      "Color palette extraction for syncing wallpaper tones with your desktop theme",
    ],
    noSignupFeatures: [
      "No account required — generate wallpapers without registering",
      "No email verification or profile needed",
      "No credit card required for free wallpaper generation",
      "No watermarks on free wallpaper outputs",
      "No software download — browser-based AI wallpaper creation",
    ],
  },

  "watercolor": {
    primaryUseCase: "artists-and-crafters",
    useCaseLabel: "Artists and Crafters",
    freeFeatures: [
      "Free daily AI watercolor generation with no credit card required",
      "Authentic watercolor textures including wet-on-wet, dry brush, and granulation",
      "Converts photos and sketches into watercolor paintings automatically",
      "High-resolution output suitable for canvas prints and framed artwork",
      "No watermarks on free-tier watercolor outputs",
    ],
    useCaseFeatures: [
      "Brush stroke control tools for adjusting texture intensity and color bleeding",
      "Color palette lock for maintaining consistent watercolor tone across a series",
      "Scan-to-art pipeline for transforming your own pencil sketches into watercolor",
      "Print-ready 300 DPI TIFF export for fine art printing and Etsy shop listings",
      "Reference-style output mode for creating watercolor practice studies",
    ],
    noSignupFeatures: [
      "No account required — create watercolor art without registering",
      "No art supply purchase required to access free watercolor generation",
      "No credit card needed for free watercolor generation",
      "No watermarks on free watercolor outputs",
      "No painting experience required — browser-based AI watercolor creation",
    ],
  },

  "yearbook-photo": {
    primaryUseCase: "students",
    useCaseLabel: "Students",
    freeFeatures: [
      "Free daily yearbook photo enhancement with no credit card required",
      "Classic yearbook portrait styles that match school photo aesthetics",
      "Background replacement with neutral studio backdrops",
      "High-resolution output ready for school submission portals",
      "No watermarks on free-tier yearbook photo outputs",
    ],
    useCaseFeatures: [
      "Era-specific yearbook styles from 1980s retro to modern clean-cut",
      "School colors integration for custom backdrop and border options",
      "Multiple pose crops (head-and-shoulders, bust, full-length) in one session",
      "Batch processing for class photos requiring consistent lighting across all students",
      "Digital delivery format compatible with major school photography platforms",
    ],
    noSignupFeatures: [
      "No account required — create yearbook photos without registering",
      "No parent consent form or school email required to start",
      "No credit card needed for free yearbook photo generation",
      "No watermarks on free yearbook outputs",
      "No professional photography equipment required — works from any selfie",
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Interface and type block to inject                                  */
/* ------------------------------------------------------------------ */

/** The SeoBestConfig interface block inserted after SeoUseCaseConfig */
const SEO_BEST_CONFIG_INTERFACE = `
export interface SeoBestConfig {
  /** URL-safe slug used in the route path, e.g. "free-background-remover" -> /best/free-background-remover */
  readonly slug: string;
  /** Full page title, e.g. "Best Free Background Remover in 2026" */
  readonly title: string;
  /** 1-2 sentence description of what this listicle page covers */
  readonly description: string;
  /** 5 product-specific features that justify ranking on this page */
  readonly features: string[];
}
`;

/** The line to add to SeoPageConfig interface */
const BEST_PAGES_INTERFACE_FIELD = `  /** Best-of listicle entries — generates /best/[slug] pages */
  readonly bestPages: SeoBestConfig[];`;

/* ------------------------------------------------------------------ */
/* Code generation helpers                                             */
/* ------------------------------------------------------------------ */

/**
 * Renders a single SeoBestConfig entry as a TypeScript object literal block.
 * Indented for insertion inside the bestPages array (two levels of 2-space indent).
 */
function renderBestPageEntry({ slug, title, description, features }) {
  const featuresTs = features.map((f) => `        "${f}",`).join("\n");
  return `    {
      slug: "${slug}",
      title: "${title}",
      description:
        "${description}",
      features: [
${featuresTs}
      ],
    }`;
}

/**
 * Builds the complete bestPages array block for insertion into the config object.
 * Output is the TypeScript block from `  bestPages: [` to the closing `  ],`.
 */
function buildBestPagesBlock(repoName) {
  const keyword = deriveProductKeyword(repoName);
  const data = PRODUCT_DATA[keyword];

  if (!data) {
    throw new Error(`No product data defined for keyword "${keyword}" (repo: ${repoName})`);
  }

  const titleCaseKeyword = toTitleCase(keyword);
  const titleCaseUseCase = data.useCaseLabel;

  const entries = [
    // Entry 1: "Best Free [Tool] in 2026"
    {
      slug: `free-${keyword}`,
      title: `Best Free ${titleCaseKeyword} in 2026`,
      description: `Compare the best free AI ${keyword.replace(/-/g, " ")} tools available in 2026. Find tools that work without watermarks, signups, or hidden costs.`,
      features: data.freeFeatures,
    },
    // Entry 2: "Best [Tool] for [Primary Use Case] in 2026"
    {
      slug: `${keyword}-for-${data.primaryUseCase}`,
      title: `Best ${titleCaseKeyword} for ${titleCaseUseCase} in 2026`,
      description: `The best AI ${keyword.replace(/-/g, " ")} tools for ${titleCaseUseCase.toLowerCase()}. Compare features, pricing, and output quality for your specific workflow needs.`,
      features: data.useCaseFeatures,
    },
    // Entry 3: "Best [Tool] with No Signup in 2026"
    {
      slug: `${keyword}-no-signup`,
      title: `Best ${titleCaseKeyword} with No Signup in 2026`,
      description: `AI ${keyword.replace(/-/g, " ")} tools that work instantly without creating an account, entering email, or providing payment information.`,
      features: data.noSignupFeatures,
    },
  ];

  const renderedEntries = entries.map(renderBestPageEntry).join(",\n");
  return `\n  bestPages: [\n${renderedEntries},\n  ],`;
}

/* ------------------------------------------------------------------ */
/* File manipulation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Applies all required changes to a seo-pages.ts file content string.
 *
 * Changes made:
 *   1. Inserts SeoBestConfig interface after the SeoUseCaseConfig closing brace
 *   2. Adds `readonly bestPages: SeoBestConfig[];` to SeoPageConfig interface
 *   3. Injects bestPages array before the last `};` of the config object
 *
 * Handles two file structural variants found across the clone fleet:
 *   Pattern A: Has `DEFAULT_SEO_PAGES_CONFIG` intermediate variable with JSDoc between interfaces
 *   Pattern B: Direct `export const SEO_PAGES_CONFIG: SeoPageConfig = {` with no JSDoc between
 *
 * Returns null if the file already has bestPages (idempotency).
 */
function patchFileContent(content, repoName) {
  // Guard: already patched
  if (content.includes("bestPages:") || content.includes("SeoBestConfig")) {
    return null;
  }

  const lines = content.split("\n");

  // ---------------------------------------------------------------
  // Step 1: Find the line index of `}` that closes SeoUseCaseConfig.
  // We locate `export interface SeoPageConfig {` and look backwards
  // for the first `}` on its own line — that closes SeoUseCaseConfig.
  // ---------------------------------------------------------------
  const seoPageConfigLineIdx = lines.findIndex((l) => l.trimStart().startsWith("export interface SeoPageConfig {"));
  if (seoPageConfigLineIdx === -1) {
    throw new Error(`Cannot find 'export interface SeoPageConfig {' in ${repoName}`);
  }

  // Walk backwards from SeoPageConfig to find the closing `}` of SeoUseCaseConfig.
  // It is either directly before a blank line before SeoPageConfig, or before a JSDoc block.
  // We look for the last `}` that appears before seoPageConfigLineIdx.
  let useCaseClosingLineIdx = -1;
  for (let i = seoPageConfigLineIdx - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === "}") {
      useCaseClosingLineIdx = i;
      break;
    }
    // Skip blank lines and JSDoc/comment lines
    if (trimmed === "" || trimmed.startsWith("*") || trimmed.startsWith("/*") || trimmed.startsWith("//")) {
      continue;
    }
    // If we hit non-comment, non-blank, non-brace content, stop
    break;
  }

  if (useCaseClosingLineIdx === -1) {
    throw new Error(`Cannot find SeoUseCaseConfig closing brace before SeoPageConfig in ${repoName}`);
  }

  // ---------------------------------------------------------------
  // Step 2: Find `readonly useCases: SeoUseCaseConfig[];` inside SeoPageConfig
  // and the closing `}` of that interface block.
  // ---------------------------------------------------------------
  const useCasesFieldLineIdx = lines.findIndex(
    (l, i) => i > seoPageConfigLineIdx && l.includes("readonly useCases: SeoUseCaseConfig[]")
  );
  if (useCasesFieldLineIdx === -1) {
    throw new Error(`Cannot find 'readonly useCases: SeoUseCaseConfig[]' in ${repoName}`);
  }

  // The interface closing `}` should be just after useCases field (possibly with blank lines)
  let seoPageConfigClosingLineIdx = -1;
  for (let i = useCasesFieldLineIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === "}") {
      seoPageConfigClosingLineIdx = i;
      break;
    }
    if (trimmed !== "" && !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*")) {
      break; // Unexpected content — interface has more fields
    }
  }
  if (seoPageConfigClosingLineIdx === -1) {
    throw new Error(`Cannot find closing brace of SeoPageConfig interface in ${repoName}`);
  }

  // ---------------------------------------------------------------
  // Step 3: Find the last `};` in the file — this closes the config object.
  // ---------------------------------------------------------------
  let configObjectClosingLineIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === "};") {
      configObjectClosingLineIdx = i;
      break;
    }
  }
  if (configObjectClosingLineIdx === -1) {
    throw new Error(`Cannot find config object closing '};' in ${repoName}`);
  }

  // ---------------------------------------------------------------
  // Apply all three insertions (work bottom-up to preserve line indices)
  // ---------------------------------------------------------------

  const bestPagesBlock = buildBestPagesBlock(repoName);

  // Step 3 insert: add bestPages array before the last `};`
  // Insert after the line at configObjectClosingLineIdx - 1 (last array close `  ],`)
  lines.splice(configObjectClosingLineIdx, 0, bestPagesBlock);

  // After splice, seoPageConfigClosingLineIdx is still valid (it's before the splice point)
  // Step 2 insert: add bestPages field after the useCases field line in SeoPageConfig interface
  lines.splice(seoPageConfigClosingLineIdx, 0, BEST_PAGES_INTERFACE_FIELD);

  // After step 2 splice, useCaseClosingLineIdx is still valid (it's before step 2 and step 3)
  // Step 1 insert: inject SeoBestConfig interface block after the `}` closing SeoUseCaseConfig
  lines.splice(useCaseClosingLineIdx + 1, 0, SEO_BEST_CONFIG_INTERFACE);

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main() {
  console.log(`\n🔧 generate-best-pages-data.mjs — ${APPLY ? "APPLY MODE" : "DRY-RUN MODE"}\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const repo of TARGET_REPOS) {
    const filePath = resolve(GITHUB_DIR, repo, "src/config/seo-pages.ts");

    let content;
    try {
      content = readFileSync(filePath, "utf8");
    } catch {
      console.error(`  ERROR  ${repo}: seo-pages.ts not found at ${filePath}`);
      errors++;
      continue;
    }

    let patched;
    try {
      patched = patchFileContent(content, repo);
    } catch (err) {
      console.error(`  ERROR  ${repo}: ${err.message}`);
      errors++;
      continue;
    }

    if (patched === null) {
      console.log(`  SKIP   ${repo}: bestPages already present`);
      skipped++;
      continue;
    }

    if (APPLY) {
      writeFileSync(filePath, patched, "utf8");
      console.log(`  WRITE  ${repo}: bestPages injected`);
    } else {
      // Dry-run: show a short diff summary
      const addedLines = patched.split("\n").length - content.split("\n").length;
      console.log(`  DRY    ${repo}: would add ~${addedLines} lines (bestPages: 3 entries)`);
    }
    processed++;
  }

  console.log(`\nDone. ${processed} to write, ${skipped} skipped (already done), ${errors} errors.`);
  if (!APPLY && processed > 0) {
    console.log(`\nRun with --apply to write changes:\n  node scripts/generate-best-pages-data.mjs --apply\n`);
  }
}

main();
