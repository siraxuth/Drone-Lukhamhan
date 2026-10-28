import type { Metadata } from 'next';

/** Dynamic OG endpoint follows shadcn-ui/ui's /og?title=...&description=... pattern. */
export function ogImageUrl(title: string, description: string): string {
  // Increment when OG rendering changes so Discord and other crawlers drop cached images.
  return `/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&v=5`;
}

export function shareMetadata({
  title,
  description,
  path,
  type = 'website',
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = ogImageUrl(title, description);
  return {
    openGraph: {
      type,
      title,
      description,
      url: path,
      images: [{ url: image, width: 1200, height: 628, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
