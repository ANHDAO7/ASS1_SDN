import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { TaskStatus, TaskPriority, TeamMemberRole } from "@prisma/client";
import { createInAppNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

// PUT /api/tasks/[id] – Cập nhật task (Owner & Admin có thể sửa mọi task, Member chỉ sửa task của chính mình)
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
            members: { select: { userId: true, role: true } },
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Nếu task thuộc về một team, kiểm tra quyền theo vai trò (Owner, Admin, Member)
    if (existingTask.team) {
      const isOwner = existingTask.team.ownerId === user.id;
      const callerMembership = existingTask.team.members.find(
        (m) => m.userId === user.id
      );
      const isAdmin = callerMembership?.role === TeamMemberRole.ADMIN;
      const isCreator = existingTask.creatorId === user.id;
      const isAssignee = existingTask.assigneeId === user.id;

      if (!isOwner && !isAdmin && !isCreator && !isAssignee) {
        return NextResponse.json(
          {
            error:
              "Forbidden: Members can only update their own tasks (created by or assigned to them)",
          },
          { status: 403 }
        );
      }
    } else {
      // Task cá nhân (không thuộc team): chỉ creator mới được sửa
      if (existingTask.creatorId && existingTask.creatorId !== user.id) {
        return NextResponse.json(
          { error: "Forbidden: You can only edit your own personal tasks" },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
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

    const isAssigneeChanged =
      assigneeId !== undefined && assigneeId !== existingTask.assigneeId;

    if (assigneeId !== undefined) {
      if (assigneeId && existingTask.team) {
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

    // Nếu gán cho người khác và là người mới, gửi thông báo in-app
    if (isAssigneeChanged && assigneeId && assigneeId !== user.id) {
      await createInAppNotification({
        userId: assigneeId,
        title: "Task Assigned to You",
        content: `You were assigned the task "${updatedTask.title}"${
          existingTask.team ? ` in team "${existingTask.team.name}"` : ""
        }.`,
        type: "TASK_ASSIGNED",
        link: existingTask.teamId ? `/teams/${existingTask.teamId}` : "/",
      });
    }

    // Broadcast sự kiện task_updated qua Supabase Realtime nếu thuộc team
    if (existingTask.teamId) {
      try {
        const channel = supabase.channel(`team:${existingTask.teamId}`);
        await channel.send({
          type: "broadcast",
          event: "task_updated",
          payload: updatedTask,
        });
      } catch (e) {
        console.warn("Could not broadcast task_updated:", e);
      }
    }

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
// Quy định:
// - Owner và Admin có thể xóa bất kỳ task nào trong team
// - Member chỉ có thể xóa task do chính mình tạo (creator)
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
          include: {
            members: { select: { userId: true, role: true } },
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (existingTask.team) {
      const isOwner = existingTask.team.ownerId === user.id;
      const callerMembership = existingTask.team.members.find(
        (m) => m.userId === user.id
      );
      const isAdmin = callerMembership?.role === TeamMemberRole.ADMIN;
      const isCreator = existingTask.creatorId === user.id;

      // Owner và Admin được xóa mọi task, Member chỉ được xóa task do mình tạo
      if (!isOwner && !isAdmin && !isCreator) {
        return NextResponse.json(
          {
            error:
              "Forbidden: Members can only delete tasks they created. Admins or Owner can delete any task.",
          },
          { status: 403 }
        );
      }
    } else {
      if (existingTask.creatorId && existingTask.creatorId !== user.id) {
        return NextResponse.json(
          { error: "Forbidden: You can only delete your own personal tasks" },
          { status: 403 }
        );
      }
    }

    const teamId = existingTask.teamId;

    await prisma.task.delete({
      where: { id },
    });

    // Broadcast sự kiện task_deleted qua Supabase Realtime nếu thuộc team
    if (teamId) {
      try {
        const channel = supabase.channel(`team:${teamId}`);
        await channel.send({
          type: "broadcast",
          event: "task_deleted",
          payload: { id, teamId },
        });
      } catch (e) {
        console.warn("Could not broadcast task_deleted:", e);
      }
    }

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
