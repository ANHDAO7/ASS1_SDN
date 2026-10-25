import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// GET /api/teams/:id/messages - Lấy danh sách tin nhắn chat của nhóm
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId } = await params;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Kiểm tra user có phải Owner hoặc Member của team không
    const isOwner = team.ownerId === user.id;
    const isMember = team.members.some((m) => m.userId === user.id);
    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this team" },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { teamId },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error("Error fetching team messages:", error);
    return NextResponse.json(
      { error: "Internal Server Error fetching team messages" },
      { status: 500 }
    );
  }
}

// POST /api/teams/:id/messages - Gửi tin nhắn mới vào chat nhóm
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId } = await params;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isOwner = team.ownerId === user.id;
    const isMember = team.members.some((m) => m.userId === user.id);
    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this team" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { content } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Message content cannot be empty" },
        { status: 400 }
      );
    }

    const newMessage = await prisma.message.create({
      data: {
        teamId,
        senderId: user.id,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Broadcast thời gian thực qua kênh Supabase Realtime cho phòng chat
    try {
      const channel = supabase.channel(`team:${teamId}`);
      await channel.send({
        type: "broadcast",
        event: "new_message",
        payload: newMessage,
      });
    } catch (realtimeErr) {
      console.warn("Could not broadcast message via Supabase:", realtimeErr);
    }

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("Error creating team message:", error);
    return NextResponse.json(
      { error: "Internal Server Error sending message" },
      { status: 500 }
    );
  }
}
