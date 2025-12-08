"use client";

import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

const sections = [
    {
        category: "캠페인 관리",
        items: [
            {
                title: "캠페인 목록",
                desc: "캠페인 현황을 조회하고 상태(활성/일시중지/종료)와 성과를 확인합니다.",
                tips: ["캠페인별 소스/미디엄/예산을 빠르게 점검합니다."],
            },
            {
                title: "캠페인 생성",
                desc: "새 캠페인을 생성하고 기본 상태·기간·예산·코스 연결을 설정합니다.",
                tips: ["기본 캠페인 상태는 시스템 설정의 기본값을 따릅니다."],
            },
            {
                title: "코스 관리",
                desc: "캠페인에 연결할 코스를 생성·관리합니다.",
                tips: ["캠페인 생성 시 코스 매핑으로 보고 체계를 정리합니다."],
            },
        ],
    },
    {
        category: "로그 분석",
        items: [
            {
                title: "성능 분석",
                desc: "Traffic, conversions, and revenue rolled up with fast range pivots and exports.",
                tips: [
                    "Follows global date range/timezone from System Settings for consistency.",
                    "Quick ranges (7/30/90 days) plus manual date pickers mirror GA defaults.",
                    "PDF export and tracking-status badge keep sharing and health checks one click away.",
                    "Shows visitor/conversion/revenue cards, channel donut share, trendlines, and channel-level CPA/revenue tables aligned to the selected range.",
                ],
            },
            {
                title: "채널 성과",
                desc: "Source/medium and channel breakdowns to spot winners and under-performers.",
                tips: [
                    "Shows channel-level totals (visits, conversions, ad cost, CTR) plus per-campaign rows with status, CPA-ish context, and conversion rates.",
                    "Includes a comparative bar chart for visits, conversions, and ad cost to scan channel efficiency fast.",
                    "Export-to-PDF and tracking-status badge mirror the performance view for shareable snapshots.",
                    "Pair with UTM governance so channel taxonomy stays clean.",
                ],
            },
            {
                title: "캠페인 분석",
                desc: "Performance by campaign with source/medium attribution and quick comparisons.",
                tips: [
                    "View modes: chart (daily visitors/conversions line + cost bar), table (daily performance rows), UTM (per-UTM comparisons).",
                    "Shows metric cards for visitors, conversions, conv. rate, budget/spend, clicks, CTR (defaults from System Settings).",
                    "UTM comparison includes source/medium filters, expandable rows with daily visitor/conversion trend lines, and tracking warnings for untracked landings.",
                    "Platform filter, campaign budget/spend summary, PDF export, and tracking-status badge mirror the performance view.",
                    "Use identical attribution windows to keep cross-channel comparisons fair.",
                ],
            },
            {
                title: "환경 분석",
                desc: "Device/OS/browser breakdowns to catch environment-specific issues early.",
                tips: [
                    "Summary cards: mobile/tablet/desktop share (with counts) plus weighted average conversion rate across devices.",
                    "Visuals: device and browser pies, OS bar chart, and matching tables for visitors and conversion rates.",
                    "Resolution table lists top screen sizes with visitors/pageviews/share to spot layout breakpoints to prioritize.",
                    "Date presets, PDF export, and tracking-status badge mirror other analytics views; pair with Debug Sessions to verify fixes.",
                ],
            },
            {
                title: "시간대 분석",
                desc: "Performance by hour and day to align campaigns with peak intent windows.",
                tips: [
                    "Shows hourly and day-of-week bars plus a daily line trend for visitors/conversions, all localized to the system timezone badge.",
                    "Insight cards surface top hours and peak days; quick ranges mirror other analytics pages.",
                    "Tables list hour-level and day-of-week visitors/pageviews/conversions/conv. rate for export-ready detail.",
                    "PDF export and tracking-status badge match the rest of the analytics suite.",
                ],
            },
            {
                title: "재방문 분석",
                desc: "Return behavior, stickiness, and cohort retention signals at a glance.",
                tips: [
                    "GA-style defaults: date presets and system default range mirror GA behavior.",
                    "New vs Returning cards (counts, share %, avg return interval) plus pie comparison of visitor mix.",
                    "Comparison blocks for conversion rate, avg time on page, and pageviews between new and returning users.",
                    "Frequency and return-interval bar charts show visit depth and days-between-visits; daily line chart splits new vs returning trends.",
                    "Detailed table summarizes visitors/pageviews/conversions/conv. rate/avg time on page per segment; PDF export and tracking badge included.",
                    "Track uplift after nurture campaigns to prove lifecycle impact.",
                    "PDF export and tracking-status badge match the rest of analytics; sort exit-heavy pages to prioritize fixes.",

                ],
            },
            {
                title: "세션 여정",
                desc: "Journey-level view of events and properties to debug funnels and drop-offs.",
                tips: [
                    "GA-style defaults: system date range applies before fetch so journeys align with other views.",
                    "Lists up to 50 recent sessions with landing/exit pages, duration, pages count, UTM source/medium/campaign, device, browser, OS.",
                    "Inline per-page trail: URL/title/sequence, time on page, event type, landing/exit flags, HTTP status, exit timestamp.",
                    "Timezone-aware formatting via system settings; tracking-status badge for quick health check.",
                    "Use UTM and device context to isolate cohorts and debug drop-offs fast.",
                ],
            },
            {
                title: "페이지 플로우 분석",
                desc: "Visual page-to-page paths that reveal friction points and popular routes.",
                tips: [
                    "GA-style defaults: date presets and system default range apply before fetch.",
                    "Landing vs exit pages with visits/bounce/avg time on page; exit rate highlights friction pages fast.",
                    "UTM source breakdown ties session depth (pageviews/session) to traffic quality; domain filter + search let you zero in.",
                    "Session insights (total sessions/pageviews/avg depth) plus bar charts for landing/exit pages keep the overview tight.",
                    "PDF export and tracking-status badge match the rest of analytics; sort exit-heavy pages to prioritize fixes.",
                ],
            },
        ],
    },
    {
        category: "UTM 도구",
        items: [
            {
                title: "UTM 목록",
                desc: "생성된 UTM 코드 목록과 클릭/상태를 확인합니다.",
                tips: ["랜딩 추적 누락 여부(미트래킹)를 확인해 품질을 보정합니다."],
            },
            {
                title: "UTM 생성기",
                desc: "캠페인에 맞는 소스/미디엄/캠페인명을 채워 추적 링크를 생성합니다.",
                tips: ["짧은 URL을 복사해 배포하고, 클릭은 UTM 목록에서 확인합니다."],
            },
        ],
    },
    {
        category: "시스템 관리",
        items: [
            {
                title: "시스템 설정",
                desc: "기본 날짜 범위, 타임존, 기본 캠페인 상태, 추적 허용 등 글로벌 설정을 관리합니다.",
                tips: ["추적 허용(allow_tracking)을 끄면 모든 추적 이벤트가 차단됩니다."],
            },
            {
                title: "추적 웹사이트",
                desc: "도메인별 추적 상태, 세션/방문/전환 요약, 활성/비활성 관리.",
                tips: ["새 도메인은 자동 등록 후 상태를 확인하고 필요시 비활성화합니다."],
            },
            {
                title: "사용자 관리",
                desc: "사용자 목록, 역할(Owner/Admin/Observer/Regular) 및 상태를 관리합니다.",
                tips: ["시스템 설정과 사용자 관리는 관리자 권한 이상에서만 접근 가능합니다."],
            },
        ],
    },
];

