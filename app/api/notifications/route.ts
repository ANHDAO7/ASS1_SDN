import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

// GET /api/notifications - Lấy danh sách thông báo và số lượng chưa đọc của user hiện tại
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return NextResponse.json({ notifications, unreadCount }, { status: 200 });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal Server Error fetching notifications" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Đánh dấu một thông báo hoặc tất cả là đã đọc
export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, markAllAsRead } = body;

    if (markAllAsRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json(
        { message: "All notifications marked as read" },
        { status: 200 }
      );
    }

    if (id) {
      const updated = await prisma.notification.updateMany({
        where: { id, userId: user.id },
        data: { isRead: true },
      });
      return NextResponse.json(
        { message: "Notification marked as read", updated },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Invalid request payload. Provide 'id' or 'markAllAsRead: true'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Internal Server Error updating notifications" },
      { status: 500 }
    );
  }
}
