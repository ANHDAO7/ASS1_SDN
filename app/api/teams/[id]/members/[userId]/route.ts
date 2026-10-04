import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

// DELETE /api/teams/:id/members/:userId – Xóa thành viên khỏi team (Chỉ Owner)
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
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Chỉ Owner được xóa thành viên (hoặc thành viên tự rời team)
    const isOwner = team.ownerId === user.id;
    const isSelfLeaving = user.id === targetUserId;

    if (!isOwner && !isSelfLeaving) {
      return NextResponse.json(
        { error: "Forbidden: Only the team Owner can remove members" },
        { status: 403 }
      );
    }

    // Không thể xóa chính Owner khỏi team
    if (targetUserId === team.ownerId) {
      return NextResponse.json(
        { error: "Cannot remove the team Owner. The owner must transfer ownership or delete the team." },
        { status: 400 }
      );
    }

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Member not found in this team" },
        { status: 404 }
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
