'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RiderHomePage() {
  const router = useRouter();
  useEffect(() => { router.replace('/deliveries'); }, [router]);
  return null;
}
