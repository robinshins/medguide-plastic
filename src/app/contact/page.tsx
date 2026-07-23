import LegalPage, { buildLegalMetadata } from '@/app/components/LegalPage';

export const metadata = buildLegalMetadata('contact');

export default function Page() {
  return <LegalPage pageKey="contact" />;
}
