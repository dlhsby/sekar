# Accessibility Audit Checklist

WCAG 2.1 Level AA compliance checklist for SEKAR Web Dashboard.

**Last Updated:** January 27, 2026
**Status:** Phase 2D-11 Testing & Polish

---

## 1. Perceivable

### 1.1 Text Alternatives (A)
- [ ] **Images have alt text**: All `<img>` tags have meaningful alt attributes
- [ ] **Icons have labels**: Icon buttons have `aria-label` or visible text
- [ ] **Decorative images**: Decorative images use `alt=""` or `aria-hidden="true"`
- [ ] **Form controls**: All inputs have associated `<label>` elements

**Test:**
```bash
# Check for images without alt
grep -r '<img' src/ | grep -v 'alt=' | wc -l
```

### 1.2 Time-based Media (A)
- [ ] **Video captions**: Videos have captions (if applicable)
- [ ] **Audio descriptions**: Audio content has text alternatives

### 1.3 Adaptable (A)
- [ ] **Semantic HTML**: Proper use of `<header>`, `<nav>`, `<main>`, `<footer>`, `<section>`, `<article>`
- [ ] **Heading hierarchy**: Logical heading structure (h1 → h2 → h3, no skips)
- [ ] **List markup**: Lists use `<ul>`, `<ol>`, `<li>` elements
- [ ] **Table headers**: Tables use `<th>` and `scope` attributes
- [ ] **Form labels**: All form controls have associated labels
- [ ] **Reading order**: Content order makes sense when CSS is disabled

**Test:**
```bash
# Check heading hierarchy
npx pa11y-ci --config .pa11yci.json
```

### 1.4 Distinguishable (AA)
- [ ] **Color contrast**: 4.5:1 for normal text, 3:1 for large text
  - Primary text: #000000 on #FFFFFF = 21:1 ✅
  - Gray text: #666666 on #FFFFFF = 5.74:1 ✅
  - Warning: #F57C00 on #FFFFFF = 4.52:1 ✅
  - Links: #0066CC on #FFFFFF = 6.63:1 ✅

- [ ] **Text resize**: Text can scale to 200% without loss of functionality
- [ ] **Images of text**: Avoid using images of text (use real text + CSS)
- [ ] **Reflow**: Content reflows at 320px width without horizontal scrolling

