import { useMemo } from 'react';
import * as QRCode from 'qrcode';

export interface UpiQrProps {
  payload: string;
  size?: number;
}

/** Quiet zone in modules, required around the symbol for reliable scanning. */
const QUIET_ZONE = 4;

interface Cell {
  x: number;
  y: number;
}

/** Scannable UPI QR code rendered as SVG rectangles on a white card. */
export function UpiQr({ payload, size = 192 }: UpiQrProps) {
  const matrix = useMemo(() => {
    const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
    const { size: n, data } = qr.modules;
    const cells: Cell[] = [];
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (data[row * n + col]) cells.push({ x: col, y: row });
      }
    }
    return { n, cells };
  }, [payload]);

  const total = matrix.n + QUIET_ZONE * 2;

  return (
    <div className="inline-block rounded-2xl bg-white p-3 shadow-lg shadow-black/30">
      <svg
        viewBox={`0 0 ${total} ${total}`}
        width={size}
        height={size}
        shapeRendering="crispEdges"
        role="img"
        aria-label="UPI payment QR code"
      >
        <rect width={total} height={total} fill="#ffffff" />
        {matrix.cells.map((cell) => (
          <rect
            key={`${cell.x}-${cell.y}`}
            x={cell.x + QUIET_ZONE}
            y={cell.y + QUIET_ZONE}
            width={1}
            height={1}
            fill="#000000"
          />
        ))}
      </svg>
    </div>
  );
}
