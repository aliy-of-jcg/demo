import type { Metadata } from "next";

type Params = {
  locale: string;
};

export async function generateMetadata({ 
  params 
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { locale } = await params;
  
  return {
    title: locale === 'ko' ? '관리자 인증' : 'Admin Authentication',
    description: locale === 'ko' 
      ? '관리 패널에 액세스하려면 로그인하거나 가입하세요'
      : 'Login or signup to access the admin panel',
  };
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}


