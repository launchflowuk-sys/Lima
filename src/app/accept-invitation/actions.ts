"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { acceptInvitation } from "@/server/team/service";
import { createSession, SESSION_COOKIE } from "@/server/auth/session";
import { env } from "@/env";

export interface AcceptState {
  error?: string;
}

const schema = z.object({
  token: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(10, "Password must be at least 10 characters"),
});

export async function acceptInvitationAction(_prev: AcceptState, formData: FormData): Promise<AcceptState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    firstName: formData.get("firstName") ?? "",
    lastName: formData.get("lastName") ?? "",
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let userId: string;
  try {
    const result = await acceptInvitation({
      token: parsed.data.token,
      firstName: parsed.data.firstName ?? "",
      lastName: parsed.data.lastName ?? "",
      password: parsed.data.password,
    });
    userId = result.userId;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not accept invitation" };
  }

  const { token, expiresAt } = await createSession(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  redirect("/dashboard");
}
