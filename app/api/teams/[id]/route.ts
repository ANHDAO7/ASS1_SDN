import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { TeamMemberRole } from "@prisma/client";

// GET /api/teams/:id – Lấy chi tiết team gồm members và tasks
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
            creator: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Kiểm tra quyền: Người dùng phải là Owner hoặc Member của team
    const isOwner = team.ownerId === user.id;
    const membership = team.members.find((m) => m.userId === user.id);

    if (!isOwner && !membership) {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this team" },
        { status: 403 }
      );
    }

    const currentUserRole = isOwner
      ? TeamMemberRole.OWNER
      : membership?.role || TeamMemberRole.MEMBER;

    return NextResponse.json(
      {
        ...team,
        currentUserRole,
        isOwner,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching team detail:", error);
    return NextResponse.json(
      { error: "Internal Server Error fetching team detail" },
      { status: 500 }
    );
  }
}

// PUT /api/teams/:id – Cập nhật thông tin team (Chỉ Owner mới có quyền)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Chỉ Owner được quyền sửa
    if (team.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only the team Owner can update team info" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    const updateData: { name?: string; description?: string | null } = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { error: "Team name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description ? String(description).trim() : null;
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json(updatedTeam, { status: 200 });
  } catch (error) {
    console.error("Error updating team:", error);
    return NextResponse.json(
      { error: "Internal Server Error updating team" },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/:id – Xóa team (Chỉ Owner mới có quyền)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Chỉ Owner được xóa team
    if (team.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only the team Owner can delete this team" },
        { status: 403 }
      );
    }

    await prisma.team.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Team deleted successfully", id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json(
      { error: "Internal Server Error deleting team" },
      { status: 500 }
    );
  }
}
