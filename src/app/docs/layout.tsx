import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { Logo } from '@/components/brand/Logo';
import { Tour } from '@/components/Tour';
import { docsTour } from '@/lib/tours';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout tree={source.getPageTree()} nav={{ title: <Logo /> }}>
      <Tour id="docs" steps={docsTour} />
      {children}
    </DocsLayout>
  );
}
