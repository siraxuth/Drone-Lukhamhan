/** ฝัง structured data (JSON-LD) ให้เครื่องมือค้นหาอ่าน · escape "<" กันปิดแท็ก script */
export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
