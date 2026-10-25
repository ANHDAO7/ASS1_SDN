import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { TeamMemberRole } from "@prisma/client";
import { createInAppNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

// Helper lấy role của user trong team
async function getUserRoleInTeam(
  teamId: string,
  userId: string
): Promise<{ isOwner: boolean; role: TeamMemberRole | null }> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { ownerId: true },
  });
  if (!team) return { isOwner: false, role: null };
  if (team.ownerId === userId) {
    return { isOwner: true, role: TeamMemberRole.OWNER };
  }
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { role: true },
  });
  return { isOwner: false, role: membership?.role || null };
}

// PATCH /api/teams/:id/members/:userId – Thay đổi vai trò thành viên (Owner / Admin)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId, userId: targetUserId } = await params;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const callerRoleInfo = await getUserRoleInTeam(teamId, user.id);
    if (!callerRoleInfo.isOwner && callerRoleInfo.role !== TeamMemberRole.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Team Owner and Admins can manage member roles" },
        { status: 403 }
      );
    }

    // Không thể thay đổi role của chính Owner
    if (targetUserId === team.ownerId) {
      return NextResponse.json(
        { error: "Cannot change the role of the Team Owner" },
        { status: 400 }
      );
    }

    const targetMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!targetMembership) {
      return NextResponse.json({ error: "Member not found in team" }, { status: 404 });
    }

    // Admin không thể sửa role của một Admin khác (chỉ Owner mới có quyền)
    if (!callerRoleInfo.isOwner && targetMembership.role === TeamMemberRole.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only the Team Owner can change an Admin's role" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { role } = body;

    if (!role || (role !== TeamMemberRole.ADMIN && role !== TeamMemberRole.MEMBER)) {
      return NextResponse.json(
        { error: "Invalid role. Role must be ADMIN or MEMBER" },
        { status: 400 }
      );
    }

    const updatedMember = await prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId: targetUserId } },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Tạo thông báo in-app cho thành viên được đổi role
    await createInAppNotification({
      userId: targetUserId,
      title: "Role Updated",
      content: `Your role in team "${team.name}" has been updated to ${role}.`,
      type: "ROLE_CHANGED",
      link: `/teams/${teamId}`,
    });

    // Broadcast sự kiện qua Supabase Realtime
    try {
      const channel = supabase.channel(`team:${teamId}`);
      await channel.send({
        type: "broadcast",
        event: "member_updated",
        payload: updatedMember,
      });
    } catch (e) {
      console.warn("Could not broadcast member_updated:", e);
    }

    return NextResponse.json(updatedMember, { status: 200 });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Internal Server Error updating member role" },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/:id/members/:userId – Xóa thành viên hoặc tự rời team
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId, userId: targetUserId } = await params;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Không thể xóa chính Owner khỏi team
    if (targetUserId === team.ownerId) {
      return NextResponse.json(
        { error: "Cannot remove the Team Owner. The owner must transfer ownership or delete the team." },
        { status: 400 }
      );
    }

    const isSelfLeaving = user.id === targetUserId;
    const callerRoleInfo = await getUserRoleInTeam(teamId, user.id);

    // Quyền: Tự rời, Owner hoặc Admin
    if (!isSelfLeaving && !callerRoleInfo.isOwner && callerRoleInfo.role !== TeamMemberRole.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to remove members" },
        { status: 403 }
      );
    }

    const targetMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });

    if (!targetMembership) {
      return NextResponse.json({ error: "Member not found in team" }, { status: 404 });
    }

    // Admin không được xóa Admin khác
    if (!isSelfLeaving && !callerRoleInfo.isOwner && targetMembership.role === TeamMemberRole.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Admins cannot remove other Admins. Only Owner can." },
        { status: 403 }
      );
    }

    // Xóa phân công task cho member này trong team nếu có
    await prisma.task.updateMany({
      where: { teamId, assigneeId: targetUserId },
      data: { assigneeId: null },
    });

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });

    // Thông báo nếu bị xóa bởi người khác
    if (!isSelfLeaving) {
      await createInAppNotification({
        userId: targetUserId,
        title: "Removed from Team",
        content: `You were removed from team "${team.name}".`,
        type: "TEAM_REMOVED",
      });
    }

    // Broadcast sự kiện xóa thành viên
    try {
      const channel = supabase.channel(`team:${teamId}`);
      await channel.send({
        type: "broadcast",
        event: "member_removed",
        payload: { userId: targetUserId },
      });
    } catch (e) {
      console.warn("Could not broadcast member_removed:", e);
    }

    return NextResponse.json(
      { message: "Member removed successfully", userId: targetUserId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing member from team:", error);
    return NextResponse.json(
      { error: "Internal Server Error removing member" },
      { status: 500 }
    );
  }
}
