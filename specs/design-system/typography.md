# Typography System

**Version:** 2.0.0 (Modern Neo Brutalism)

Complete typography specifications for SEKAR applications, updated for Neo Brutalism 2.0.

## Font Strategy

SEKAR uses **Space Grotesk** for display/headings and **Inter** for body text, based on [Neo-brutalism-CSS](https://github.com/Walikuperek/Neo-brutalism-CSS) recommendations.

### Font Families

| Usage | Font | Weight Range | Fallback |
|-------|------|--------------|----------|
| **Display/Headings** | Space Grotesk | 600-800 | system-ui, sans-serif |
| **Body Text** | Inter | 400-600 | system-ui, sans-serif |
| **Monospace** | JetBrains Mono | 400-500 | ui-monospace, monospace |

```typescript
fontFamily: {
  display: "'Space Grotesk', system-ui, sans-serif",  // Headings
  body: "'Inter', system-ui, sans-serif",             // Body text
  mono: "'JetBrains Mono', ui-monospace, monospace",  // Code, IDs
}
```

### Platform-Specific Rendering

| Platform | Display | Body | Notes |
|----------|---------|------|-------|
| **iOS** | Space Grotesk (bundled) | Inter (bundled) | Use expo-font or custom fonts |
| **Android** | Space Grotesk (bundled) | Inter (bundled) | Use expo-font or custom fonts |
| **Web** | Space Grotesk (Google Fonts) | Inter (Google Fonts) | Load via next/font |

### Monospace Usage

For timestamps, IDs, and code-like content:
```typescript
fontMono: "'JetBrains Mono', ui-monospace, monospace"
```

Use for:
- Report IDs: `#LAP-2026-001234`
- Timestamps: `08:30 WIB`
- Coordinates: `-7.2891, 112.7508`
- Code snippets

---

## Type Scale

Updated for Neo Brutalism 2.0 with Space Grotesk for display text and Inter for body text.

| Name | Size | Line Height | Weight | Font | Usage |
|------|------|-------------|--------|------|-------|
| `display-xl` | 48px | 1.25 (60px) | 800 | Space Grotesk | Hero text |
| `display` | 40px | 1.25 (50px) | 800 | Space Grotesk | Page titles |
| `h1` | 32px | 1.25 (40px) | 700 | Space Grotesk | Section headers |
| `h2` | 26px | 1.25 (33px) | 700 | Space Grotesk | Card titles |
| `h3` | 22px | 1.25 (28px) | 600 | Space Grotesk | Subheadings |
| `h4` | 18px | 1.25 (23px) | 600 | Inter | Minor headings |
| `body-lg` | 18px | 1.5 (27px) | 500 | Inter | Emphasized body |
| `body` | 16px | 1.5 (24px) | 400 | Inter | Default body text |
| `body-sm` | 14px | 1.5 (21px) | 400 | Inter | Secondary text |
| `caption` | 12px | 1.5 (18px) | 400 | Inter | Timestamps, labels |

```typescript
fontSize: {
  displayXl: 48,  // Hero text (Space Grotesk 800)
  display: 40,    // Page titles (Space Grotesk 800)
  h1: 32,         // Section headers (Space Grotesk 700)
  h2: 26,         // Card titles (Space Grotesk 700)
  h3: 22,         // Subheadings (Space Grotesk 600)
  h4: 18,         // Minor headings (Inter 600)
  bodyLg: 18,     // Emphasized body (Inter 500)
  body: 16,       // Default body (Inter 400)
  bodySm: 14,     // Secondary text (Inter 400)
  caption: 12,    // Timestamps, labels (Inter 400)
}
```

---

## Font Weights

Extended weight scale for Neo Brutalism 2.0.

| Weight | Value | Usage |
|--------|-------|-------|
| Light | 300 | Large display text only (optional) |
| Regular | 400 | Body text, labels |
| Medium | 500 | Emphasized body, buttons |
| Semi-Bold | 600 | Subheadings, H3, H4 |
| Bold | 700 | Headings H1, H2 |
| Extra Bold | 800 | Display text, hero headings |

```typescript
fontWeight: {
  light: '300',      // Large display only
  regular: '400',    // Body text
  medium: '500',     // Emphasized body, buttons
  semibold: '600',   // Subheadings
  bold: '700',       // H1, H2
  extrabold: '800',  // Display, hero text
}
```

---

## Line Heights

| Name | Multiplier | Usage |
|------|------------|-------|
| `tight` | 1.2 | Headings, titles |
| `normal` | 1.5 | Body text (default) |
| `relaxed` | 1.75 | Long-form content |

```typescript
lineHeight: {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
}
```

---

## Typography Hierarchy

### Screen Hierarchy Example

```
┌────────────────────────────────────┐
│                                    │
│  Dashboard                   (3xl) │
│  ═══════════════════════════════   │
│                                    │
│  Shift Hari Ini              (2xl) │
│  ──────────────────────────────    │
│                                    │
│  Jam Masuk                    (xl) │
│  08:00 WIB                  (base) │
│  Taman Bungkul               (sm)  │
│                                    │
│  Catatan: Mulai dari pintu    (sm) │
│  utara sebelah parkir.             │
│                                    │
│  Diperbarui: 10:30            (xs) │
│                                    │
└────────────────────────────────────┘
```

### Card Content Hierarchy

```
┌──────────────────────────────┐
│  Laporan #12345        (xs)  │
│                              │
│  Pembersihan Taman     (xl)  │
│  ────────────────────────    │
│                              │
│  Kondisi: Baik        (base) │
│  Area sudah dibersihkan      │
│  dan tanaman disiram.  (sm)  │
│                              │
│  📍 Taman Bungkul      (sm)  │
│  🕐 10:30 WIB          (xs)  │
└──────────────────────────────┘
```

---

## Text Styles

### Headings

```typescript
// Screen Title (3xl)
{
  fontSize: 30,
  fontWeight: '700',
  lineHeight: 38,
  color: colors.textPrimary,
}

// Section Header (2xl)
{
  fontSize: 24,
  fontWeight: '700',
  lineHeight: 32,
  color: colors.textPrimary,
}

// Card Title (xl)
{
  fontSize: 20,
  fontWeight: '600',
  lineHeight: 28,
  color: colors.textPrimary,
}
```

### Body Text

```typescript
// Body Default (base)
{
  fontSize: 16,
  fontWeight: '400',
  lineHeight: 24,
  color: colors.textPrimary,
}

// Body Secondary (sm)
{
  fontSize: 14,
  fontWeight: '400',
  lineHeight: 20,
  color: colors.textSecondary,
}

// Body Emphasized (lg)
{
  fontSize: 18,
  fontWeight: '500',
  lineHeight: 28,
  color: colors.textPrimary,
}
```

### Utility Text

```typescript
// Caption (xs)
{
  fontSize: 12,
  fontWeight: '400',
  lineHeight: 16,
  color: colors.textSecondary,
}

// Label (sm, medium)
{
  fontSize: 14,
  fontWeight: '500',
  lineHeight: 20,
  color: colors.textPrimary,
}

// Button Text (base, medium)
{
  fontSize: 16,
  fontWeight: '500',
  lineHeight: 24,
  color: colors.white,
  textTransform: 'none', // Use sentence case
}
```

---

## Typography Rules

### Capitalization

Use **sentence case** for all UI text (Indonesian convention):

| ✅ Correct | ❌ Incorrect |
|------------|--------------|
| Jam masuk | JAM MASUK |
| Kirim laporan | Kirim Laporan |
| Lihat semua | LIHAT SEMUA |

### Number Formatting

| Type | Format | Example |
|------|--------|---------|
| Time | HH:mm WIB | 08:30 WIB |
| Date | DD MMMM YYYY | 15 Januari 2026 |
| Short Date | DD/MM/YY | 15/01/26 |
| Distance | XX m / XX km | 45 m, 1.2 km |
| Currency | Rp X.XXX | Rp 50.000 |

### Truncation

- Single line: Ellipsis (...) at end
- Multi-line: Limit to 2-3 lines with "Lihat selengkapnya" link
- Never truncate critical information (IDs, timestamps)

```typescript
// Single line truncation
numberOfLines: 1,
ellipsizeMode: 'tail',

// Multi-line truncation
numberOfLines: 3,
ellipsizeMode: 'tail',
```

---

## Responsive Typography

### Mobile Scaling

| Breakpoint | Scale Factor |
|------------|--------------|
| Small (< 375px) | 0.9× base sizes |
| Medium (375-414px) | 1.0× base sizes |
| Large (> 414px) | 1.0× base sizes |

### Dynamic Type Support

Support system accessibility settings:

- **iOS:** Support Dynamic Type scaling
- **Android:** Respect font size accessibility settings
- **Maximum scale:** 1.5× (prevent layout breaking)

```typescript
// React Native
<Text
  style={{ fontSize: 16 }}
  maxFontSizeMultiplier={1.5}
  allowFontScaling={true}
>
  Body text
</Text>
```

---

## Indonesian Language Considerations

SEKAR uses Bahasa Indonesia as the primary language. Indonesian has linguistic characteristics that require specific design considerations.

### Long Word Handling

**Problem:** Indonesian compound words are significantly longer than English equivalents.

**Examples:**

| English | Characters | Indonesian | Characters | Difference |
|---------|-----------|------------|-----------|------------|
| Synced | 6 | Tersinkronisasi | 15 | +150% |
| Maintenance | 11 | Pemeliharaan | 12 | +9% |
| Synchronized | 12 | Disinkronkan | 12 | 0% |
| Work Assignment | 15 | Penugasan Kerja | 15 | 0% |
| Submit Report | 13 | Kirim Laporan | 13 | 0% |

**Design Implications:**

```typescript
// ✅ Allow 20-30% more horizontal space for Indonesian
const buttonWidth = {
  english: 120,
  indonesian: 150,  // 25% wider
};

// ✅ Use multi-line layouts when space constrained
<View style={{ flexDirection: 'column' }}>  {/* Not row */}
  <Text style={styles.label}>Status Sinkronisasi:</Text>
  <Text style={styles.value}>Tersinkronisasi</Text>
</View>

// ✅ Increase button padding to accommodate longer text
<TouchableOpacity style={{
  paddingHorizontal: 24,  // vs 16px for English
  paddingVertical: 12,    // vs 8px for English
}}>
  <Text>Sinkronkan Ulang</Text>
</TouchableOpacity>

// ❌ Avoid: Fixed width containers
<View style={{ width: 100 }}>  {/* Will truncate */}
  <Text>Tersinkronisasi</Text>
</View>

// ✅ Better: Flexible width with max
<View style={{ minWidth: 100, maxWidth: 200, flexShrink: 1 }}>
  <Text numberOfLines={2}>Tersinkronisasi</Text>
</View>
```

---

### Common Abbreviations and Conventions

**Standard Abbreviations:**

| Full Form | Abbreviated | Context | Usage |
|-----------|-------------|---------|-------|
| Nomor | No. | Forms, lists | "No. Telepon", "No. Laporan" |
| Waktu Indonesia Barat | WIB | Timestamps | Always use with time (08:30 WIB) |
| Tidak ada | - | Empty states, null values | Show dash, not empty |
| Kilometer | km | Distance | "2.5 km" (space before unit) |
| Meter | m | Distance | "150 m" (space before unit) |
| Rupiah | Rp | Currency | "Rp 50.000" (space after Rp) |

**Time and Date Formatting:**

```typescript
// ✅ Correct Indonesian time format
const formatTime = (date: Date): string => {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} WIB`;
};
// Output: "08:30 WIB"

