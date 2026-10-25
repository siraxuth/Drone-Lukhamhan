import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { Logo } from '@/components/brand/Logo';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout tree={source.getPageTree()} nav={{ title: <Logo /> }}>
      {children}
    </DocsLayout>
  );
}
