import { StaffLayoutClient } from '@/components/layout/staff-layout-client';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffLayoutClient>{children}</StaffLayoutClient>;
}