// ✅ Correct Indonesian date format
const formatDate = (date: Date): string => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};
// Output: "15 Januari 2026"

// ✅ Short date for space-constrained areas
const formatShortDate = (date: Date): string => {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
};
// Output: "15/01/26"
```

**Distance Formatting:**

```typescript
// ✅ Correct distance formatting with space
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${meters} m`;  // Space before unit
  }
  return `${(meters / 1000).toFixed(1)} km`;  // Space before unit
};
// Output: "150 m" or "2.5 km"

// ❌ Wrong: No space
"150m" // Incorrect
```

---

### Text Truncation Strategy

**What to Truncate:**

| Content Type | Strategy | Max Lines | Ellipsis | Link |
|--------------|----------|-----------|----------|------|
| **Descriptions** | Multi-line | 2-3 lines | Yes | "Lihat selengkapnya" |
| **Addresses** | Single line | 1 line | Yes | Tap to expand |
| **Notes** | Multi-line | 3 lines | Yes | "Baca selengkapnya" |
| **Instructions** | Multi-line | No limit | No | Show all |

**What NEVER to Truncate:**

- ❌ Names (user names, area names)
- ❌ Timestamps (dates, times with WIB)
- ❌ IDs (report IDs, shift IDs)
- ❌ Status labels (short by design)
- ❌ Critical instructions (safety, errors)

