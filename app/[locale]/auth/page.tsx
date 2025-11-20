"use client";

// Legacy route kept for backward compatibility.
// Redirect to the non-locale auth page, which uses cookie-based locale handling.
import { redirect } from "next/navigation";

export default function LegacyLocaleAuthRedirect() {
  redirect("/auth");
}

