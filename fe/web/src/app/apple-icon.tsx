import { ImageResponse } from 'next/og';
import { PINWHEEL, pinwheelDataUri } from '@/lib/brand/pinwheel';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * SEKAR apple touch icon — auto-generates /apple-icon.png.
 * Mirrors the canonical brand lockup (`SekarLogoBox`): the pinwheel inside a
 * tilted white Neo-Brutalist box (thick ink border + hard-edge offset shadow)
 * on the green canvas.
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 124,
            height: 124,
            borderRadius: 24,
            border: `6px solid ${PINWHEEL.ink}`,
            background: '#FFFFFF',
            // eslint-disable-next-line sekar-design/prefer-nb-shadow-utility -- ImageResponse renders to PNG; Tailwind shadow utilities don't apply here.
            boxShadow: `8px 8px 0 ${PINWHEEL.ink}`,
            transform: 'rotate(-6deg)',
          }}
        >
          <img src={pinwheelDataUri()} width={80} height={80} alt="SEKAR" />
        </div>
      </div>
    ),
    { ...size },
  );
}
