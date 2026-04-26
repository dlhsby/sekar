import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * SEKAR apple touch icon — auto-generates /apple-icon.png
 * Navy background with bold "S" glyph in primary green
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1A4D2E',
        }}
      >
        <span
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: 130,
            fontWeight: 800,
            color: '#7FBC8C',
            lineHeight: 1,
          }}
        >
          S
        </span>
      </div>
    ),
    { ...size }
  );
}
