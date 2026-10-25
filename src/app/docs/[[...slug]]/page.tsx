import { source } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/components/docs/mdx';
import { notFound } from 'next/navigation';
import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { lessonSchema } from '@/lib/schema';
import { latestRelease } from '@/lib/changelog';
import type { Metadata } from 'next';

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();
  const MDX = page.data.body;
  // หน้าแรก › บทเรียน › (หมวด) › หน้านี้
  const trail = getBreadcrumbItems(page.url, source.getPageTree(), { includePage: true, includeRoot: false })
    .map((c, i, a) => ({ label: String(c.name), href: i === a.length - 1 ? undefined : c.url }));
  return (
    <DocsPage toc={page.data.toc} breadcrumb={{ enabled: false }}>
      <JsonLd data={lessonSchema({ path: page.url, title: page.data.title, description: page.data.description, modified: latestRelease()?.date })} />
      <Breadcrumbs wrap={false} items={[{ label: 'บทเรียน', href: '/docs' }, ...(page.url === '/docs' ? [] : trail)]} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();
  const title = page.data.title;
  const description = page.data.description ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: page.url },
    openGraph: { type: 'article', title, description, url: page.url, locale: 'th_TH', publishedTime: latestRelease()?.date, images: [{ url: `/og${page.url}`, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [`/og${page.url}`] },
  };
}
