import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TaskStatus, TaskPriority } from "@prisma/client";

// GET /api/tasks - Lấy danh sách tasks
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    const whereClause: { status?: TaskStatus } = {};
    if (statusParam && Object.values(TaskStatus).includes(statusParam as TaskStatus)) {
      whereClause.status = statusParam as TaskStatus;
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: [
        { createdAt: "desc" }
      ],
      include: {
        team: {
          select: { id: true, name: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json(tasks, { status: 200 });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Internal Server Error while fetching tasks" },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Tạo task mới
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, status, priority, dueDate, teamId, assigneeId } = body;

    // Client-side & server-side validation: title là bắt buộc
    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { error: "Title is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate enum status if provided
    let taskStatus: TaskStatus = TaskStatus.TODO;
    if (status && Object.values(TaskStatus).includes(status)) {
      taskStatus = status as TaskStatus;
    }

    // Validate enum priority if provided
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
        teamId: teamId || null,
        assigneeId: assigneeId || null,
      },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Internal Server Error while creating task" },
      { status: 500 }
    );
  }
}
