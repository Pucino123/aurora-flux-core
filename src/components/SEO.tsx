import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: string;
  keywords?: string;
}

const SITE_NAME = "Dashiii";
const DEFAULT_TITLE = "Dashiii | Your AI Workspace";
const DEFAULT_DESC = "Dashiii merges smart planning, AI advisory, and productivity tools into one premium workspace. Plan, track, and accomplish your goals effortlessly.";
const DEFAULT_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a7110de8-4474-402a-98ee-14aff5c5e1e4/id-preview-8b30c164--6a462750-90a6-43e9-9441-3120003af9ee.lovable.app-1772133438739.png";
const DEFAULT_KEYWORDS = "AI workspace, productivity app, task management, AI council, focus mode, smart planning, calendar, CRM, documents";
const CANONICAL_BASE = "https://aurora-flux-core.lovable.app";

export default function SEO({ title, description, url, image, type = "website", keywords }: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const desc = description || DEFAULT_DESC;
  const canonical = url ? `${CANONICAL_BASE}${url}` : (typeof window !== "undefined" ? window.location.href : CANONICAL_BASE);
  const ogImage = image || DEFAULT_IMAGE;
  const kw = keywords || DEFAULT_KEYWORDS;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="keywords" content={kw} />
      <link rel="canonical" href={canonical} />
      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
      {/* JSON-LD */}
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": SITE_NAME,
        "url": CANONICAL_BASE,
        "applicationCategory": "ProductivityApplication",
        "operatingSystem": "Web",
        "description": desc,
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "featureList": ["AI Council", "Smart Plan", "Focus Mode", "Split-View Multitasking", "CRM", "Calendar", "Documents"],
      })}</script>
    </Helmet>
  );
}
