import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { TeamMemberRole } from "@prisma/client";

// POST /api/teams/:id/members – Thêm thành viên vào team bằng email (Chỉ Owner)
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
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Chỉ Owner được thêm thành viên
    if (team.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only the team Owner can add members" },
        { status: 403 }
      );
    }

    const body = await request.json();
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

    if (existingMembership) {
      return NextResponse.json(
        { error: "This user is already a member of the team" },
        { status: 400 }
      );
    }

    let memberRole: TeamMemberRole = TeamMemberRole.MEMBER;
    if (role && Object.values(TeamMemberRole).includes(role)) {
      memberRole = role as TeamMemberRole;
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

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error("Error adding member to team:", error);
    return NextResponse.json(
      { error: "Internal Server Error adding member to team" },
      { status: 500 }
    );
  }
}
