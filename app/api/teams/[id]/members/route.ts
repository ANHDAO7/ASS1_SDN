import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { TeamMemberRole } from "@prisma/client";
import { createInAppNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

// POST /api/teams/:id/members – Thêm thành viên vào team bằng email (Owner & Admin)
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
          where: { userId: user.id },
          select: { role: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Quyền: Owner hoặc Admin
    const isOwner = team.ownerId === user.id;
    const callerMembership = team.members[0];
    const isAdmin = callerMembership?.role === TeamMemberRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only Team Owner and Admins can add members" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { email, role } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Tìm user theo email
    const targetUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: `User with email '${normalizedEmail}' was not found. Please ask them to register first.` },
        { status: 404 }
      );
    }

    // Kiểm tra xem đã là thành viên của team chưa
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership || team.ownerId === targetUser.id) {
      return NextResponse.json(
        { error: "This user is already a member or owner of the team" },
        { status: 400 }
      );
    }

    let memberRole: TeamMemberRole = TeamMemberRole.MEMBER;
    // Chỉ Owner mới được gán ngay role ADMIN khi mời, Admin thông thường mời thành viên với role MEMBER
    if (role === TeamMemberRole.ADMIN && isOwner) {
      memberRole = TeamMemberRole.ADMIN;
    }

    const newMember = await prisma.teamMember.create({
      data: {
        teamId,
        userId: targetUser.id,
        role: memberRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Tạo thông báo in-app cho thành viên mới
    await createInAppNotification({
      userId: targetUser.id,
      title: "Added to Team",
      content: `You have been added to team "${team.name}" as ${memberRole}.`,
      type: "TEAM_INVITED",
      link: `/teams/${teamId}`,
    });

    // Broadcast sự kiện qua Supabase Realtime
    try {
      const channel = supabase.channel(`team:${teamId}`);
      await channel.send({
        type: "broadcast",
        event: "member_added",
        payload: newMember,
      });
    } catch (e) {
      console.warn("Could not broadcast member_added:", e);
    }

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error("Error adding member to team:", error);
    return NextResponse.json(
      { error: "Internal Server Error adding member to team" },
      { status: 500 }
    );
  }
}