**Implementation:**

```tsx
// ✅ Single-line truncation with ellipsis
<Text
  numberOfLines={1}
  ellipsizeMode="tail"
  style={{ fontSize: 16 }}
>
  {longAreaName}
</Text>
// Output: "Taman Bungkul Sektor Utara Zona..."

// ✅ Multi-line truncation with "Lihat selengkapnya"
const [expanded, setExpanded] = useState(false);

<View>
  <Text
    numberOfLines={expanded ? undefined : 3}
    ellipsizeMode="tail"
  >
    {longDescription}
  </Text>
  {!expanded && (
    <TouchableOpacity onPress={() => setExpanded(true)}>
      <Text style={{ color: colors.primary, marginTop: 4 }}>
        Lihat selengkapnya
      </Text>
    </TouchableOpacity>
  )}
</View>

// ✅ Never truncate critical info
<Text style={styles.timestamp}>
  {formatDateTime(clockInTime)}  {/* Always show full: "15 Januari 2026, 08:30 WIB" */}
</Text>
```

---

### Indonesian Typography Patterns

**Sentence Case (Kapitalisasi Kalimat):**

Indonesian conventionally uses sentence case, not title case.

```tsx
// ✅ Correct: Sentence case
"Jam masuk"
"Kirim laporan"
"Lihat semua laporan"
"Status sinkronisasi"

// ❌ Incorrect: Title Case (English convention)
"Jam Masuk"
"Kirim Laporan"
"Lihat Semua Laporan"
"Status Sinkronisasi"

// ❌ Incorrect: ALL CAPS (too aggressive)
"JAM MASUK"
"KIRIM LAPORAN"
```

