import LegalPage, { buildLegalMetadata } from '@/app/components/LegalPage';

export const metadata = buildLegalMetadata('terms');

export default function Page() {
  return <LegalPage pageKey="terms" />;
}