export default function LogOverviewPage() {
    const [open, setOpen] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(sections.map((s) => [s.category, false]))
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-full bg-blue-100">
                    <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <div className="text-xs font-semibold text-blue-700 mb-1">문서 & 가이드</div>
                    <h1 className="text-2xl font-bold text-gray-900">로그/분석 페이지 개요</h1>
                    <p className="text-sm text-gray-600">주요 로그·분석 페이지와 제공 기능을 간략히 정리했습니다.</p>
                </div>
            </div>
            <p className="text-sm text-gray-700 mb-6 leading-relaxed">
                This app is your sleek command center for tracking every click, visit, and conversion—pairing rich analytics with crisp campaign control.
                From UTM curation to system-wide defaults, it keeps data trustworthy, fast, and ready to share.
            </p>

            <div className="space-y-3">
                {sections.map((section) => {
                    const isOpen = open[section.category];
                    return (
                        <div key={section.category} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                            <button
                                type="button"
                                onClick={() => setOpen((prev) => ({ ...prev, [section.category]: !isOpen }))}
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-t-lg"
                            >
                                <span className="text-base font-semibold text-gray-900">{section.category}</span>
                                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                            </button>

                            {isOpen && (
                                <div className="divide-y divide-gray-100">
                                    {section.items.map((item) => (
                                        <div key={item.title} className="p-4">
                                            <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                                            <div className="text-sm text-gray-700 mt-1 leading-relaxed">{item.desc}</div>
                                            {item.tips && item.tips.length > 0 && (
                                                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-gray-600">
                                                    {item.tips.map((tip) => (
                                                        <li key={tip}>{tip}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

