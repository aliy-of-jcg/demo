"use client";

import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

const categoryStyles: Record<string, { border: string; chip: string }> = {
    "캠페인 관리": { border: "border-blue-200", chip: "bg-blue-50 text-blue-700" },
    "로그 분석": { border: "border-emerald-200", chip: "bg-emerald-50 text-emerald-700" },
    "UTM 도구": { border: "border-purple-200", chip: "bg-purple-50 text-purple-700" },
    "시스템 관리": { border: "border-amber-200", chip: "bg-amber-50 text-amber-700" },
};

const sections = [
    {
        category: "캠페인 관리",
        items: [
            {
                title: "캠페인 목록",
                desc: "Campaign list with status, source/medium, budget/spend, and quick performance rollups.",
                tips: [
                    "Filter/search by name, source, medium, status, course; sort and paginate.",
                    "Shows budget/spend, clicks, visitors, CTR, conversion rate, and per-platform chips when available.",
                    "Inline actions: open detail, duplicate, edit, pause/end, delete (permission-gated).",
                    "Copy tracking links quickly and spot legacy/hidden/disabled indicators before distribution.",
                    "Use as the starting point to jump into detail or create new campaigns.",
                ],
            },
            {
                title: "캠페인 상세",
                desc: "Full campaign detail view with status, budget/spend, dates, UTM set, tracking links, and performance rollups.",
                tips: [
                    "Shows campaign meta (status, date range, budget/spend, course mapping) plus generated tracking links/UTMs per platform.",
                    "Create additional UTM links for the same campaign directly on this page—platform/source/medium presets keep taxonomy consistent.",
                    "Performance snapshot: clicks, visitors, CTR, conversion rate, and spend context if available.",
                    "Legacy data is labeled; disabled/hidden links are clearly marked so you don’t ship broken UTMs.",
                    "Provides quick actions: copy tracking links, duplicate campaign, edit, pause/end, and delete (permission-gated).",
                    "Use this page to validate landing URL tracking status before distributing links.",
                ],
            },
            {
                title: "캠페인 생성",
                desc: "새 캠페인을 생성하고 기본 상태·기간·예산·코스 연결을 설정합니다.",
                tips: [
                    "기본 캠페인 상태는 시스템 설정에서 가져와 자동 세팅(duplication 시에는 원본 상태를 유지).",
                    "이름을 넣으면 UTM name·utm_campaign이 자동 생성되고, source/medium 선택 시 utm_source·utm_medium도 채워집니다.",
                    "시작/종료일을 입력하면 캠페인 기간과 일별 예산이 계산되며 예산/날짜 유효성 검사로 잘못된 입력을 방지합니다.",
                    "코스 매핑, 랜딩 URL, 설명, UTM term/content까지 한 화면에서 입력 가능하며 복사 생성(duplicate)도 지원합니다.",
                    "ProtectedRoute + campaigns:create 권한 필요; 저장 성공 시 토스트 알림과 목록으로 이동, 실패 시 필드 포커스/에러 표시.",
                ],
            },
            {
                title: "코스 관리",
                desc: "Manage courses linked to campaigns for clean reporting and UTM consistency.",
                tips: [
                    "Create/edit/delete courses with name/code and reuse them across campaigns to standardize mapping.",
                    "Courses help group campaigns and keep UTM naming aligned to offerings or programs.",
                    "Use before campaign creation so dropdowns are ready; edits propagate to future campaign setups.",
                    "Permission-gated (campaigns:create/update) with inline validation and toast feedback.",
                    "⚠️ Courses cannot be deleted if they are attached to campaign/s please delete the campaign/s first.",
                ],
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
                desc: "UTM list with clicks, visitors, conversions, CTR, and tracking link status.",
                tips: [
                    "Filter/search UTMs; see per-UTM metrics and status (active/disabled/legacy).",
                    "Landing tracking indicator flags UTMs pointing to untracked domains so you can fix before use.",
                    "Copy short links quickly; platform/source/medium chips help keep taxonomy aligned.",
                    "Shows legacy data markers so you know when numbers include older tracking.",
                    "⚠️ “Not tracked” icon shows when the landing URL is not in tracked websites or the domain is disabled — fix before distribution.",
                ],
            },
            {
                title: "UTM 생성기",
                desc: "캠페인에 맞는 소스/미디엄/캠페인명을 채워 추적 링크를 생성합니다.",
                tips: [
                    "⚠️ Supplemental tool: you can generate UTMs here, but for the best experience use “Add tracking link” on the Campaign Detail page.",
                    "Guided form: fill name/source/medium/campaign/term/content and landing URL; auto-generates short links.",
                    "Copies short URL in one click; use consistent source/medium to keep taxonomy clean.",
                    "After creation, track clicks/visitors/conversions in UTM list and campaigns analytics.",
                    "Warns if landing URL domain is untracked/disabled so you don’t ship broken UTMs.",
                ],
            },
        ],
    },
    {
        category: "시스템 관리",
        items: [
            {
                title: "시스템 설정",
                desc: "Global defaults: date range, timezone, default campaign status/role, session timeout, allow new signs and global tracking toggle",
                tips: [
                    "Set default date range and timezone (used across analytics pages and exports).",
                    "Define default campaign status and default user role; creation forms auto-fill from these.",
                    "Toggle allow_tracking to block global tracking events at the API level instantly.",
                    "Configure session timeout (mirrors GA-style session/visit window) for consistent metrics.",
                    "Changes are fetched once per session (GA-like); reload to pick up new defaults.",
                ],
            },
            {
                title: "추적 웹사이트",
                desc: "Manage tracked domains with sessions/visitors/conversions summaries, active/disabled state, and last seen.",
                tips: [
                    "Domains auto-register on first event; toggle enable/disable per domain (permission-gated).",
                    "Active/Inactive derived from recent activity; use filters to find disabled or stale domains.",
                    "Summary cards show totals across domains; per-domain rows show sessions/visitors/pageviews/conversions and last seen.",
                    "Disabling a domain prevents new tracking events for that domain but keeps historical data.",
                ],
            },
            {
                title: "사용자 관리",
                desc: "Manage users, roles (Owner/Admin/Observer/Regular), and statuses with permissions gating.",
                tips: [
                    "Manage users set roles, activate/deactivate/remove accounts; permission-gated for admins/owners.",
                    "Role clarity: Owner can manage users while Owner/Admins can manage settings; Observer/Regular are limited to viewing/operational tasks.",
                    "Use search/filter to find users quickly; inline actions for role changes and status toggles with confirmations.",
                    "Audit-friendly: keeps role/status visibility so you can align access with org policies.",
                ],
            },
        ],
    },
];

