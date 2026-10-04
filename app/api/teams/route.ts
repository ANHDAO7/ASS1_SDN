import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { TeamMemberRole } from "@prisma/client";

// GET /api/teams – Lấy danh sách teams mà user hiện tại tham gia
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
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
        },
        _count: {
          select: { members: true, tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Bổ sung role của user hiện tại trong từng team
    const teamsWithRole = teams.map((team) => {
      const isOwner = team.ownerId === user.id;
      const membership = team.members.find((m) => m.userId === user.id);
      const role = isOwner ? TeamMemberRole.OWNER : membership?.role || TeamMemberRole.MEMBER;
      return {
        ...team,
        currentUserRole: role,
        isOwner,
      };
    });

    return NextResponse.json(teamsWithRole, { status: 200 });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Internal Server Error fetching teams" },
      { status: 500 }
    );
  }
}

// POST /api/teams – Tạo team mới (user hiện tại tự động là Owner)
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    // Sử dụng transaction để tạo team và gán membership OWNER
    const newTeam = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: name.trim(),
          description: description ? String(description).trim() : null,
          ownerId: user.id,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: TeamMemberRole.OWNER,
        },
      });

      return team;
    });

    const fullTeam = await prisma.team.findUnique({
      where: { id: newTeam.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { members: true, tasks: true } },
      },
    });

    return NextResponse.json(fullTeam, { status: 201 });
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json(
      { error: "Internal Server Error creating team" },
      { status: 500 }
    );
  }
}