**Exceptions for Capitalization:**

- ✅ Proper nouns: "Taman Bungkul", "Dinas Lingkungan Hidup"
- ✅ Acronyms: "WIB", "GPS", "SEKAR"
- ✅ First word of sentence: "Laporan berhasil dikirim"
- ❌ Do not capitalize every word (English title case)

**Button Text:**

```tsx
// ✅ Primary actions: Sentence case
<Button>Masuk kerja</Button>
<Button>Kirim laporan</Button>
<Button>Ambil foto</Button>

// ✅ Destructive actions: Sentence case
<Button variant="danger">Hapus laporan</Button>
<Button variant="danger">Keluar</Button>

// ❌ Avoid: ALL CAPS (unless specifically needed for emphasis)
<Button>MASUK KERJA</Button>  // Too aggressive
```

---

### Character Count Guidelines

**Form Labels:**

| Field Type | Max Characters | Example |
|-----------|---------------|---------|
| Short labels | 20 chars | "Nama lengkap" (13) ✅ |
| Medium labels | 30 chars | "Nomor telepon" (14) ✅ |
| Long labels | 50 chars | "Deskripsi kondisi taman" (24) ✅ |

**Button Text:**

| Button Type | Max Characters | Example |
|------------|---------------|---------|
| Primary CTA | 15 chars | "Masuk kerja" (12) ✅ |
| Secondary | 20 chars | "Lihat riwayat" (13) ✅ |
| Icon + text | 10 chars | "Kirim" (5) ✅ |

**Error Messages:**

| Message Type | Max Characters | Example |
|-------------|---------------|---------|
| Inline error | 50 chars | "Nomor telepon harus 10-12 digit" (33) ✅ |
| Modal error | 120 chars | "Gagal mengirim laporan. Periksa koneksi internet dan coba lagi." (65) ✅ |
| Toast message | 60 chars | "Laporan berhasil disimpan" (26) ✅ |

---

### Empty States and Placeholders

**Standard Empty State Messages:**

```tsx
// ✅ Empty list
<Text>Tidak ada laporan hari ini</Text>
<Text>Belum ada shift aktif</Text>
<Text>Belum ada notifikasi</Text>

// ✅ No results
<Text>Tidak ditemukan hasil pencarian</Text>
<Text>Tidak ada data untuk tanggal ini</Text>

// ✅ No data yet (first time use)
<Text>Mulai shift pertama Anda dengan tombol di bawah</Text>
<Text>Belum ada laporan yang dikirim</Text>
```

**Input Placeholders:**

```tsx
// ✅ Helpful, specific placeholders
<TextInput placeholder="Contoh: 081234567890" />  // Phone
<TextInput placeholder="Contoh: Taman dalam kondisi baik" />  // Description
<TextInput placeholder="Masukkan catatan tambahan" />  // Notes

// ❌ Generic, unhelpful
<TextInput placeholder="Input" />
<TextInput placeholder="Isi data" />
```