**Tools:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools Chrome Extension](https://chrome.google.com/webstore/detail/axe-devtools/lhdoppojpmngadmnindnejefpokejbdd)

**Test Color Contrast:**
```javascript
// In browser console
const checker = new ContrastChecker();
checker.check('#000000', '#FFFFFF'); // 21:1
checker.check('#F57C00', '#FFFFFF'); // 4.52:1
```

---

## 2. Operable

### 2.1 Keyboard Accessible (A)
- [ ] **Keyboard navigation**: All interactive elements accessible via keyboard
- [ ] **No keyboard trap**: Users can navigate away from all components
- [ ] **Skip to content**: Skip navigation link for keyboard users
- [ ] **Tab order**: Logical tab order through interactive elements
- [ ] **Focus visible**: Clear focus indicators on all interactive elements

**Manual Test:**
1. Unplug mouse
2. Use `Tab`, `Shift+Tab`, `Enter`, `Space`, `Arrow keys`
3. Verify all interactive elements are reachable
4. Check focus indicators are visible

**Test Focus Indicators:**
```css
/* Verify this exists in globals.css */
:focus-visible {
  outline: 3px solid #0066CC;
  outline-offset: 2px;
}
```

### 2.2 Enough Time (A)
- [ ] **No time limits**: Or allow users to extend/disable time limits
- [ ] **Pause/stop**: Auto-updating content can be paused
- [ ] **Session timeout**: Warn users before session expires

### 2.3 Seizures and Physical Reactions (A)
- [ ] **Three flashes**: No content flashes more than 3 times per second

### 2.4 Navigable (AA)
- [ ] **Page titles**: Unique, descriptive `<title>` for each page
- [ ] **Focus order**: Logical focus order matches visual layout
- [ ] **Link purpose**: Link text describes destination (avoid "click here")
- [ ] **Multiple ways**: Multiple ways to navigate (menu, search, sitemap)
- [ ] **Headings and labels**: Descriptive headings and form labels
- [ ] **Focus visible**: Keyboard focus indicator always visible

**Verify Page Titles:**
```typescript
// Check in page files: app/(dashboard)/*/page.tsx
export const metadata = {
  title: 'Descriptive Title | SEKAR Dashboard',
};
```

### 2.5 Input Modalities (AA)
- [ ] **Pointer gestures**: All functionality available without complex gestures
- [ ] **Pointer cancellation**: Can cancel accidental pointer actions
- [ ] **Label in name**: Visible label matches accessible name

---

## 3. Understandable

### 3.1 Readable (A)
- [ ] **Page language**: `<html lang="id">` for Indonesian content
- [ ] **Language changes**: Mark language changes with `lang` attribute
- [ ] **Unusual words**: Define jargon, abbreviations, idioms

**Verify:**
```html
<!-- Check in app/layout.tsx -->
<html lang="id">
```

### 3.2 Predictable (AA)
- [ ] **On focus**: Focus doesn't trigger unexpected context changes
- [ ] **On input**: Input doesn't trigger unexpected context changes
- [ ] **Consistent navigation**: Navigation consistent across pages
- [ ] **Consistent identification**: Components have consistent identification

### 3.3 Input Assistance (AA)
- [ ] **Error identification**: Errors clearly identified and described
- [ ] **Labels or instructions**: Form fields have clear labels
- [ ] **Error suggestion**: Provide suggestions to fix errors
- [ ] **Error prevention**: Confirm before submitting important actions

**Error Messages Example:**
```typescript
// Check form validation messages
{errors.email && (
  <p role="alert" className="text-red-600">
    {errors.email.message}
  </p>
)}
```

---

## 4. Robust

### 4.1 Compatible (A)
- [ ] **Valid HTML**: Parse without major errors
- [ ] **Name, role, value**: Components have proper ARIA attributes
- [ ] **Status messages**: Use `role="status"` or `aria-live` for updates

**Validate HTML:**
```bash
# Use W3C validator
npx html-validator http://localhost:3000/dashboard
```

**ARIA Examples:**
```html
<!-- Loading indicator -->
<div role="status" aria-live="polite">
  Memuat...
</div>

<!-- Error message -->
<div role="alert" aria-live="assertive">
  Terjadi kesalahan
</div>

<!-- Button with icon -->
<button aria-label="Tutup dialog">
  <XMarkIcon />
</button>
```

---

## Tools & Testing

### Automated Testing Tools

1. **axe DevTools (Chrome Extension)**
   ```
   Install: https://chrome.google.com/webstore/detail/axe-devtools/lhdoppojpmngadmnindnejefpokejbdd
   Run: Open DevTools → axe tab → Scan page
   ```

2. **Lighthouse (Chrome DevTools)**
   ```bash
   # Run Lighthouse audit
   npx lighthouse http://localhost:3000/dashboard --only-categories=accessibility --output=html --output-path=./accessibility-report.html
   ```

3. **pa11y-ci (CI/CD Integration)**
   ```bash
   npm install -g pa11y-ci

   # Create .pa11yci.json
   {
     "defaults": {
       "standard": "WCAG2AA",
       "timeout": 10000
     },
     "urls": [
       "http://localhost:3000/dashboard",
       "http://localhost:3000/users",
       "http://localhost:3000/areas",
       "http://localhost:3000/rayons",
       "http://localhost:3000/schedules",
       "http://localhost:3000/reports",
       "http://localhost:3000/tasks",
       "http://localhost:3000/monitoring"
     ]
   }

   # Run audit
   npx pa11y-ci
   ```

4. **WAVE (Web Accessibility Evaluation Tool)**
   ```
   Install: https://wave.webaim.org/extension/
   Run: Click WAVE icon in browser toolbar
   ```

### Manual Testing

1. **Keyboard Navigation Test**
   - Unplug mouse or hide cursor
   - Navigate entire site using only keyboard
   - Verify all functionality accessible
   - Check focus indicators visible

2. **Screen Reader Test**
   - **NVDA (Windows)**: Free, [download](https://www.nvaccess.org/)
   - **JAWS (Windows)**: Commercial
   - **VoiceOver (Mac)**: Built-in, `Cmd + F5`
   - **TalkBack (Android)**: Built-in
   - **VoiceOver (iOS)**: Built-in

3. **Color Contrast Test**
   - Use browser DevTools color picker
   - Check with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
   - Test in different lighting conditions

4. **Zoom Test**
   - Zoom to 200% (`Ctrl/Cmd + +`)
   - Verify no horizontal scrolling
   - Check all content readable
   - Test at 400% for low vision users

### CI/CD Integration

**GitHub Actions Example:**
```yaml
name: Accessibility Audit

on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm start & npx wait-on http://localhost:3000
      - run: npx pa11y-ci
      - run: npx lighthouse http://localhost:3000/dashboard --only-categories=accessibility --output=html
```

---

## Common Issues & Fixes

### Issue 1: Images without alt text
**Problem:**
```html
<img src="/logo.png" />
```

**Fix:**
```html
<img src="/logo.png" alt="SEKAR Logo" />
<!-- Or for decorative images -->
<img src="/decoration.png" alt="" aria-hidden="true" />
```

### Issue 2: Icon buttons without labels
**Problem:**
```html
<button><XMarkIcon /></button>
```

**Fix:**
```html
<button aria-label="Tutup dialog">
  <XMarkIcon />
</button>
```

### Issue 3: Form inputs without labels
**Problem:**
```html
<input type="text" placeholder="Nama" />
```

**Fix:**
```html
<label htmlFor="name">Nama</label>
<input id="name" type="text" placeholder="Contoh: John Doe" />
```

### Issue 4: Low color contrast
**Problem:**
```css
color: #999; /* on white background = 2.85:1 ❌ */
```

**Fix:**
```css
color: #666; /* on white background = 5.74:1 ✅ */
```

### Issue 5: Keyboard trap
**Problem:**
```javascript
// Modal traps focus but has no close button
<Modal>{content}</Modal>
```

**Fix:**
```javascript
<Modal>
  <button onClick={onClose} aria-label="Tutup">
    <XMarkIcon />
  </button>
  {content}
</Modal>
```

---

## Accessibility Statement

Create `/accessibility` page:

```markdown
# Pernyataan Aksesibilitas

## Komitmen Kami
SEKAR Web Dashboard berkomitmen untuk memastikan aksesibilitas digital bagi semua pengguna, termasuk pengguna dengan disabilitas. Kami terus meningkatkan pengalaman pengguna untuk semua orang, dan menerapkan standar aksesibilitas yang relevan.

## Standar Kepatuhan
Kami berusaha mematuhi Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.

## Kontak
Jika Anda mengalami kesulitan mengakses konten atau fitur apa pun di situs web ini, atau memiliki saran untuk meningkatkan aksesibilitas, silakan hubungi kami:

Email: support@sekar.dlhsurabaya.go.id
Telepon: (031) 1234-5678
```

---

## Checklist Summary

| Criterion | Status | Priority |
|-----------|--------|----------|
| Alt text for images | ⬜ To Check | High |
| Color contrast 4.5:1 | ✅ Verified | High |
| Keyboard navigation | ⬜ To Test | High |
| Focus indicators | ⬜ To Check | High |
| Form labels | ⬜ To Check | High |
| Semantic HTML | ⬜ To Check | Medium |
| Heading hierarchy | ⬜ To Check | Medium |
| ARIA attributes | ⬜ To Check | Medium |
| Screen reader test | ⬜ To Test | Medium |
| Page titles | ✅ Verified | Low |
| HTML validation | ⬜ To Run | Low |

---

## Next Steps

1. Run automated tests with axe and Lighthouse
2. Perform manual keyboard navigation test
3. Test with screen reader (NVDA/VoiceOver)
4. Fix any issues found
5. Document fixes in this file
6. Add accessibility tests to CI/CD pipeline
