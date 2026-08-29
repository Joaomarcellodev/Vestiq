import { NextResponse } from "next/server";
import { listNotifications, countUnreadNotifications } from "@/features/notifications/queries";
import { getCurrentUser } from "@/features/auth/queries";

/** Polled by the notification bell for fresh unread state. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(20),
    countUnreadNotifications(),
  ]);

  return NextResponse.json(
    { notifications, unreadCount },
    { headers: { "Cache-Control": "no-store" } },
  );
}
