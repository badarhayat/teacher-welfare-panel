import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Teacher Welfare Panel';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 55%, #2a4f7c 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 140,
            height: 140,
            borderRadius: 28,
            background: 'rgba(255,255,255,0.12)',
            border: '2px solid rgba(255,255,255,0.25)',
            marginBottom: 36,
            fontSize: 72,
          }}
        >
          📖
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 56,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            textAlign: 'center',
          }}
        >
          Teacher Welfare Panel
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 16,
            fontSize: 26,
            color: '#bfdbfe',
            textAlign: 'center',
            maxWidth: 720,
          }}
        >
          Faculty welfare and issue resolution platform
        </div>
      </div>
    ),
    { ...size }
  );
}
