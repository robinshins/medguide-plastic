import LegalPage, { buildLegalMetadata } from '@/app/components/LegalPage';

export const metadata = buildLegalMetadata('about');

export default function Page() {
  return <LegalPage pageKey="about" />;
}
