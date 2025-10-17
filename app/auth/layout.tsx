import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Authentication",
  description: "Login or signup to access the admin panel",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

