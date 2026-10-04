import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { TaskStatus, TaskPriority } from "@prisma/client";

// GET /api/teams/:id/tasks – Lấy danh sách tasks của team
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
        members: { select: { userId: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Kiểm tra quyền: phải là Owner hoặc thành viên của team
    const isMember =
      team.ownerId === user.id || team.members.some((m) => m.userId === user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this team" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");
    const assigneeParam = searchParams.get("assigneeId");
    const searchParam = searchParams.get("q");

    const whereClause: {
      teamId: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      OR?: Array<{ title?: { contains: string; mode: "insensitive" }; description?: { contains: string; mode: "insensitive" } }>;
    } = { teamId };

    if (statusParam && Object.values(TaskStatus).includes(statusParam as TaskStatus)) {
      whereClause.status = statusParam as TaskStatus;
    }

    if (priorityParam && Object.values(TaskPriority).includes(priorityParam as TaskPriority)) {
      whereClause.priority = priorityParam as TaskPriority;
    }

    if (assigneeParam) {
      whereClause.assigneeId = assigneeParam;
    }

    if (searchParam && searchParam.trim()) {
      whereClause.OR = [
        { title: { contains: searchParam.trim(), mode: "insensitive" } },
        { description: { contains: searchParam.trim(), mode: "insensitive" } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks, { status: 200 });
  } catch (error) {
    console.error("Error fetching team tasks:", error);
    return NextResponse.json(
      { error: "Internal Server Error fetching team tasks" },
      { status: 500 }
    );
  }
}

// POST /api/teams/:id/tasks – Tạo task mới trong team (Mọi thành viên trong team đều được tạo)
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
        members: { select: { userId: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Kiểm tra quyền thành viên
    const isMember =
      team.ownerId === user.id || team.members.some((m) => m.userId === user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: "Forbidden: Only team members can create tasks in this team" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, status, priority, dueDate, assigneeId } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }

    // Nếu có assigneeId, đảm bảo người đó là thành viên hoặc owner của team
    if (assigneeId) {
      const isAssigneeValid =
        team.ownerId === assigneeId ||
        team.members.some((m) => m.userId === assigneeId);

      if (!isAssigneeValid) {
        return NextResponse.json(
          { error: "Assignee must be a member of the team" },
          { status: 400 }
        );
      }
    }

    let taskStatus: TaskStatus = TaskStatus.TODO;
    if (status && Object.values(TaskStatus).includes(status)) {
      taskStatus = status as TaskStatus;
    }

    let taskPriority: TaskPriority = TaskPriority.MEDIUM;
    if (priority && Object.values(TaskPriority).includes(priority)) {
      taskPriority = priority as TaskPriority;
    }

    const newTask = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description ? String(description).trim() : null,
        status: taskStatus,
        priority: taskPriority,
        dueDate: dueDate ? new Date(dueDate) : null,
        teamId,
        assigneeId: assigneeId || null,
        creatorId: user.id,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("Error creating team task:", error);
    return NextResponse.json(
      { error: "Internal Server Error creating team task" },
      { status: 500 }
    );
  }
}
