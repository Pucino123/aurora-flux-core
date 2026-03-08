import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: string;
}

const DEFAULT_TITLE = "Flux Workspace";
const DEFAULT_DESC = "Your personal AI workspace — tasks, council, focus, finance and documents in one premium app.";
const DEFAULT_IMAGE = "/favicon.png";

export default function SEO({ title, description, url, image, type = "website" }: SEOProps) {
  const fullTitle = title ? `${title} | Flux Workspace` : DEFAULT_TITLE;
  const desc = description || DEFAULT_DESC;
  const pageUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const ogImage = image || DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={ogImage} />
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
      {/* JSON-LD */}
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Flux Workspace",
        "applicationCategory": "ProductivityApplication",
        "description": desc,
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "featureList": ["AI Council", "Smart Plan", "Focus Mode", "Split-View Multitasking"],
      })}</script>
    </Helmet>
  );
}
