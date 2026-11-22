import { redirect } from 'next/navigation';

export default async function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/packages?detail=${id}`);
}
