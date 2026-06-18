import { ImageResponse } from 'next/og';
import { PINWHEEL, pinwheelDataUri } from '@/lib/brand/pinwheel';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/**
 * SEKAR favicon — auto-generates /icon.png.
 * Mirrors the canonical brand lockup (`SekarLogoBox`): the pinwheel inside a
 * tilted white Neo-Brutalist box (thick ink border + hard-edge offset shadow)
 * on the green canvas.
 */
export default function Icon() {
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
            width: 24,
            height: 24,
            borderRadius: 6,
            border: `2px solid ${PINWHEEL.ink}`,
            background: '#FFFFFF',
            boxShadow: `2px 2px 0 ${PINWHEEL.ink}`,
            transform: 'rotate(-6deg)',
          }}
        >
          <img src={pinwheelDataUri()} width={15} height={15} alt="SEKAR" />
        </div>
      </div>
    ),
    { ...size },
  );
}
