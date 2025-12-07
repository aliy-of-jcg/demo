export const MEDIA_OPTIONS = [
    'naver',
    'kakao',
    'google',
    'youtube',
    'facebook',
    'instagram',
    'saramin',
    'email',
    'other'
] as const;

export type MediaOption = (typeof MEDIA_OPTIONS)[number];

export const getMediaLabel = (value: string) =>
    value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

