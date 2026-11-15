// app/announcements/page.tsx
/**
 * The charity board moved to its own page at /campaigns.
 * This keeps old links and shared URLs working: they land on the new page.
 */
import { redirect } from 'next/navigation';

export default function AnnouncementsRedirect() {
  redirect('/campaigns');
}