---

### Localization Checklist

When adding new text content:

- [ ] Use sentence case (not title case)
- [ ] Include "WIB" with all timestamps
- [ ] Use "Rp" with space for currency
- [ ] Use " m" or " km" with space for distance
- [ ] Abbreviate "Nomor" as "No." in labels
- [ ] Use "-" for empty/null values (not "N/A", "None", etc.)
- [ ] Provide 20-30% extra horizontal space for buttons/labels
- [ ] Test with longest expected Indonesian words
- [ ] Never truncate timestamps, IDs, or names
- [ ] Use "Lihat selengkapnya" for expandable text
- [ ] Format dates as "DD MMMM YYYY" (e.g., "15 Januari 2026")
- [ ] Use proper Indonesian month names (not abbreviations)

---

## Best Practices

### Do's

- ✅ Use sentence case for Indonesian text
- ✅ Maintain consistent hierarchy
- ✅ Allow 60-80 characters per line for readability
- ✅ Use sufficient line height (1.5× for body)
- ✅ Support accessibility font scaling

### Don'ts

- ❌ Don't use more than 3 font sizes per screen
- ❌ Don't use all caps except for abbreviations (WIB, GPS)
- ❌ Don't use light font weights (< 400) for body text
- ❌ Don't use justified text alignment
- ❌ Don't disable font scaling for body text

---

## Monitoring Typography

### Status Count Display
| Element | Font | Size | Weight | Color | Usage |
|---------|------|------|--------|-------|-------|
| Status count number | System default | 28px (xl), 24px (lg), 20px (sm) | 700 (bold) | Status color | StatusCard primary number |
| Status label | System default | 12px | 500 (medium) | #374151 | StatusCard label below count |
| Total count | System default | 14px | 600 (semibold) | #111827 | "Total: 200" in header |

### Map Marker Labels
| Element | Font | Size | Weight | Color | Stroke | Max Width |
|---------|------|------|--------|-------|--------|-----------|
| Worker name | System default | 10px | 600 | #FFFFFF | 1px #000000 outline | 80px |
| Area name | System default | 12px | 700 | #1F2937 | 1px #FFFFFF halo | 120px |
| Cluster count | System default | 14px | 700 | #FFFFFF | None | — |

### Staffing Summary
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Area name heading | 16px | 700 | #111827 |
| Active/Required ratio | 14px | 600 | Status-dependent |
| Role breakdown label | 12px | 400 | #6B7280 |
| Role count | 12px | 600 | #374151 |

### Timestamps
| Context | Format | Size | Color | Example |
|---------|--------|------|-------|---------|
| Last seen (recent) | Relative | 11px | #6B7280 | "2 menit lalu" |
| Last seen (>1hr) | Time | 11px | #DC2626 | "08:45 WIB" |
| Location history | Full datetime | 12px | #374151 | "06 Mar 2026, 08:45" |
| Shift time | Time range | 13px | #111827 | "06:00 - 14:00 WIB" |

### Indonesian Monitoring Labels
| English Key | Indonesian Label | Context |
|-------------|-----------------|---------|
| Active | Aktif | Status chip, card |
| Inactive | Tidak Aktif | Status chip, card |
| Outside Area | Di Luar Area | Status chip, card |
| Missing | Hilang | Status chip, card |
| Offline | Offline | Status chip, card |
| Total Workers | Total Pekerja | Summary header |
| Staffing | Kepegawaian | Staffing summary |
| Last Updated | Terakhir Diperbarui | Timestamp label |
| Inside Location | Di dalam lokasi kerja | Home screen banner |
| Outside Area | Di luar area kerja | Home screen banner |

### Map Label Truncation Rules
| Element | Max Characters | Truncation | Example |
|---------|---------------|------------|---------|
| Marker name | 12 | Ellipsis | "Muhammad A..." |
| Location label | 18 | Ellipsis | "Taman Bungkul P..." |
| Popup title | 25 | Ellipsis | "Muhammad Aris Setiaw..." |
| Side panel name | 20 | Ellipsis | "Muhammad Aris Se..." |

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-03-06
**Status:** Active - Updated for Neo Brutalism 2.0 + Phase 2D Monitoring
**Implementation:**
- Mobile: `apps/mobile/src/constants/nbTokens.ts`
- Web: `apps/web/src/app/globals.css`
**Related:** [neo-brutalism.md](neo-brutalism.md) - Primary design system reference
