import { abs, SITE } from './site';

const org = {
  '@type': 'EducationalOrganization',
  '@id': abs('/#org'),
  name: SITE.fullName,
  alternateName: [SITE.name, 'Luekhamhan Drone Club'],
  url: SITE.url,
  logo: { '@type': 'ImageObject', url: abs('/brand/logo.webp'), width: 640, height: 640 },
  image: abs('/opengraph-image'),
  description: SITE.description,
  parentOrganization: { '@type': 'School', name: SITE.school, address: { '@type': 'PostalAddress', addressLocality: 'วารินชำราบ', addressRegion: 'อุบลราชธานี', addressCountry: 'TH' } },
  knowsAbout: ['โดรน', 'Arduino', 'การเขียนโปรแกรม C++', 'ฟิสิกส์การบิน', 'RCSA EDU'],
  areaServed: 'TH',
};

/** ข้อมูลโครงสร้างระดับทั้งเว็บ (ใส่ใน layout): องค์กร + เว็บไซต์ */
export function siteSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      { '@type': 'WebSite', '@id': abs('/#site'), url: SITE.url, name: SITE.name, description: SITE.description, inLanguage: 'th-TH', publisher: { '@id': abs('/#org') } },
    ],
  };
}

/** บทเรียน: TechArticle */
export function lessonSchema(p: { path: string; title: string; description?: string; modified?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: p.title,
    description: p.description,
    inLanguage: 'th-TH',
    url: abs(p.path),
    mainEntityOfPage: abs(p.path),
    image: abs(`/og${p.path}`),
    dateModified: p.modified,
    author: { '@id': abs('/#org') },
    publisher: { '@id': abs('/#org') },
    isPartOf: { '@id': abs('/#site') },
    educationalLevel: 'มัธยมศึกษา',
    learningResourceType: 'บทเรียน',
  };
}

/** ผลงาน: CreativeWork (+ VideoObject ถ้ามีวิดีโอ) */
export function workSchema(w: { id: string; title: string; summary: string; image: string | null; year: number | null; location: string; videoId: string | null }) {
  const url = abs(`/works/${w.id}`);
  const image = w.image ? (w.image.startsWith('http') ? w.image : abs(w.image)) : undefined;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CreativeWork', '@id': `${url}#work`, name: w.title, description: w.summary, url, image, inLanguage: 'th-TH', dateCreated: w.year ? String(w.year - 543) : undefined, locationCreated: w.location || undefined, creator: { '@id': abs('/#org') }, publisher: { '@id': abs('/#org') } },
      ...(w.videoId ? [{ '@type': 'VideoObject', name: w.title, description: w.summary, thumbnailUrl: [`https://i.ytimg.com/vi/${w.videoId}/hqdefault.jpg`], embedUrl: `https://www.youtube-nocookie.com/embed/${w.videoId}`, uploadDate: w.year ? `${w.year - 543}-01-01` : undefined }] : []),
    ],
  };
}

/** ตัวจำลอง: เครื่องมือเรียนรู้ที่ใช้ได้ในเบราว์เซอร์ */
export function simulatorSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ตัวจำลองการบินโดรน',
    url: abs('/simulator'),
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any (เบราว์เซอร์)',
    inLanguage: 'th-TH',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'THB' },
    publisher: { '@id': abs('/#org') },
    description: 'เขียนโค้ดสั่งโดรนแล้วดูบินในสนาม 3 มิติขนาดจริง พร้อมโจทย์ฝึกบนกริด 5×5 เมตร',
  };
}
