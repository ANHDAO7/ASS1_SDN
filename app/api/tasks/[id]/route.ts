import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { TaskStatus, TaskPriority } from "@prisma/client";

// PUT /api/tasks/[id] – Cập nhật task (Thành viên team có thể cập nhật chi tiết, trạng thái, độ ưu tiên)
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
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: { select: { userId: true } },
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Nếu task thuộc về một team, kiểm tra xem user có phải thành viên team không
    if (existingTask.team) {
      const isMember =
        existingTask.team.ownerId === user.id ||
        existingTask.team.members.some((m) => m.userId === user.id);

      if (!isMember) {
        return NextResponse.json(
          { error: "Forbidden: You are not a member of this task's team" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { title, description, status, priority, dueDate, assigneeId } = body;

    const updateData: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: Date | null;
      assigneeId?: string | null;
    } = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        return NextResponse.json(
          { error: "Title must not be empty" },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description ? String(description).trim() : null;
    }

    if (status !== undefined) {
      if (Object.values(TaskStatus).includes(status)) {
        updateData.status = status as TaskStatus;
      }
    }

    if (priority !== undefined) {
      if (Object.values(TaskPriority).includes(priority)) {
        updateData.priority = priority as TaskPriority;
      }
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (assigneeId !== undefined) {
      if (assigneeId && existingTask.team) {
        // Kiểm tra xem assignee có thuộc team không
        const isAssigneeMember =
          existingTask.team.ownerId === assigneeId ||
          existingTask.team.members.some((m) => m.userId === assigneeId);

        if (!isAssigneeMember) {
          return NextResponse.json(
            { error: "Assignee must be a member of the team" },
            { status: 400 }
          );
        }
      }
      updateData.assigneeId = assigneeId || null;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        team: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Internal Server Error while updating task" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] – Xóa task
// Quy định: Only the task creator, the assignee, or the team Owner can delete a task.
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
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        team: {
          select: { id: true, ownerId: true },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Kiểm tra quyền xóa: chỉ Task Creator, Assignee, hoặc Team Owner
    const isTeamOwner = existingTask.team?.ownerId === user.id;
    const isCreator = existingTask.creatorId === user.id;
    const isAssignee = existingTask.assigneeId === user.id;

    if (!isTeamOwner && !isCreator && !isAssignee) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only the task creator, the assignee, or the team Owner can delete this task",
        },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Task deleted successfully", id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal Server Error while deleting task" },
      { status: 500 }
    );
  }
}
