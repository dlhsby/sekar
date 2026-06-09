import { ImageResponse } from 'next/og';
import { PINWHEEL, pinwheelDataUri } from '@/lib/brand/pinwheel';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * SEKAR apple touch icon — auto-generates /apple-icon.png
 * Green canvas with the pinwheel brand mark.
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
          background: PINWHEEL.greenBg,
        }}
      >
        <img src={pinwheelDataUri()} width={132} height={132} alt="SEKAR" />
      </div>
    ),
    { ...size },
  );
}
