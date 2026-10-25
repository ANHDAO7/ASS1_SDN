import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  content: string;
  type?: string;
  link?: string | null;
}

export async function createInAppNotification({
  userId,
  title,
  content,
  type = "INFO",
  link = null,
}: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        content,
        type,
        link,
      },
    });

    // Phát real-time qua channel của user
    try {
      const channel = supabase.channel(`user:${userId}`);
      await channel.send({
        type: "broadcast",
        event: "new_notification",
        payload: notification,
      });
    } catch (realtimeErr) {
      console.warn("Could not broadcast notification via Supabase:", realtimeErr);
    }

    return notification;
  } catch (error) {
    console.error("Failed to create in-app notification:", error);
    return null;
  }
}
