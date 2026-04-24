# ADR-026: Asset QR Code Strategy

**Date:** March 13, 2026
**Status:** Accepted
**Deciders:** Technical Lead, Mobile Developer
**Related:** Phase 4 Sub-Phase 4-3 (Asset Management)

---

## Context

Phase 4 asset management requires a QR code system for quick asset identification. Field workers scan QR codes on physical assets (tools, equipment) to check out, return, or view details. The system must work in outdoor park environments with varying lighting and connectivity.

## Decision Drivers

- **Scan reliability** — Must work outdoors in sunlight and shade
- **Offline capability** — QR content should be useful even without connectivity
- **Print durability** — QR codes will be printed on weatherproof labels
- **Encoding simplicity** — Minimize data in QR to keep code simple/scannable
- **Uniqueness** — Each asset must have a globally unique identifier

## Options Considered

### Option A: URL-Based QR (Deep Link) — **Not Selected**

Encode a URL like `https://sekar.wahyutrip.com/assets/AK-RU-001`.

**Pros:**
- Scannable by any QR reader → opens in browser
- Deep link integration possible

**Cons:**
- Requires network to be useful
- URL changes if domain changes
- Longer URL = denser QR = harder to scan in poor conditions

### Option B: Asset Code Only — **Selected**

Encode just the asset code string: `SEKAR:AK-RU-001`.

**Pros:**
- Minimal data → simple QR → high scan reliability
- Works offline (app matches code to cached asset)
- Domain-independent
- `SEKAR:` prefix prevents confusion with other QR codes
- Easy to print at small sizes

**Cons:**
- Only meaningful within the SEKAR app
- External QR scanners show just the code string

### Option C: JSON Payload

Encode JSON like `{"app":"SEKAR","code":"AK-RU-001","name":"Sapu Lidi #1"}`.

**Pros:**
- Rich data available offline
- Self-describing

**Cons:**
- Denser QR code (harder to scan)
- Name changes require QR reprint
- Larger print size needed

## Decision

**Option B: Asset Code Only** with `SEKAR:` prefix.

### QR Content Format

```
SEKAR:{ASSET_CODE}
```

Example: `SEKAR:AK-RU-001`

### Asset Code Format

```
{CATEGORY_PREFIX}-{RAYON_CODE}-{SEQUENCE}
```

| Category | Prefix |
|----------|--------|
| Alat Kebersihan | AK |
| Alat Pertamanan | AP |
| Kendaraan Operasional | KO |
| Peralatan Keamanan | PK |
| Peralatan Irigasi | PI |
| Perlengkapan Umum | PU |

| Rayon | Code |
|-------|------|
| Rayon Utara | RU |
| Rayon Timur | RT |
| Rayon Selatan | RS |
| Rayon Barat | RB |
| Rayon Tengah | RG |
| Rayon Pantai | RP |
| Rayon Khusus | RK |

Sequence: 3-digit zero-padded (001-999).

Example: `AK-RU-001` = Alat Kebersihan, Rayon Utara, item #1.

## Implementation

### QR Generation (Backend)

```typescript
import * as QRCode from 'qrcode';

async generateQrCode(assetCode: string): Promise<Buffer> {
  const content = `SEKAR:${assetCode}`;
  return QRCode.toBuffer(content, {
    errorCorrectionLevel: 'H', // High error correction for outdoor use
    margin: 2,
    width: 300,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}
```

### QR Scanning (Mobile)

```typescript
// react-native-vision-camera with QR code detection
onCodeScanned(codes) {
  const sekarCode = codes.find(c => c.value?.startsWith('SEKAR:'));
  if (sekarCode) {
    const assetCode = sekarCode.value.replace('SEKAR:', '');
    navigateToAssetDetail(assetCode);
  }
}
```

### Print Specifications

- **Size:** Minimum 25mm × 25mm for reliable scanning
- **Material:** Weatherproof vinyl or polyester labels
- **Error correction:** Level H (30% recovery) for outdoor durability
- **Includes:** QR code + human-readable asset code below

## Consequences

- **Positive:** High scan reliability, works offline, simple and durable
- **Negative:** External scanners show meaningless string
- **Mitigation:** Manual code entry fallback for damaged QR codes

---

**Last Updated:** 2026-03-13
