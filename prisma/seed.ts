import { PrismaClient, TaskStatus, TaskPriority, TeamMemberRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Assignment 2 database...");

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // 1. Tạo hoặc cập nhật Grader Test Account
  const grader = await prisma.user.upsert({
    where: { email: "grader@example.com" },
    update: {
      name: "Grading Examiner",
      password: hashedPassword,
    },
    create: {
      email: "grader@example.com",
      name: "Grading Examiner",
      password: hashedPassword,
    },
  });

  // 2. Tạo hoặc cập nhật Teammate Test Account
  const sarah = await prisma.user.upsert({
    where: { email: "sarah.dev@example.com" },
    update: {
      name: "Sarah Developer",
      password: hashedPassword,
    },
    create: {
      email: "sarah.dev@example.com",
      name: "Sarah Developer",
      password: hashedPassword,
    },
  });

  console.log(`Users created/updated: ${grader.email}, ${sarah.email}`);

  // 3. Tạo hoặc lấy Team 1
  let team1 = await prisma.team.findFirst({
    where: {
      ownerId: grader.id,
      name: "Core Engineering Team",
    },
  });

  if (!team1) {
    team1 = await prisma.team.create({
      data: {
        name: "Core Engineering Team",
        description: "Sprint delivery workspace for frontend & backend developers",
        ownerId: grader.id,
      },
    });
  }

  // Gán members cho Team 1
  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team1.id,
        userId: grader.id,
      },
    },
    update: { role: TeamMemberRole.OWNER },
    create: {
      teamId: team1.id,
      userId: grader.id,
      role: TeamMemberRole.OWNER,
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team1.id,
        userId: sarah.id,
      },
    },
    update: { role: TeamMemberRole.MEMBER },
    create: {
      teamId: team1.id,
      userId: sarah.id,
      role: TeamMemberRole.MEMBER,
    },
  });

  // 4. Tạo hoặc lấy Team 2
  let team2 = await prisma.team.findFirst({
    where: {
      ownerId: grader.id,
      name: "UI/UX Design Squad",
    },
  });

  if (!team2) {
    team2 = await prisma.team.create({
      data: {
        name: "UI/UX Design Squad",
        description: "Design system tokens, visual components, and accessible user flows",
        ownerId: grader.id,
      },
    });
  }

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team2.id,
        userId: grader.id,
      },
    },
    update: { role: TeamMemberRole.OWNER },
    create: {
      teamId: team2.id,
      userId: grader.id,
      role: TeamMemberRole.OWNER,
    },
  });

  // 5. Tạo sample tasks cho Team 1 nếu chưa có
  const existingTasksCount = await prisma.task.count({
    where: { teamId: team1.id },
  });

  if (existingTasksCount === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: "Implement User Authentication with JWT & Cookies",
          description: "Develop POST /api/auth/register, login, and logout endpoints with bcrypt password hashing.",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          teamId: team1.id,
          assigneeId: sarah.id,
          creatorId: grader.id,
          dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000),
        },
        {
          title: "Build Relational Team CRUD APIs & Role Authorization",
          description: "Enforce Owner vs Member access control for adding members and deleting workspaces.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          teamId: team1.id,
          assigneeId: grader.id,
          creatorId: grader.id,
          dueDate: new Date(Date.now() + 4 * 24 * 3600 * 1000),
        },
        {
          title: "Setup Kanban Board with Drag & Drop Columns",
          description: "Provide visual status indicators, priority badges, and 1-click status transitions.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          teamId: team1.id,
          assigneeId: sarah.id,
          creatorId: grader.id,
          dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        },
        {
          title: "Verify Vercel Deployment & Production Connection Pooling",
          description: "Ensure Supabase pooling URL and DIRECT_URL are properly configured in Vercel environment.",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          teamId: team1.id,
          assigneeId: grader.id,
          creatorId: grader.id,
          dueDate: new Date(Date.now() + 10 * 24 * 3600 * 1000),
        },
      ],
    });
    console.log("Sample tasks created for Core Engineering Team.");
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
