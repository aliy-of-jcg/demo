"use client";

import { BookOpen } from "lucide-react";

const sections = [
    {
        title: "HTML (정적 사이트)",
        steps: [
            "<head> 안에 스크립트 추가:",
            '<script src="https://dev.cosmosai.co.kr/cosmos-track.js" defer></script>',
        ],
    },
    {
        title: "Next.js (App Router)",
        steps: [
            "app/layout.tsx 에 Script 추가:",
            "import Script from 'next/script'",
            "<Script src=\"https://dev.cosmosai.co.kr/cosmos-track.js\" strategy=\"afterInteractive\" />",
        ],
    },
    {
        title: "Next.js (Pages Router)",
        steps: [
            "pages/_document.tsx 의 <Head>에 추가:",
            '<script src="https://dev.cosmosai.co.kr/cosmos-track.js" defer />',
        ],
    },
    {
        title: "Vue 3 / Vite",
        steps: [
            "index.html <head>에 추가:",
            '<script src="https://dev.cosmosai.co.kr/cosmos-track.js" defer></script>',
        ],
    },
    {
        title: "Nuxt 3",
        steps: [
            "nuxt.config.ts 내 app.head.script 설정:",
            "{ src: 'https://dev.cosmosai.co.kr/cosmos-track.js', defer: true }",
        ],
    },
    {
        title: "React (CRA / Vite)",
        steps: [
            "public/index.html <head>에 추가:",
            '<script src="https://dev.cosmosai.co.kr/cosmos-track.js" defer></script>',
        ],
    },
    {
        title: "WordPress",
        steps: [
            "functions.php에 등록:",
            "wp_enqueue_script('cosmos-tracker', 'https://dev.cosmosai.co.kr/cosmos-track.js', [], null, false);",
        ],
    },
];

const notes = [
    "defer 속성을 사용해 렌더링을 막지 않습니다.",
    "페이지 로드 시 자동으로 트래킹이 시작됩니다.",
    "추가 설정 없이 바로 동작합니다.",
    "네트워크 탭에서 /api/track 호출을 확인해 동작 여부를 검증할 수 있습니다.",
    "브라우저 콘솔에서 [CosMos] 로그를 확인하세요: Using production/internal endpoint, Session timeout loaded, Already initialized 등 메시지가 보이면 스크립트가 정상 로드된 것입니다.",
    "콘솔에 CosMos AI Tracking Disabled 메시지가 보이면 시스템 설정에서 추적을 켜야 합니다.",
];

export default function TrackingSetupPage() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-full bg-indigo-100">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <div className="text-xs font-semibold text-indigo-700 mb-1">문서 & 가이드</div>
                    <h1 className="text-2xl font-bold text-gray-900">트래킹 스크립트 설치 가이드</h1>
                    <p className="text-sm text-gray-600">프런트엔드 환경별로 트래킹 스크립트를 배포하는 방법입니다.</p>
                </div>
            </div>

            <div className="space-y-4">
                {sections.map((s) => (
                    <div key={s.title} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="text-base font-semibold text-gray-900 mb-2">{s.title}</div>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 leading-relaxed">
                            {s.steps.map((step, idx) => (
                                <li key={idx} className="whitespace-pre-wrap">{step}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 leading-relaxed">
                <div className="font-semibold mb-1">주의 / 확인 사항</div>
                <ul className="list-disc pl-5 space-y-1">
                    {notes.map((n, idx) => (
                        <li key={idx}>{n}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

