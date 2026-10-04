import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "taskflow-super-secret-key-assignment-2-secure-2026"
);

export const AUTH_COOKIE_NAME = "taskflow_auth_token";

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

// Mã hóa mật khẩu với bcrypt
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// So sánh mật khẩu
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Tạo JWT Token có thời hạn 7 ngày
export async function signJwtToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

// Xác thực JWT Token
export async function verifyJwtToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// Lấy thông tin user hiện tại từ Request (Cookie hoặc Header Authorization)
export async function getAuthenticatedUser(request?: Request): Promise<{
  id: string;
  name: string;
  email: string;
} | null> {
  let token: string | undefined;

  // 1. Kiểm tra header Authorization: Bearer <token>
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  // 2. Nếu chưa có, kiểm tra Cookie từ request hoặc next/headers
  if (!token && request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
      if (match) {
        token = match.split("=")[1];
      }
    }
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      const cookie = cookieStore.get(AUTH_COOKIE_NAME);
      if (cookie) {
        token = cookie.value;
      }
    } catch {
      // Bỏ qua nếu môi trường không hỗ trợ next/headers cookies()
    }
  }

  if (!token) {
    return null;
  }

  const payload = await verifyJwtToken(token);
  if (!payload || !payload.userId) {
    return null;
  }

  // Kiểm tra user có tồn tại trong database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true },
  });

  return user;
}
