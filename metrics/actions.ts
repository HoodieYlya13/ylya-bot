"use server";

import { cookies } from "next/headers";
import { signJWT } from "@/lib/jwt";
import { redirect } from "next/navigation";

interface ActionState {
  error?: string;
  success?: boolean;
}

export async function loginAction(
  prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const password = formData.get("password") as string;
  const correctPassword = process.env.ANALYTICS_PASSWORD;

  if (!correctPassword)
    return {
      error:
        "Server authentication is not configured in environment variables.",
    };

  if (password !== correctPassword)
    return { error: "Invalid password credentials." };

  const token = await signJWT({ user: "admin" }, 60 * 60 * 24 * 7);

  const cookieStore = await cookies();
  cookieStore.set("bot_metrics_auth_token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return { success: true };
}

export async function logoutAction(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete("bot_metrics_auth_token");
  redirect("/ylya-bot/metrics");
}