export default function LogOverviewPage() {
    const [open, setOpen] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(sections.map((s) => [s.category, false]))
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
            <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-full bg-blue-100">
                    <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <div className="text-xs font-semibold text-blue-700 mb-1">문서 & 가이드</div>
                    <h1 className="text-2xl font-bold text-gray-900">로그/분석 페이지 개요</h1>
                    <p className="text-sm text-gray-600">주요 로그·분석 페이지와 제공 기능을 간략히 정리했습니다.</p>
                </div>
            </div>

            <p className="text-sm text-gray-700 mb-4 leading-relaxed max-w-3xl">
                This app is your sleek command center for tracking every click, visit, and conversion—pairing rich analytics with crisp campaign control.
                From UTM curation to system-wide defaults, it keeps data trustworthy, fast, and ready to share.
            </p>
            <div className="border-b border-gray-200 mb-6" />

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-4">
                <span className="px-2 py-1 rounded-full bg-gray-50 border border-gray-200">Collapsible by section</span>
                <span className="px-2 py-1 rounded-full bg-gray-50 border border-gray-200">Mobile-friendly cards</span>
            </div>

            <div className="grid gap-4">
                {sections.map((section) => {
                    const isOpen = open[section.category];
                    const style = categoryStyles[section.category] || { border: "border-gray-200", chip: "bg-gray-100 text-gray-700" };
                    return (
                        <div
                            key={section.category}
                            className="border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white transition hover:shadow-md"
                        >
                            <button
                                type="button"
                                onClick={() => setOpen((prev) => ({ ...prev, [section.category]: !isOpen }))}
                                className={`w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border-l-4 ${style.border} bg-white`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-base font-semibold text-gray-900">{section.category}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border border-gray-200 ${style.chip}`}>
                                        {section.items.length} pages
                                    </span>
                                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                </div>
                            </button>

                            <div
                                className={`overflow-hidden transition-[max-height,opacity] ease-in-out duration-300 ${isOpen ? "max-h-[1800px] opacity-100" : "max-h-0 opacity-0"}`}
                                style={{ transitionDuration: "1500ms" }}
                            >
                                <div className="divide-y divide-gray-100">
                                    {section.items.map((item) => (
                                        <div key={item.title} className="p-4 sm:p-5 space-y-2">
                                            <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                                            <div className="text-sm text-gray-700 leading-relaxed">{item.desc}</div>
                                            {item.tips && item.tips.length > 0 && (
                                                <ul className="mt-2 space-y-2">
                                                    {item.tips.map((tip) => (
                                                        <li
                                                            key={tip}
                                                            className="text-sm text-gray-600 pl-0 sm:pl-2 flex items-start gap-2 leading-relaxed"
                                                        >
                                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                                                            <span>{tip}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

