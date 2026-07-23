import LegalPage, { buildLegalMetadata } from '@/app/components/LegalPage';

export const metadata = buildLegalMetadata('privacy');

export default function Page() {
  return <LegalPage pageKey="privacy" />;
}
