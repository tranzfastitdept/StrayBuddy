import AdminConsole from '@/components/admin/AdminConsole';

/** The admin console lives in one client component; this page just mounts it. */
export const metadata = {
  title: 'Admin console · StrayBuddy',
};

export default function AdminPage() {
  return <AdminConsole />;
}
