// Legacy locale layout wrapper kept for backward compatibility.
// Locale handling is now driven solely by the root layout using the NEXT_LOCALE cookie.
export const dynamic = "force-dynamic";

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

