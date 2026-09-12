# Webvu Specification

## Overall

Webvu is a platform that lets users create their own mini websites for their small businesses. Each user gets a unique slug (e.g. `beardbaker`) and their website is accessible at `beardbaker.webvu.io`. Visitors to that URL see the user's website, not the Webvu product page at `webvu.io`.

Each user website supports six pages:

| Page key | Path | Default title |
|---|---|---|
| `home` | `/` | Home |
| `about` | `/about` | About |
| `products` | `/products` | Products |
| `services` | `/services` | Services |
| `contact` | `/contact` | Contact |
| `order` | `/order` | Order |

Every website also has a configurable **header** (logo, business name, page navigation) and **footer** (social media links) that appear on all pages.

Users build each page by stacking pre-built block components. They can customise the look and feel of their whole website (colours, font, border radius) through a theme editor. The website structure and theme are stored as JSON and rendered dynamically when a visitor browses the slug.

Webvu is free for a trial period, after which an active monthly subscription is required to keep the website published.

---

## Glossary

These terms are used consistently throughout this document. Alternatives listed in brackets must **not** be used.

| Term | Meaning |
|---|---|
| **Website** | A user's mini website as a whole (not: "site", "mini website", "mini site") |
| **Page** | One of the six pages of a website, identified by its `key` |
| **Home page** | The page with key `home` at path `/` (not: "Landing") |
| **Block** | A single pre-built component instance placed on a page |
| **Draft** | The working copy the user edits in the dashboard; not publicly visible |
| **Live** | The last published snapshot; what visitors see |
| **Version** | An immutable snapshot created by publishing |
| **Notification email** | The verified business email that receives form submissions |
| **Product page** | `webvu.io` — the Webvu marketing page (not: "landing page") |

---

## v1 Scope

Everything in this document is in scope for v1 **except** where a section is explicitly marked _Deferred_. Deferred items are recorded so the v1 design does not preclude them, but they are not built.

**In v1:** website rendering, six pages, a 24-component library (see _Component Library_), the Webvu brand design system, per-user theming, draft/publish, version history, Google sign-in, slug onboarding, notification email verification, contact/order submissions with inbox, first-party analytics, support tickets, admin dashboard, Altcha captcha, trial + Stripe subscription billing, Terms and Privacy pages.

Components ship at mixed status. A component whose visual design has not yet been built renders as a labelled placeholder that honours its section settings — this is a legitimate shipped state, not an incomplete one, and the placeholder is publishable. See _Placeholder Rendering_.

**Deferred to a later version:** additional OAuth providers, custom domains, payment collection on behalf of users (order forms capture leads only), team/multi-user accounts, block-level permissions, template marketplace, per-product detail pages, stock management, user-authored HTML, site export.

---

## Domains & Session Model

Webvu serves four classes of host. Because users control the content rendered on `<slug>.webvu.io`, the session design must assume that subdomain is untrusted.

| Host | Trust | Session cookie |
|---|---|---|
| `webvu.io` | first-party | none — the product page is fully static and needs no session |
| `dashboard.webvu.io` | first-party | host-only auth cookie |
| `admin.webvu.io` | first-party | host-only auth cookie (separate from dashboard) |
| `<slug>.webvu.io` | **user content** | never receives a cookie; the renderer must never emit `Set-Cookie` |

**Rules:**

1. **No cookie is ever scoped to `.webvu.io`.** Auth cookies are host-only (`Domain` attribute omitted), `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. A cookie set on `dashboard.webvu.io` is therefore unreadable from any user website.
2. The OAuth callback is handled per-surface: `dashboard.webvu.io/auth/callback` and `admin.webvu.io/auth/callback` each set their own cookie. The `webvu.io` `Login` and `Start Creating` buttons both redirect straight into the Google flow with the dashboard callback as the return target.
3. Rendered user websites are served with a strict `Content-Security-Policy` (no inline scripts beyond the theme `<style>` tag, no third-party script sources). User-supplied content is treated as plain text — see _Content Sanitisation_.
4. The product page shows a static header regardless of auth state; it does not attempt to detect whether the visitor is signed in.

_Hardening option (deferred):_ moving user websites to a separate registrable domain (e.g. `<slug>.webvu.site`) would place them outside the `webvu.io` cookie origin entirely. The v1 rules above are sufficient given users cannot author scripts, but this remains the stronger long-term posture.

**Token lifetimes:**

| Token | Lifetime | Storage |
|---|---|---|
| Access JWT | 15 minutes | host-only cookie |
| Refresh token | 30 days, rotating | host-only cookie, `Path=/auth` |

Refresh tokens are single-use and rotated on every refresh; reuse of a consumed refresh token revokes the whole token family and forces re-authentication. `POST /auth/logout` clears both cookies and revokes the refresh token family.

JWT payload:
```json
{ "sub": "<userId>", "email": "...", "role": "user", "iat": 0, "exp": 0 }
```

---

## UI

### Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Component Library**: Shadcn/ui
- **Styling**: Tailwind CSS v4 — theme is declared in CSS via `@theme`, not a `tailwind.config.js`
- **Theming**: CSS variables (Shadcn's built-in token system)
- **Drag and drop**: `dnd-kit`
- **Charts**: Recharts
- **Design tokens**: CSS custom properties in three tiers, consumed by Tailwind (see _Webvu Design System_)

### Routing

Next.js middleware detects subdomains and rewrites requests transparently:

- `webvu.io` → `src/app/page.tsx` (Webvu product page)
- `dashboard.webvu.io` → `src/app/dashboard/*`
- `admin.webvu.io` → `src/app/admin/*`
- `beardbaker.webvu.io` → `src/app/sites/[slug]/[[...path]]/page.tsx` (user's website)

```
middleware.ts
src/app/
  page.tsx                             ← webvu.io product page
  terms/page.tsx
  privacy/page.tsx
  sites/
    [slug]/
      [[...path]]/
        page.tsx                       ← user website catch-all (SSR)
        not-found.tsx                  ← unknown page path on a valid slug
    not-found.tsx                      ← unknown or unavailable slug
  dashboard/
  admin/
  _components/
    site-renderer/
      ThemeInjector.tsx                ← injects CSS variables from theme JSON
      BlockRenderer.tsx                ← resolves block type → component via the registry
      SectionWrapper.tsx               ← applies shared section settings to every block
      PlaceholderBlock.tsx             ← rendered for any component not yet built
      registry.ts                      ← the component catalogue
      blocks/                          ← one file per implemented component
      SiteHeader.tsx                   ← rendered from header config on every page
      SiteFooter.tsx                   ← rendered from footer config on every page
```

Middleware resolves the slug from the leftmost label of the `Host` header. Labels in the reserved list (see _Slug Rules_) are never treated as slugs.

### Webvu Design System

Webvu's own surfaces — the product page, the dashboard, and the admin dashboard — have a brand theme of their own, entirely separate from the themes users pick for their websites.

The brand is expected to change. It is therefore defined so that **a rebrand is a one-file edit**, not a search across components.

#### Two theming systems

| | Webvu brand theme | User website theme |
|---|---|---|
| Applies to | `webvu.io`, `dashboard.webvu.io`, `admin.webvu.io` | `<slug>.webvu.io` and the editor preview |
| Defined by | Webvu, in the codebase | The user, in the Theme Editor |
| Changes | On a rebrand | Whenever the user saves |
| Delivered as | Static CSS custom properties | `<style>` tag injected per request by `ThemeInjector` |
| Variable prefix | `--wv-*` | Shadcn's unprefixed names (`--primary`, `--background`, …) |

**Isolation rule:** user theme variables are only ever set inside an **iframe document** — the editor preview and the version preview. They are never written into the dashboard document. This is what stops a user's colours leaking into Webvu's chrome, and it is why the preview is an iframe rather than an inline render. The two systems consequently cannot collide even though both are CSS custom properties.

#### Three tiers

```
tier 1  primitives   raw palette and scales, the only place a literal colour appears
tier 2  semantic     role names — what a colour is FOR, not what it looks like
tier 3  component    the few cases needing their own knob, always derived from tier 2
```

Components reference **tier 2 only**. A component never names a primitive, and never contains a literal colour, size, or duration.

```
webvu-ui/src/styles/
  brand.ts             ← the one file a rebrand edits
  primitives.css       ← generated from brand.ts
  semantic.light.css   ← role → primitive mapping
  semantic.dark.css    ← the same roles, mapped differently (deferred, see below)
  theme.css            ← Tailwind v4 @theme block exposing semantic tokens as utilities
  tokens.d.ts          ← generated union type of valid token names
```

Tailwind v4 declares its theme in CSS rather than a JS config, which fits this structure rather than fighting it. `theme.css` contains a single `@theme` block mapping semantic tokens into Tailwind's namespaces, so `bg-surface-raised` and `text-muted` resolve while nothing else does:

```css
@import "tailwindcss";
@import "./primitives.css";
@import "./semantic.light.css";

@theme {
  --color-*: initial;              /* drop Tailwind's entire default palette */
  --color-surface:        var(--wv-surface);
  --color-surface-raised: var(--wv-surface-raised);
  --color-action:         var(--wv-action);
  --color-danger:         var(--wv-danger);
  /* …one entry per semantic colour token */
  --radius-*: initial;
  --radius-md: var(--wv-radius-md);
}
```

`--color-*: initial` is what removes the stock palette: after it, `bg-blue-500` generates no CSS at all.

Note what that does **not** do on its own — the class is simply ignored, so an off-brand utility fails *silently* and the element renders unstyled rather than wrong. Catching it is the lint rule's job, not Tailwind's; the two are complementary and the lint rule is what makes the failure loud.

`brand.ts` holds the source values — brand hue, accent hue, neutral temperature, font stacks, radius scale, spacing base. `primitives.css` and `tokens.d.ts` are generated from it by a build step; neither is edited by hand.

#### Current brand values

These live in `brand.ts` and are expected to change. Nothing else in the codebase repeats them.

| Role | Value | |
|---|---|---|
| Brand | `174 72% 26%` | deep teal |
| Brand hover | `174 72% 21%` | |
| Accent | `38 91% 55%` | amber, used sparingly for emphasis and trial/billing notices |
| Neutral ramp | warm-tinted grey, 50 → 900 | `stone`-like rather than blue-grey |
| Success | `142 71% 45%` | |
| Warning | `32 95% 44%` | |
| Danger | `0 72% 51%` | |
| Info | `199 89% 48%` | |

The brand is deliberately distinct from the default user theme (violet `262 83% 58%`) so a website preview never blends into the chrome around it.

#### Semantic tokens

The names components actually use. This list is the contract; adding to it is a considered change, and changing what one maps to is how the product gets restyled.

**Surface and text**
`--wv-surface`, `--wv-surface-raised`, `--wv-surface-sunken`, `--wv-surface-inverse`, `--wv-surface-admin`, `--wv-text`, `--wv-text-muted`, `--wv-text-subtle`, `--wv-text-inverse`, `--wv-text-on-brand`

**Interactive**
`--wv-action`, `--wv-action-hover`, `--wv-action-active`, `--wv-action-subtle`, `--wv-action-text`, `--wv-focus-ring`

**Lines and feedback**
`--wv-border`, `--wv-border-strong`, `--wv-success`, `--wv-warning`, `--wv-danger`, `--wv-info`, each with a `-surface` variant for banner backgrounds

**Non-colour**
`--wv-font-sans`, `--wv-font-display`, `--wv-text-xs … --wv-text-4xl`, `--wv-space-1 … --wv-space-16`, `--wv-radius-sm|md|lg|full`, `--wv-shadow-sm|md|lg`, `--wv-duration-fast|base|slow`, `--wv-ease`

Motion tokens resolve to `0ms` under `prefers-reduced-motion: reduce`, set once at the token layer so no component handles it individually.

`--wv-surface-admin` is what makes the admin dashboard visibly not the user dashboard: admin chrome carries a distinct surface treatment so an internal user can never mistake which surface they are on.

#### Enforcement

Discipline here is what keeps the rebrand cheap, so it is enforced rather than documented:

- Tailwind's default colour palette is **cleared** in the `@theme` block, so `bg-blue-500` resolves to nothing. This alone is silent, which is why the lint rule below is not optional
- A lint rule fails the build on a literal colour (`#`, `rgb(`, `hsl(`) in any file under `src/` other than `brand.ts`
- A lint rule fails the build on a `--wv-*` name absent from `tokens.d.ts`, catching typos and stale tokens
- Shadcn components are vendored once and their variables mapped to `--wv-*` at install time; the mapping lives with the component, not scattered through call sites

#### Rebranding procedure

1. Edit `brand.ts`.
2. Run the token build; `primitives.css` and `tokens.d.ts` regenerate.
3. Replace the logo, wordmark, favicon, and OG images (the only brand assets not derived from tokens).
4. Review the visual snapshot diff, which will be large by design — that diff *is* the review.

No component file should appear in step 4's diff. If one does, it contained something it should not have.

#### Dark mode

v1 ships **light only** on all Webvu surfaces. The three-tier structure is what makes this safe to defer: dark mode is a second `semantic.*.css` mapping of the same role names, plus a toggle and a `data-theme` attribute on the root element. No component changes.

One design task is deliberately deferred with it: in the editor, a user's light-themed website previewed inside dark chrome reads as a bright rectangle floating in a dark frame, which makes judging their own colours harder. Adding dark mode means designing the mat and scrim around the preview iframe, not just mapping tokens.

### Per-User Theming

The user's saved theme JSON is injected as CSS variables at render time. Because Shadcn/ui uses the same variable names internally, all components automatically reflect the user's brand. These are the unprefixed Shadcn names and are only ever set inside the rendered website document — see the isolation rule in _Webvu Design System_.

**Theme JSON shape:**
```json
{
  "background":   "0 0% 100%",
  "foreground":   "222 47% 11%",
  "primaryColor": "262 83% 58%",
  "accentColor":  "30 100% 50%",
  "mutedColor":   "210 40% 96%",
  "fontFamily":   "Inter",
  "borderRadius": "0.5rem"
}
```

All colour values are HSL triplets without the `hsl()` wrapper, as Shadcn expects. Every field is required; the API rejects a theme with unknown or missing keys.

**ThemeInjector** renders a single `<style>` tag mapping these values to CSS variables (`--background`, `--foreground`, `--primary`, `--accent`, `--muted`, `--radius`, `--font-sans`) that Tailwind and Shadcn consume. Derived tokens (`--primary-foreground`, `--accent-foreground`, `--muted-foreground`, `--border`, `--ring`) are computed from the five base colours at render time so the user never has to pick them.

**Fonts** are limited to a curated list of Google Fonts, self-hosted via `next/font` and bundled at build time. No request is made to `fonts.googleapis.com` at render time. The curated list for v1: Inter, Poppins, Lora, Playfair Display, Source Sans 3, Merriweather, DM Sans, Space Grotesk.

**Contrast validation:** the theme editor computes the WCAG contrast ratio of foreground-on-background and of the derived `--primary-foreground` on `--primary`. A ratio below 4.5:1 shows an inline warning. The warning does not block saving — it is the user's website — but it must be visible.

### Website JSON Structure

The full website (theme + header + footer + pages + blocks) is stored as JSON in the backend. The renderer fetches the **live** snapshot; the dashboard fetches the **draft**.

```json
{
  "slug": "beardbaker",
  "name": "Beard Baker",
  "theme": { "...": "see Theme JSON shape" },
  "header": {
    "logoUrl": "https://cdn.webvu.io/assets/…/logo.png",
    "businessName": "Beard Baker"
  },
  "footer": {
    "socialLinks": [
      { "platform": "instagram", "url": "https://instagram.com/beardbaker" },
      { "platform": "facebook",  "url": "https://facebook.com/beardbaker" },
      { "platform": "x",         "url": "https://x.com/beardbaker" },
      { "platform": "tiktok",    "url": "https://tiktok.com/@beardbaker" }
    ]
  },
  "pages": [
    {
      "key": "home",
      "path": "/",
      "title": "Home",
      "enabled": true,
      "seo": {
        "metaTitle": "Beard Baker — Handcrafted Beard Care",
        "metaDescription": "Natural beard oils and balms, handmade in Leeds.",
        "ogImageUrl": "https://cdn.webvu.io/assets/…/og.png"
      },
      "blocks": [
        {
          "id": "b1",
          "type": "hero",
          "section": {
            "background": "image",
            "backgroundImageUrl": "https://cdn.webvu.io/assets/…/hero-bg.jpg",
            "overlayOpacity": 40,
            "padding": "lg",
            "width": "full",
            "anchorId": null,
            "hidden": false
          },
          "props": {
            "variant": "centred",
            "headline": "Fresh Beard Care",
            "subheadline": "Handcrafted grooming products",
            "ctaText": "Shop Now",
            "ctaLink": "/products",
            "imageUrl": null
          }
        },
        {
          "id": "b2",
          "type": "feature-grid",
          "section": {
            "background": "muted",
            "backgroundImageUrl": null,
            "overlayOpacity": 0,
            "padding": "md",
            "width": "contained",
            "anchorId": "why-us",
            "hidden": false
          },
          "props": {
            "variant": "three-column",
            "title": "Why Choose Us",
            "items": [
              { "id": "f1", "title": "Natural ingredients", "description": "No parabens." },
              { "id": "f2", "title": "Free shipping",       "description": "On orders over £30." },
              { "id": "f3", "title": "30-day returns",      "description": "No questions asked." }
            ]
          }
        }
      ]
    }
  ]
}
```

**Page object rules:**

- `key` is one of the six fixed keys and is immutable. Pages cannot be created or deleted, only enabled or disabled.
- `path` is derived from `key` and is not user-editable in v1.
- `title` is user-editable and is what appears in header navigation.
- `enabled: false` removes the page from header navigation and makes its path return 404 on the live website. The `home` page cannot be disabled; the API rejects the attempt with `400`.
- The `pages` array order determines header navigation order. Order is user-editable in the dashboard sidebar.
- `seo` is optional per page. When `metaTitle` is absent the renderer falls back to `"{page.title} — {header.businessName}"`; when `metaDescription` is absent the tag is omitted.
- `blocks` is the page's stack, in render order. Every block shares the contract described in _Component Library_.

**Footer platforms:** `instagram`, `facebook`, `x`, `tiktok`, `linkedin`, `youtube`. Only platforms with a non-empty URL are rendered. Each URL must be `https://` and its host must match the platform's known host list, otherwise the API rejects it with `400`.

### Component Library

A page is a **stack** of components rendered top to bottom. The catalogue below is fixed for v1; the visual design of each component is specified and built one component at a time (see _Component Build-Out_).

#### The block contract

Every block, of every type, has the same shape. This is fixed now and does not change as components are built out.

```json
{
  "id": "b7",
  "type": "testimonials",
  "section": {
    "background": "muted",
    "backgroundImageUrl": null,
    "overlayOpacity": 0,
    "padding": "lg",
    "width": "contained",
    "anchorId": "reviews",
    "hidden": false
  },
  "props": { }
}
```

- `id` — stable, generated when the block is inserted. Used as the drag key, as the anchor for duplication, and as the target of the `order-form` → `product-grid` reference. Unique within a page.
- `type` — a key in the component registry.
- `section` — shared layout settings, present on **every** block regardless of type. See below.
- `props` — component-specific content. Its schema is defined per component.

#### Section settings

`section` is what makes a stack of blocks read as a designed page rather than a uniform pile of cards: alternating bands, a full-bleed call to action, a tighter or looser vertical rhythm. It is edited in the **Layout** tab of the config panel and is identical for every component.

| Field | Values | Notes |
|---|---|---|
| `background` | `none` \| `muted` \| `accent` \| `dark` \| `image` | Resolved against the user's theme tokens, so every option stays on-brand |
| `backgroundImageUrl` | asset URL or `null` | Used only when `background: image` |
| `overlayOpacity` | 0–80 | Dark overlay percentage over the background image, so text stays legible |
| `padding` | `sm` \| `md` \| `lg` | Vertical padding; maps to a fixed scale, not free numbers |
| `width` | `contained` \| `wide` \| `full` | Content width. `full` is edge-to-edge |
| `anchorId` | slug or `null` | Lets a CTA elsewhere on the page link to `#pricing` |
| `hidden` | boolean | Kept in the draft, excluded at publish. Lets a user park a section without deleting it |

Consecutive blocks that both resolve to the same background are rendered with a single merged band and the padding collapsed, so two adjacent `none` sections do not produce a double gap.

#### Validation staging

The registry carries a `status` per component: `placeholder` or `implemented`.

- `section` is validated strictly on **every** block, always.
- `props` is validated strictly only for components with `status: implemented`. For a `placeholder` component, `props` is accepted as any object.

Promoting a component therefore turns on its validation with no change to the validation code. This is the single rule governing when prop validation applies; _Validation Rules_ refers back to it rather than restating it.

#### The catalogue

24 components in seven categories.

**Headers**

| Key | Label | Purpose |
|---|---|---|
| `hero` | Hero | The opening statement — headline, supporting line, primary action, optional image |
| `page-header` | Page Header | Compact title band for interior pages |

**Content**

| Key | Label | Purpose |
|---|---|---|
| `rich-text` | Text | A heading and body copy |
| `media-text` | Media & Text | Image or video beside text; the alternating "zig-zag" row |
| `image` | Image | One image with optional caption |
| `gallery` | Gallery | A grid of images |
| `video` | Video | An embedded video |

**Proof**

| Key | Label | Purpose |
|---|---|---|
| `feature-grid` | Features | Icon + title + description cards |
| `stats` | Stats | Two to four large numbers with labels |
| `testimonials` | Testimonials | Customer quotes with attribution |
| `logo-strip` | Logos | A row of client, partner, or stockist marks |

**Explain**

| Key | Label | Purpose |
|---|---|---|
| `steps` | How It Works | Numbered process steps |
| `faq` | FAQ | Question and answer accordion |
| `team-grid` | Team | People cards — photo, name, role |

**Commerce**

| Key | Label | Purpose |
|---|---|---|
| `product-grid` | Products | The product catalogue as cards |
| `product-spotlight` | Featured Product | One product given a full section |
| `services-list` | Services | Services with price and duration |
| `pricing-tiers` | Pricing | Two to four plan columns with feature lists |

**Action**

| Key | Label | Purpose |
|---|---|---|
| `cta-banner` | Call to Action | Headline plus buttons on a contrasting band |
| `contact-form` | Contact Form | Visitor enquiry form, delivered to the Inbox |
| `order-form` | Order Form | Visitor order enquiry, delivered to the Inbox |
| `contact-details` | Contact Details | Phone, email, address, opening hours |
| `map` | Map | Location, rendered as a static map that links out |

**Layout**

| Key | Label | Purpose |
|---|---|---|
| `spacer-divider` | Spacer | Blank space or a horizontal rule |

#### Variants, not more components

Layout alternatives — a hero that is centred vs split vs background-image, a feature grid at two, three, or four columns — are a `props.variant` field **within** a component, never separate catalogue entries. This keeps the picker at 24 tiles and keeps a user's choice of layout revisable without rebuilding the block. Which variants each component offers is decided during its own build-out.

#### Availability

Every component is placeable on every page. The picker shows a **Recommended for this page** group first, then the seven categories. There is no server-side allow-list: a user who wants a contact form on their Home page should get one.

| Page | Recommended group |
|---|---|
| Home | `hero`, `feature-grid`, `product-grid`, `services-list`, `testimonials`, `stats`, `media-text`, `logo-strip`, `faq`, `cta-banner` |
| About | `page-header`, `media-text`, `rich-text`, `team-grid`, `stats`, `gallery`, `testimonials`, `cta-banner` |
| Products | `page-header`, `product-grid`, `product-spotlight`, `media-text`, `faq`, `cta-banner` |
| Services | `page-header`, `services-list`, `pricing-tiers`, `steps`, `feature-grid`, `testimonials`, `faq`, `cta-banner` |
| Contact | `page-header`, `contact-form`, `contact-details`, `map`, `faq` |
| Order | `page-header`, `order-form`, `product-grid`, `steps`, `rich-text`, `contact-details` |

---

### Placeholder Rendering

`BlockRenderer` resolves `type` through the registry. When the component's `status` is `placeholder`, it renders `PlaceholderBlock` instead.

`PlaceholderBlock` renders a real section that **honours the block's `section` settings** — correct background, padding, and width, themed with the user's own colours — containing a dashed outline, the component's label, and `props.placeholderNote` if the user typed one. Its height is deliberately plausible for the component it stands in for, so a page of placeholders already shows the page's rhythm.

- On the **live** website a placeholder renders the same way. A page of placeholders is publishable: it looks unfinished, not broken, and it exercises the entire draft → publish → render path before any component is designed.
- In the **editor**, a placeholder block additionally carries a "Not yet available" badge on its card.
- The config panel for a placeholder shows the Layout and Advanced tabs plus a single **Note** field bound to `props.placeholderNote`.

An unknown `type` — one removed from the registry — renders nothing and logs a warning. It must never break the page.

---

### Component Build-Out

Each of the 24 components is an independent unit of work. The frame — contract, registry, stack editor, placeholder — does not change. For one component:

1. Design the section and decide its variants.
2. Define its props schema as Zod in the shared package, and add its table to _Specified Component Schemas_ below.
3. Build the React component under `_components/site-renderer/blocks/`.
4. Build its **Content** tab fields in the config panel, driven by the schema.
5. Give it `defaultProps`, used when the block is inserted from the picker.
6. Add visual snapshots at mobile and desktop widths, in two contrasting themes.
7. Flip its registry entry from `placeholder` to `implemented`, which is what turns on server-side prop validation.

**Promotion is backward-compatible.** Blocks of that type already sitting in drafts and versions carry `props` that predate the schema. On promotion, `defaultProps` are merged *under* the stored props at read time, so an existing placeholder block becomes a valid, empty instance of the real component rather than a validation failure. Published versions are snapshots and are never rewritten, so this merge happens in the renderer, not in a database migration.

**Suggested order**, most structural value first: `hero`, `rich-text`, `media-text`, `feature-grid`, `cta-banner`, `product-grid`, `services-list`, `contact-form`, `order-form`, then the remainder.

---

### Specified Component Schemas

Schemas below are already specified and ready for their build-out; they shorten step 2 for those components. Every component not listed here has no schema yet and is a `placeholder`.

Common rules: every string field has a maximum length; every `*Url` field must be an absolute `https://` URL; every repeated item carries a stable `id` used as its drag-and-drop key. `variant` is always required and always constrained to a fixed set.

#### `hero`
| Field | Type | Required | Limit |
|---|---|---|---|
| `variant` | enum | yes | `centred`, `split-left`, `split-right`, `background` |
| `headline` | string | yes | 120 chars |
| `subheadline` | string | no | 240 chars |
| `ctaText` | string | no | 40 chars |
| `ctaLink` | string | no | internal path, `#anchor`, or `https://` URL |
| `imageUrl` | string | no | asset URL; used by the `split-*` variants |

#### `feature-grid`
| Field | Type | Required | Limit |
|---|---|---|---|
| `variant` | enum | yes | `two-column`, `three-column`, `four-column` |
| `title` | string | no | 120 chars |
| `items[]` | array | yes | 1–12 items |
| `items[].id` | string | yes | |
| `items[].title` | string | yes | 80 chars |
| `items[].description` | string | no | 240 chars |
| `items[].iconName` | string | no | name from the Lucide icon set |

#### `media-text`
| Field | Type | Required | Limit |
|---|---|---|---|
| `variant` | enum | yes | `image-left`, `image-right` |
| `title` | string | no | 120 chars |
| `body` | string | yes | 4000 chars, plain text, newlines preserved |
| `imageUrl` | string | no | asset URL |
| `ctaText` | string | no | 40 chars |
| `ctaLink` | string | no | internal path, `#anchor`, or `https://` URL |

#### `product-grid`
| Field | Type | Required | Limit |
|---|---|---|---|
| `variant` | enum | yes | `two-column`, `three-column`, `four-column` |
| `title` | string | no | 120 chars |
| `items[]` | array | yes | 1–60 items |
| `items[].id` | string | yes | stable id, referenced by order-form line items |
| `items[].name` | string | yes | 100 chars |
| `items[].description` | string | no | 500 chars |
| `items[].price` | string | no | decimal string, e.g. `"24.00"` |
| `items[].currency` | string | no | ISO 4217, defaults to the website currency |
| `items[].imageUrl` | string | no | asset URL |
| `items[].available` | boolean | no | defaults `true`; unavailable items render greyed and are not selectable on the order form |

#### `services-list`
| Field | Type | Required | Limit |
|---|---|---|---|
| `variant` | enum | yes | `rows`, `cards` |
| `title` | string | no | 120 chars |
| `items[]` | array | yes | 1–40 items |
| `items[].id` | string | yes | |
| `items[].name` | string | yes | 100 chars |
| `items[].description` | string | no | 500 chars |
| `items[].price` | string | no | decimal string |
| `items[].currency` | string | no | ISO 4217 |
| `items[].duration` | string | no | free text, e.g. `"45 min"` |

#### `contact-form`
| Field | Type | Required | Limit |
|---|---|---|---|
| `title` | string | no | 120 chars |
| `description` | string | no | 500 chars |
| `submitLabel` | string | no | 40 chars, defaults to `"Send"` |

The form always collects: visitor name, visitor email, optional phone, and message. There is **no** `email` prop — submissions are always delivered to the website's verified notification email. Allowing a per-block address would route mail to an unverified destination.

#### `order-form`
| Field | Type | Required | Limit |
|---|---|---|---|
| `title` | string | no | 120 chars |
| `description` | string | no | 500 chars |
| `sourceBlockId` | string | no | `id` of a `product-grid` block on any enabled page, whose items become the selectable line items; when absent the form renders a free-text order description only |
| `collectAddress` | boolean | no | defaults `true` |
| `submitLabel` | string | no | 40 chars, defaults to `"Place order"` |

The form always collects: visitor name, visitor email, optional phone, optional delivery address (if `collectAddress`), selected line items with quantities (if `sourceBlockId` resolves), and an optional note.

A `sourceBlockId` that no longer resolves — the referenced block was deleted, or its page disabled — degrades to the free-text form and raises a warning in the editor. It does not block publishing.

**Order forms do not take payment.** They capture an order enquiry which is emailed to the business owner, who fulfils and collects payment off-platform. This is reflected in the Terms of Service.

### Content Sanitisation

All block content is **plain text**. The renderer never interprets user content as HTML or Markdown — it is passed to React as a text child, which escapes it. Despite its name, the `rich-text` component is plain text with a heading; it does not accept markup. Placeholder notes are treated identically.

URL fields are validated on save (scheme must be `https:`) and again at render time; a URL that fails validation at render time is dropped rather than emitted. `ctaLink` additionally permits a leading `/` internal path, which must resolve to one of the six page paths.

Uploaded images are served from a dedicated asset host, not from `<slug>.webvu.io`, so an uploaded file can never execute in the website's origin. Uploads are re-encoded server-side (see _Assets_), which strips any embedded payload and EXIF data.

### Component Registry

The registry is the single source of truth for the catalogue. `BlockRenderer` resolves a block's `type` through it; so do the block picker, the config panel, and server-side validation.

```ts
type ComponentEntry = {
  label:            string          // shown in the picker and on the block card
  category:         Category        // headers | content | proof | explain | commerce | action | layout
  status:           'placeholder' | 'implemented'
  component:        React.FC | null // null while status is 'placeholder'
  propsSchema:      ZodSchema | null
  defaultProps:     object
  defaultSection:   Partial<SectionSettings>
  recommendedPages: PageKey[]
  summarise:        (props) => string   // one-line content summary for the block card
}

const REGISTRY: Record<BlockType, ComponentEntry> = { /* 24 entries */ }
```

Resolution order in `BlockRenderer`:

1. `type` not in the registry → render nothing, log a warning. Never break the page.
2. `section.hidden` is true and this is a live render → render nothing.
3. `status: placeholder` → render `PlaceholderBlock`.
4. Otherwise render the component, wrapped in `SectionWrapper`.

`SectionWrapper` applies `section` for every block, including placeholders, so no component implements its own background or padding. `defaultSection` lets a component ship a sensible default — `cta-banner` defaults to `background: accent`, `hero` to `width: full` — which the user can then change.

Adding a component to the catalogue means adding one registry entry. Building it out means filling in `component`, `propsSchema`, and `defaultProps`, and flipping `status`.

### Data Flow

```
Browser → beardbaker.webvu.io/products
  → Next.js middleware rewrites to /sites/beardbaker/products
  → SSR page fetches GET /websites/beardbaker (live snapshot) from NestJS API
  → API returns website JSON (theme + header + footer + pages)
  → ThemeInjector injects CSS variables
  → BlockRenderer renders blocks for the /products page
  → renderer fires POST /analytics/visit (fire-and-forget, does not block the response)
  → HTML returned to browser (SEO-friendly)
```

### Rendering, Caching & Performance

- Rendered pages are cached at three layers: CloudFront at the edge (`s-maxage=300, stale-while-revalidate=86400`), the Next.js data cache tagged `website:<slug>`, and a Redis snapshot cache in front of Postgres.
- Publishing (or suspending, or unpublishing) deletes the Redis key, calls `revalidateTag('website:<slug>')`, and issues a CloudFront invalidation for `/*` on that subdomain. A published change is live within 5 seconds.
- CloudFront caches on the full host, so one user's invalidation never evicts another user's pages.
- The analytics write never blocks rendering: the renderer fires the visit event without awaiting it, and a failed analytics write is logged and swallowed.
- A failed `GET /websites/:slug` (API down, timeout) serves the last good cached snapshot if one exists; otherwise it renders the generic error page. It must never render a partial or unthemed page.

### SEO

- Per-page `<title>` and `<meta name="description">` come from the page's `seo` object with the fallbacks described above.
- Open Graph and Twitter Card tags are emitted from `seo.ogImageUrl`, the page title, and the description.
- `<link rel="canonical">` points at the page's absolute URL on the user's subdomain.
- `<slug>.webvu.io/sitemap.xml` is generated from the enabled pages of the live snapshot.
- `<slug>.webvu.io/robots.txt` allows all crawling for a published website and returns `Disallow: /` for a suspended or unpublished one.
- Favicon falls back to the Webvu default when the user has not uploaded a logo; when they have, the logo asset is resized to favicon dimensions.
- `dashboard.webvu.io` and `admin.webvu.io` serve `Disallow: /` and send `X-Robots-Tag: noindex`.

### Error & Empty States

| Situation | Response | What the visitor or user sees |
|---|---|---|
| Unknown slug | `404` | Generic Webvu "website not found" page with a link to `webvu.io` |
| Slug exists but never published | `404` | Same as above — an unpublished website is indistinguishable from a missing one |
| Slug exists but subscription lapsed | `404` with `X-Webvu-Reason: suspended` | "This website is currently unavailable" page; the header is not rendered |
| Valid slug, unknown or disabled page path | `404` | Website's own header and footer, themed, with a "page not found" message and navigation |
| API unreachable, no cached snapshot | `503` | Generic Webvu error page, `Retry-After: 30` |
| Dashboard: no blocks on a page | — | Empty-state card: "This page has no blocks yet" + **Add Block** |
| Dashboard: empty inbox | — | "No submissions yet" with a line explaining that contact and order forms deliver here |
| Dashboard: analytics with no data | — | Chart axes rendered with a "No visits recorded in this period" overlay |
| Dashboard: no versions yet | — | "Publish your website to create your first version" |
| Dashboard: no support tickets | — | "No tickets" + **Create Ticket** |
| Admin: no tickets in tab | — | Per-tab empty state naming the tab |
| Concurrent edit detected | `409` | "This website was changed in another tab" with **Reload** / **Overwrite** |

The dashboard uses optimistic-concurrency on draft saves: `PATCH /websites/me` sends the `draftUpdatedAt` it last read, and the API returns `409` if the stored value is newer.

---

### webvu.io — Product Page

The public-facing marketing page at `webvu.io`. Fully static, no session, no personalisation. Contains a fixed header with anchor links to sections on the page and two CTAs.

**Header:**
- Logo / brand name on the left
- Anchor links to page sections on the right (Features, How It Works, Pricing)
- **`Login`** button — starts the Google OAuth flow
- **`Start Creating`** button — starts the same Google OAuth flow

Both buttons are identical in behaviour; they differ only in label and styling. On success the user lands on `dashboard.webvu.io`.

**Page sections (scrollable):**
- Hero — headline, subheadline, `Start Creating` CTA
- Features — what you get (six pages, blocks, theming, custom URL, inbox, analytics)
- How It Works — 3-step explainer (sign up → build → share your link)
- Pricing — free trial length, monthly price, what is included, what happens when the trial ends
- Footer — links to Terms of Service and Privacy Policy

---

## Authentication

All users (regular, support, admin) authenticate via **Google OAuth only** in v1 — there is no email/password option. On first login a `User` row is created with `role = user`.

Admin and support roles are set manually in the database as a one-time bootstrap step during deployment. There is no UI or API to promote a user to admin, and no self-registration path for admin accounts.

**Flow:**

1. User clicks `Login` or `Start Creating` on `webvu.io`, or navigates directly to `dashboard.webvu.io` while unauthenticated.
2. Browser is redirected to Google with `redirect_uri = https://dashboard.webvu.io/auth/callback` (or `https://admin.webvu.io/auth/callback` for the admin surface) and a signed, single-use `state` parameter.
3. Google redirects back with a code. The Next.js route handler exchanges it via `POST /auth/google`, receives the access and refresh tokens, and sets them as host-only cookies on that surface.
4. The user is redirected to the dashboard root, or to the `returnTo` path encoded in `state` when present. `returnTo` is validated to be a same-host absolute path; anything else is discarded.

**Role routing:** the JWT carries a `role` claim. `dashboard.webvu.io` is available to all roles. `admin.webvu.io` returns `403` for `role = user`; within it, Platform Overview requires `role = admin` and the ticket inbox accepts `admin` or `support`.

**Future provider extensibility:** the `User` entity uses a separate `OAuthAccount` child table (provider + providerId) rather than storing `googleId` directly on `User`. This allows a single user account to be linked to multiple providers without schema changes. Adding a provider requires a new Passport strategy and a button on the login screen — no entity changes.

If a Google login returns an email that already exists on a `User` with no matching `OAuthAccount` row, the new `OAuthAccount` is linked to that existing user, because Google has verified the address. Providers that do not verify email addresses must not be linked automatically when they are added later.

---

## dashboard.webvu.io — Builder Dashboard

Served under the `dashboard` subdomain. Middleware rewrites `dashboard.webvu.io/*` to the dashboard route tree. All routes require authentication.

### Slug Creation (first-time flow)

The dashboard determines onboarding state from `GET /websites/me`, which returns `404` when the user has no website. In that case a **modal dialog** is shown immediately on dashboard load. The modal is non-dismissible — the user must create a slug before proceeding.

**Step 1 — Slug & business email:**
- Input field for the slug, with the rules below
- Real-time availability check (debounced 400 ms, `GET /slug/check/:slug`)
- Email field — defaults to the Google account email but can be overridden
- This email is the **notification email**: all order and contact form submissions from the user's live website are delivered here
- Business name field — pre-fills the website `name` and the header `businessName`
- **Terms of Service checkbox** — required. Label reads: _"I agree to the [Terms of Service](https://webvu.io/terms) and [Privacy Policy](https://webvu.io/privacy)"_
- **Altcha captcha widget** at the bottom of the form — must be solved before submission is enabled

**Step 2 — Email verification:**
- A 6-digit verification code is sent to the provided email
- User enters the code in the modal
- On success: the website is created from the starter template, the email is marked verified, the trial clock starts, the modal closes
- Resend available after a 60-second cooldown, maximum 5 resends per hour

A slug is reserved for the user as soon as Step 1 succeeds, so it cannot be taken while they are reading their email. If verification is not completed within 24 hours the reservation lapses and the slug returns to the available pool.

### Slug Rules

- 3–30 characters, lowercase `a–z`, `0–9`, and hyphens
- Must start and end with an alphanumeric character; no consecutive hyphens
- Must not be in the reserved list
- Unique across all websites, compared case-insensitively

**Reserved slugs** (rejected by `GET /slug/check/:slug` and `POST /slug`):

```
www, api, app, admin, dashboard, mail, smtp, imap, pop, ftp, cdn, assets,
static, media, img, images, files, download, downloads, blog, docs, help,
support, status, about, terms, privacy, legal, security, login, logout,
signup, signin, register, auth, oauth, account, accounts, billing, pay,
payments, checkout, stripe, webhook, webhooks, test, staging, dev, demo,
preview, beta, alpha, internal, system, root, webvu, ns1, ns2, mx, email,
autodiscover, _domainkey, dmarc, analytics, metrics, monitor
```

The list lives in one constant in the API and is exercised by a test that asserts every DNS label Webvu itself uses is present.

**Slug immutability:** a slug cannot be changed after creation in v1. Changing it would break every link the user has shared and every inbound search result. A user who needs a different slug raises a support ticket; an admin performs the change manually in the database, and the old slug is retired rather than released.

### Main Dashboard

After website creation (or on return visits) the user sees the main dashboard.

**Sidebar / top nav:**
- Website name + slug, with a link that opens `<slug>.webvu.io` in a new tab
- Publish status indicator: **Published**, **Unpublished changes**, or **Never published**
- **Publish** button (see _Draft & Publish_)
- Page list — the six pages, each with an enable/disable toggle; drag to reorder navigation
- Header & Footer Editor link
- Inbox link (with unread count badge)
- Analytics link
- Theme Editor link
- Version History link
- Billing link (shows days remaining during the trial)
- Settings link
- Support link

### Starter Template

A newly created website is not empty. It is seeded from a fixed starter template so the user has something to edit and something worth publishing immediately:

| Page | Seeded stack | State |
|---|---|---|
| Home | `hero`, `feature-grid`, `product-grid`, `testimonials`, `cta-banner` | enabled |
| About | `page-header`, `media-text`, `stats` | enabled |
| Products | `page-header`, `product-grid` | enabled |
| Services | `page-header`, `services-list`, `steps` | enabled |
| Contact | `page-header`, `contact-form`, `contact-details` | enabled |
| Order | `page-header`, `order-form` (`sourceBlockId` pointing at the Products grid) | disabled |

Seeded blocks alternate `section.background` between `none` and `muted` so a freshly created website already reads as a designed page rather than a flat column. Placeholder copy is clearly generic (e.g. "Your headline here") so an unedited publish is obviously a template rather than broken.

Components in the stack that have not yet been built render as placeholders — the template is written against the catalogue, not against what happens to be implemented, so it does not need revising as components land.

The theme is seeded with the Webvu default palette and Inter. The starter template is versioned in the codebase; changing it affects new websites only.

### Stack Editor (centre panel)

Opened when the user selects a page from the nav. The page is a **stack**: a vertical list of block cards in render order, built by adding components downward.

**The stack.** Each block is a card showing the component label, a one-line summary of its content (from the registry's `summarise`), and a drag handle. A placeholder component's card also carries a "Not yet available" badge. Hidden blocks render dimmed with a struck-through label.

**Adding.** An **Add block** button sits at the bottom of the stack — the primary path, appending downward. A hairline **+** also appears between any two cards on hover, inserting at that position. Both open the same picker: a modal of labelled tiles showing **Recommended for this page** first, then the seven categories, with a search field. Inserting a block applies the component's `defaultProps` and `defaultSection`.

**Selecting.** Clicking a card selects it, scrolls the preview to it and highlights it there, and opens the config panel. Exactly one block is selected at a time.

**Reordering.** Drag by the handle (`dnd-kit`), or use **Move up** / **Move down** on the selected card. `↑` / `↓` moves the selection; `Alt+↑` / `Alt+↓` moves the selected block. The buttons are the primary path on touch, where dragging a long list is unpleasant, and are the accessible alternative to dragging.

**Per-block actions.** Duplicate (inserts a copy directly below with a fresh `id`), Hide (toggles `section.hidden`), Delete (with an undo toast).

**Limits.** A page holds a maximum of 30 blocks.

### Block Config Panel (right sidebar)

Three tabs for the selected block:

- **Content** — fields generated from the component's props schema. Repeated items (features, products, services, testimonials) are reorderable sublists with add and remove controls. For a component still at `placeholder` status this tab holds a single **Note** field, so the user can record what the section is for
- **Layout** — the shared `section` settings: background, background image and overlay, padding, width
- **Advanced** — `anchorId`, and the block `id` shown read-only so it can be referenced by an `order-form`

Changes update the local draft in real time and re-render the preview. **Save** persists the draft via `PATCH /websites/me`; saving does **not** make changes public. Validation errors are shown inline against the offending field.

### Preview

The editor renders a live preview in an iframe pointed at `dashboard.webvu.io/preview/[page]`, which renders the **draft** snapshot through exactly the same renderer components as the live website. The preview route requires authentication and sends `X-Robots-Tag: noindex`. Viewport toggles for desktop, tablet, and mobile widths are available above the preview.

### Theme Editor

- Colour pickers for: Background, Foreground, Primary, Accent, Muted
- Font family selector from the curated Google Fonts list
- Border radius slider (0–1.5 rem)
- Contrast warnings as described in _Per-User Theming_
- Live preview via CSS variable injection in the preview iframe
- **Save** persists to the draft

### Header & Footer Editor (`dashboard.webvu.io/site-config`)

*Header config:*
- Logo upload (see _Assets_)
- Business name field, pre-filled from the website name
- Enabled pages are automatically listed as navigation links — no manual configuration; order follows the page list order in the sidebar

*Footer config:*
- One URL input per supported platform: Instagram, Facebook, X, TikTok, LinkedIn, YouTube
- Only platforms with a URL entered appear in the rendered footer
- **Save** persists header and footer to the draft

### Settings (`dashboard.webvu.io/settings`)

- Website name
- Notification email — changing it triggers re-verification of the new address; the old address keeps receiving notifications until the new one is verified
- Website currency (ISO 4217), used as the default for product and service prices
- **Unpublish website** — takes the live website offline (404) without deleting anything; can be re-published at any time
- **Delete account** — see _Account Deletion & Data Retention_

### Draft & Publish

Editing and publishing are separate. The dashboard always edits a draft; visitors always see the last published snapshot.

```
PATCH /websites/me            → writes draftTheme / draftHeader / draftFooter / draftPages
POST  /websites/me/publish    → copies draft over live, creates a WebsiteVersion, purges cache
```

- **Save** (in any editor) writes the draft. Nothing public changes.
- **Publish** promotes the entire draft — theme, header, footer, and all pages — as one atomic snapshot, and creates exactly one `WebsiteVersion` row.
- The sidebar shows **Unpublished changes** whenever `draftUpdatedAt > publishedAt`.
- Publishing is blocked, with an explanatory message and a link to Billing, when the trial has expired and there is no active subscription.
- Publishing validates the whole draft against the block schemas. A draft that fails validation cannot be published, and the failing block and field are named.

### Versioning

Every publish stores an immutable snapshot of the full website JSON.

- Versions are timestamped and listed in **Version History**
- Each version can be **previewed** at `dashboard.webvu.io/history/[id]` through the normal renderer
- A version can be **reverted** to: its snapshot is copied into the draft, then published, which creates a *new* version. Revert is therefore non-destructive and always additive
- The live website always serves the most recent version
- **Retention:** the 50 most recent versions are kept, plus any version published in the last 90 days regardless of count. Older versions are pruned by a nightly job. The currently-live version is never pruned

### Notifications (v1)

When a visitor submits a form on the user's live website, the backend emails the user's verified notification email:

- **Contact form submission** — visitor name, email, phone, message
- **Order form submission** — visitor details, delivery address, line items with quantities, note

Both emails link to the submission in the inbox. Delivery failures are retried three times with exponential backoff; a permanently failed notification is recorded on the submission and surfaced as a warning in the inbox — the submission itself is never lost because the email failed.

Contact and order form blocks on live websites both include an **Altcha captcha widget** that must be solved before the form can be submitted. The payload is verified server-side before the submission is stored or the email is sent.

### Inbox

Accessible from `dashboard.webvu.io/inbox`.

**Submission list:**
- Each item shows: type (Contact / Order), visitor name, date received, and current status
- Unread items are visually highlighted
- Filterable by type (All / Contact / Order) and by status
- Sortable by date
- Paginated, 25 per page

**Submission detail:**
- Clicking an item opens the full submission content
- Opening an item transitions status from **Unread** to **Read** — but only the first time, and only if the status is still `unread`, so a manual status is never overwritten by a re-read

**Status tags** — the user can manually set the status of any submission:

| Status | Meaning |
|---|---|
| `Unread` | Received, not yet opened |
| `Read` | Opened but no action taken |
| `In Progress` | Being acted on |
| `Completed` | Fulfilled / resolved |
| `Cancelled` | Dismissed / irrelevant |

- Status can be changed from both the list view (inline) and the detail view
- The sidebar badge counts items with `Unread` status only, via `GET /submissions/unread-count`

### Analytics

Accessible from `dashboard.webvu.io/analytics`. Shows visit data for the user's live website.

**Time range selector:** Last 7 days, Last 30 days, Last 90 days, custom range. The maximum queryable range is 365 days.

**Site-wide summary:** total visits in the period, unique visitors, most visited page.

**Timeline chart:** line chart of daily visit count over the range, with toggleable overlay lines per page.

**Per-page breakdown (table below the chart):** one row per enabled page — Home, About, Products, Services, Contact, Order — with columns Page, Visits, % of total. Clicking a row filters the timeline to that page. Pages that are currently disabled but have visits in the period are still listed, marked *(disabled)*, so historical traffic is not silently dropped.

**Measurement rules:**
- Visits are recorded server-side by the SSR renderer. No third-party analytics scripts are injected into user websites.
- Days are bucketed in **UTC**. The selected range is interpreted in UTC and this is stated in the UI.
- A **unique visitor** is a distinct `visitorHash` within the selected period, where `visitorHash = SHA-256(dailySalt + clientIp + userAgent)` truncated to 16 bytes. The salt rotates daily and previous salts are discarded, so a visitor cannot be tracked across days and no raw IP address is ever stored.
- Requests whose user agent matches the bot pattern list, and requests to non-page assets, are not recorded.
- Visits to the dashboard preview and to version previews are never recorded.

### Billing (`dashboard.webvu.io/billing`)

See the _Billing & Subscriptions_ section for the full model. The billing page shows:

- Current state: **Trial** (with days remaining), **Active**, **Past due**, or **Cancelled**
- Trial end date, or next renewal date and amount
- **Subscribe** button → Stripe Checkout (during trial or after cancellation)
- **Manage billing** button → Stripe Customer Portal (payment method, invoices, cancellation)
- A persistent banner appears across the whole dashboard when the trial has 7 or fewer days remaining, or when the subscription is past due

### Support

Accessible from `dashboard.webvu.io/support`. Allows users to raise and track support tickets.

**Ticket list:** all tickets raised by the user, each row showing title, date created, last updated, and status. Filterable by status.

**Ticket statuses:**

| Status | Meaning |
|---|---|
| `Open` | Submitted, awaiting response |
| `In Progress` | Being looked at by support |
| `Resolved` | Issue addressed |
| `Closed` | Ticket closed (no further action) |

**Create Ticket:** a button at the top of the list opens a form with Title (short summary) and Description (full explanation). On submit the ticket is created with `Open` status and appears at the top of the list.

**Ticket detail:** shows the full description and the reply thread in chronological order, labelled by author type (You / Webvu Support). The user can **add a reply** to an open or in-progress ticket; replying to a `resolved` ticket reopens it as `in_progress`. Replying to a `closed` ticket is not permitted — the UI offers to create a new ticket instead.

Users cannot set ticket status directly in v1; status is controlled by the support team, with the one exception of the reopen-on-reply rule above. The user is emailed when support replies and when a ticket is marked `resolved` or `closed`.

### Account Deletion & Data Retention

**Deletion** is initiated from Settings, confirmed by typing the slug, and is irreversible. On confirmation:

1. Any active Stripe subscription is cancelled immediately.
2. The website is unpublished; the slug is retired, not returned to the available pool.
3. A 14-day grace window begins, during which the user can restore the account by signing in again. The website is not publicly reachable during this window.
4. After 14 days a job hard-deletes the `User`, `OAuthAccount`, `Website`, `WebsiteVersion`, `Submission`, and `Asset` rows, purges uploaded assets from object storage, and anonymises `SupportTicket` and `SupportTicketReply` rows by nulling `userId` and redacting personal content. `PageVisit` rows are already anonymous and are dropped with the website.

**Export** is available from Settings at any time: `GET /websites/me/export` returns a JSON file containing the draft, the live snapshot, all versions, and all submissions. This is the Privacy Policy's data-portability mechanism.

**Retention schedule:**

| Data | Retention |
|---|---|
| `PageVisit` | 400 days, then pruned nightly |
| `Submission` | Life of the website, then deleted with the account |
| `WebsiteVersion` | Last 50, plus anything published in the last 90 days |
| Refresh tokens | 30 days, or until revoked |
| Verification codes | 15 minutes |
| Altcha solved-payload records | 10 minutes |
| Support tickets | 2 years after closure, then anonymised |
| Application logs | 30 days |

---

### Routing Summary

| URL | Destination |
|---|---|
| `webvu.io` | Product page |
| `webvu.io/terms` | Terms of Service |
| `webvu.io/privacy` | Privacy Policy |
| `dashboard.webvu.io` | Builder dashboard (authenticated) |
| `dashboard.webvu.io/auth/callback` | Google OAuth callback — sets session cookies |
| `dashboard.webvu.io/editor/[page]` | Page editor for a specific page |
| `dashboard.webvu.io/preview/[page]` | Draft preview rendered in the editor iframe |
| `dashboard.webvu.io/theme` | Theme editor |
| `dashboard.webvu.io/site-config` | Header & footer editor |
| `dashboard.webvu.io/history` | Version history |
| `dashboard.webvu.io/history/[id]` | Preview of a specific version |
| `dashboard.webvu.io/inbox` | Contact & order submissions inbox |
| `dashboard.webvu.io/inbox/[id]` | Individual submission detail |
| `dashboard.webvu.io/analytics` | Website & page visit analytics |
| `dashboard.webvu.io/billing` | Subscription & invoices |
| `dashboard.webvu.io/settings` | Website settings, notification email, account deletion |
| `dashboard.webvu.io/support` | Support ticket list |
| `dashboard.webvu.io/support/new` | Create new support ticket |
| `dashboard.webvu.io/support/[id]` | Support ticket detail & reply |
| `admin.webvu.io` | Admin dashboard — platform overview (Admin role) |
| `admin.webvu.io/auth/callback` | Google OAuth callback for the admin surface |
| `admin.webvu.io/sites/[slug]` | Read-only analytics detail for one website (Admin role) |
| `admin.webvu.io/support` | Support ticket inbox (Admin + Support roles) |
| `admin.webvu.io/support/[id]` | Support ticket detail & reply |
| `<slug>.webvu.io` | User's live website (public) |
| `<slug>.webvu.io/[page-path]` | Specific page on the user's live website |
| `<slug>.webvu.io/sitemap.xml` | Generated sitemap for the live website |
| `<slug>.webvu.io/robots.txt` | Generated robots file for the live website |

---

## Admin

### admin.webvu.io — Internal Dashboard

Served under the `admin` subdomain. Accessible to Webvu internal users only. There are two roles:

| Role | Access |
|---|---|
| `Admin` | Platform analytics + support ticket inbox + reassignment |
| `Support` | Support ticket inbox only |

Authentication uses the same Google OAuth flow as the user-facing app; the role is set internally and admin accounts cannot be self-registered. `role = user` receives `403` on every admin route, both in the UI and at the API.

### Admin Role — Platform Overview

Accessible at `admin.webvu.io`. Visible to `Admin` role only.

**Summary stats:**
- Total registered users
- Total active websites (at least one visit in the last 30 days)
- Total visits across all websites today / this week / this month
- Subscription breakdown: trialing, active, past due, cancelled

**Time range selector:** Last 7 days, Last 30 days, Last 90 days, custom range.

**Platform-wide timeline chart:** daily total visits across all websites over the selected period.

**Top 10 websites (table):** Rank, Slug, Owner, Total Visits (in period), Pages enabled, Subscription status. Sortable by visits. Clicking a row opens `admin.webvu.io/sites/[slug]` — a **read-only** view of that website's analytics, backed by `GET /admin/stats/sites/:slug/analytics`. Admins see traffic figures only; they do not see submission contents, which are the business owner's customer data.

### Support Role — Ticket Inbox

Accessible at `admin.webvu.io/support`. Visible to both `Admin` and `Support` roles.

**Tabs:**
- **Unassigned** — all open tickets not yet assigned
- **Mine** — tickets assigned to the logged-in support user
- **All** — every ticket regardless of assignment

**Ticket list columns:** Ticket ID, User (slug + email), Title, Created, Last Updated, Status, Assigned To.

**Filterable by:** Status, Assigned To.

**Permissions by role:**

| Action | Support | Admin |
|---|---|---|
| View Unassigned / Mine | ✅ | ✅ |
| View All tab | ✅ read-only | ✅ |
| Assign to self | ✅ any unassigned ticket | ✅ |
| Reply | ✅ own assigned tickets | ✅ any ticket |
| Change status | ✅ own assigned tickets | ✅ any ticket |
| Reassign to another agent | ❌ | ✅ |

"Read-only on the All tab" means a Support user may open any ticket but may only reply to or change the status of tickets assigned to them. The API enforces this, not just the UI.

**Ticket detail (`admin.webvu.io/support/[id]`):**
- Original title and description submitted by the user
- Thread-style reply panel showing user and support replies in chronological order
- Support user types a response and submits; the user sees it at `dashboard.webvu.io/support/[id]` and is emailed
- Status can be moved to `In Progress`, `Resolved`, or `Closed`
- Marking `Resolved` or `Closed` emails the user

---

## Billing & Subscriptions

Webvu is free to try and then requires a monthly subscription to keep the website published.

### Model

- On successful email verification the website enters **trial**. `trialEndsAt = now + 30 days`.
- During the trial every feature is available, including publishing.
- When the trial ends, an active subscription is required for the website to remain publicly reachable.
- Subscription is a single plan, billed monthly through **Stripe**. The price is configuration, not code; the product page and billing page read it from the API.

### States

| State | Meaning | Live website | Dashboard |
|---|---|---|---|
| `trialing` | Within the trial window | Served | Full access |
| `active` | Paid and current | Served | Full access |
| `past_due` | Payment failed, inside the 7-day grace window | Served | Full access + banner |
| `unpaid` | Grace window elapsed | **Suspended (404)** | Read-only + Billing |
| `cancelled` | User cancelled, period ended | **Suspended (404)** | Read-only + Billing |
| `trial_expired` | Trial ended, never subscribed | **Suspended (404)** | Read-only + Billing |

**Read-only** means the user can view their content, inbox, analytics, version history, and support tickets, and can export their data, but cannot save drafts or publish. Nothing is deleted on suspension; resubscribing restores the previous live snapshot immediately.

### Flow

1. User clicks **Subscribe** → API creates a Stripe Checkout Session → browser is redirected to Stripe.
2. On completion Stripe redirects back to `dashboard.webvu.io/billing?status=success`. The UI does **not** trust this redirect as proof of payment — it polls `GET /billing/subscription` until the webhook has landed.
3. Stripe webhooks are the source of truth for subscription state. Every webhook is signature-verified and its event id recorded so redelivery is idempotent.
4. **Manage billing** opens a Stripe Customer Portal session for payment method changes, invoices, and cancellation.

**Webhooks consumed:** `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.

Webvu stores no card data. The only Stripe identifiers held are the customer id and subscription id.

### Reminder emails

| When | Email |
|---|---|
| 7 days before trial end | "Your trial ends in a week" |
| 1 day before trial end | "Your trial ends tomorrow" |
| On trial expiry | "Your website has been taken offline" |
| On payment failure | "We couldn't take payment" + grace window end date |
| On suspension | "Your website has been taken offline" |
| On resubscribe | "Your website is live again" |

---

## Legal

Webvu must publish a **Terms of Service** and a **Privacy Policy** before launch, hosted at `webvu.io/terms` and `webvu.io/privacy`.

**Recommended generator:** [getterms.io/terms-and-conditions-generator](https://getterms.io/terms-and-conditions-generator) — drafts lawyer-reviewed documents, covers GDPR/CCPA, free tier available.

**Key clauses the Terms of Service must include:**

| Clause | Purpose |
|---|---|
| User content responsibility | User is solely responsible for all content published on their website |
| No liability for user content | Webvu is not liable for any content, claims, or legal actions arising from a user's website |
| No liability for transactions | Webvu is not liable for any orders, payments, or disputes between a user and their customers. Order forms capture enquiries only; Webvu never processes payment between a user and their customers |
| Platform provided "as is" | Webvu makes no warranties of uptime, fitness for purpose, or error-free operation |
| Limitation of liability | Webvu's total liability is limited to the amount paid by the user in the preceding 12 months |
| Subscription and trial terms | Trial length, monthly billing, renewal, cancellation, and that a website is taken offline when the subscription lapses |
| Refunds | Stated refund position for partial months |
| Prohibited content | Users must not publish illegal, defamatory, infringing, or harmful content |
| Termination | Webvu reserves the right to suspend or terminate accounts that violate the terms |
| Data handling on termination | What happens to content and customer submissions after account closure, matching the retention schedule |
| Governing law | Specify applicable jurisdiction |

**The Privacy Policy must additionally describe:** what is collected from website visitors (the anonymised `visitorHash`, page path, timestamp), that no third-party analytics or tracking cookies are used on user websites, how submission data is handled and for how long, and the export and deletion mechanisms.

**Acceptance is recorded at slug creation:** `POST /slug` stores a `termsAcceptedAt` timestamp on the `Website` entity when the user submits the form with the checkbox checked. The API rejects the request with `400` if `termsAccepted: true` is not present in the body. Material changes to the Terms require re-acceptance, recorded as a new `termsAcceptedAt`.

---

## API

### Tech Stack

- **Framework**: NestJS
- **ORM**: TypeORM (`@nestjs/typeorm`), migration-based schema management (`synchronize: false` in every environment)
- **Database**: PostgreSQL 16 on Amazon RDS — the system of record for everything except cached and ephemeral state
- **Auth**: Passport.js — Google OAuth strategy only; JWT access tokens + rotating refresh tokens
- **Email**: **Resend** — transactional email for verification codes, submission notifications, billing reminders, and ticket updates. Sending is wrapped in a `MailService` so the provider can be swapped without touching callers
- **Payments**: Stripe (Checkout + Customer Portal + webhooks)
- **Object storage**: Amazon S3, served through CloudFront at `cdn.webvu.io`. The bucket is private; CloudFront reads it via Origin Access Control and is the only public path to an object
- **Cache & ephemeral state**: Redis on Amazon ElastiCache — see _Redis usage_
- **Validation**: Zod schemas defined once in `packages/shared` and imported by both the API and the UI
- **Background jobs**: BullMQ on Redis — email sending, analytics roll-ups, version pruning, retention jobs, trial reminders

#### Redis usage

Redis holds only state that can be lost without data loss. Anything durable lives in Postgres.

| Use | Notes |
|---|---|
| Website snapshot cache | `GET /websites/:slug` results, keyed by slug, invalidated on publish, unpublish, and suspension. Absorbs the CloudFront miss path so a cold edge does not hit Postgres |
| Rate limiting | `@nestjs/throttler` counters |
| BullMQ queues | Job payloads and scheduling |
| Altcha challenges | Issued and consumed challenge records, 10-minute TTL |
| Analytics daily salt | The rotating salt behind `visitorHash`, never persisted |

Losing Redis entirely degrades performance and forces re-issued captcha challenges and re-queued jobs. It never loses a website, a submission, or a version.

---

### Entities

#### `User`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | varchar unique | primary email from first OAuth login |
| `displayName` | varchar | from OAuth provider profile |
| `avatarUrl` | varchar nullable | from OAuth provider profile |
| `role` | enum: `user`, `admin`, `support` | default `user`; `admin`/`support` set via DB bootstrap |
| `deletionRequestedAt` | timestamp nullable | starts the 14-day deletion grace window |
| `createdAt` | timestamp | |

OAuth provider linkage is stored in `OAuthAccount`, not on this entity, so future providers need no schema change.

#### `OAuthAccount`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → User | |
| `provider` | varchar | e.g. `google`, `microsoft`, `facebook` |
| `providerId` | varchar | subject ID from the provider |
| `createdAt` | timestamp | |

Unique constraint on `(provider, providerId)`.

#### `RefreshToken`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → User | |
| `tokenHash` | varchar | SHA-256 of the token; the raw value is never stored |
| `familyId` | uuid | rotation family; reuse of a consumed token revokes the family |
| `consumedAt` | timestamp nullable | |
| `expiresAt` | timestamp | |
| `createdAt` | timestamp | |

#### `Website`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | varchar unique | lowercase; unique index on `lower(slug)` |
| `name` | varchar | business display name |
| `currency` | varchar(3) | ISO 4217, default `GBP` |
| `notificationEmail` | varchar | business email for notifications |
| `notificationEmailVerified` | boolean | default `false` |
| `pendingNotificationEmail` | varchar nullable | set during an email change, promoted on verification |
| `termsAcceptedAt` | timestamp nullable | set at slug creation |
| `theme` | jsonb | **live** theme |
| `header` | jsonb | **live** header config |
| `footer` | jsonb | **live** footer config |
| `pages` | jsonb | **live** pages + blocks |
| `draftTheme` | jsonb | working copy |
| `draftHeader` | jsonb | working copy |
| `draftFooter` | jsonb | working copy |
| `draftPages` | jsonb | working copy |
| `draftUpdatedAt` | timestamp | used for optimistic concurrency on save |
| `publishedAt` | timestamp nullable | null until first publish; nulled by unpublish |
| `unpublishedByUser` | boolean | default `false`; distinguishes a deliberate unpublish from a billing suspension |
| `trialEndsAt` | timestamp | set when the notification email is verified |
| `subscriptionStatus` | enum: `trialing`, `active`, `past_due`, `unpaid`, `cancelled`, `trial_expired` | |
| `stripeCustomerId` | varchar nullable | |
| `stripeSubscriptionId` | varchar nullable | |
| `currentPeriodEnd` | timestamp nullable | |
| `ownerId` | uuid FK → User | unique — one website per user in v1 |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

A website is publicly served only when `publishedAt IS NOT NULL`, `unpublishedByUser = false`, `notificationEmailVerified = true`, and `subscriptionStatus` is one of `trialing`, `active`, `past_due`.

#### `SlugReservation`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | varchar unique | held while the user verifies their email |
| `userId` | uuid FK → User | |
| `expiresAt` | timestamp | 24 hours after creation |

#### `EmailVerification`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → User | |
| `email` | varchar | address the code was sent to |
| `codeHash` | varchar | bcrypt hash of the 6-digit code |
| `attempts` | int | default 0; 5 failures invalidate the code |
| `consumedAt` | timestamp nullable | |
| `expiresAt` | timestamp | 15 minutes after issue |
| `createdAt` | timestamp | |

#### `WebsiteVersion`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `websiteId` | uuid FK → Website | |
| `theme` | jsonb | snapshot at publish time |
| `header` | jsonb | snapshot at publish time |
| `footer` | jsonb | snapshot at publish time |
| `pages` | jsonb | snapshot at publish time |
| `publishedById` | uuid FK → User | |
| `revertedFromVersionId` | uuid nullable | set when the publish came from a revert |
| `createdAt` | timestamp | version timestamp |

#### `Asset`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `websiteId` | uuid FK → Website | |
| `kind` | enum: `logo`, `image` | |
| `storageKey` | varchar | object storage key |
| `url` | varchar | public CDN URL |
| `mimeType` | varchar | after re-encoding |
| `width` / `height` | int | |
| `sizeBytes` | int | |
| `createdAt` | timestamp | |

#### `Submission`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `websiteId` | uuid FK → Website | |
| `type` | enum: `contact`, `order` | |
| `visitorName` | varchar | denormalised from `data` for list rendering and sorting |
| `visitorEmail` | varchar | denormalised from `data` |
| `data` | jsonb | full submitted payload, shape per type below |
| `status` | enum: `unread`, `read`, `in_progress`, `completed`, `cancelled` | default `unread` |
| `notificationSentAt` | timestamp nullable | |
| `notificationFailed` | boolean | default `false`; surfaced as a warning in the inbox |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**`data` shape — `contact`:**
```json
{ "name": "...", "email": "...", "phone": "...", "message": "..." }
```

**`data` shape — `order`:**
```json
{
  "name": "...", "email": "...", "phone": "...",
  "address": { "line1": "...", "line2": "...", "city": "...", "postcode": "...", "country": "..." },
  "items": [ { "productId": "p1", "name": "Beard Oil", "price": "24.00", "quantity": 2 } ],
  "currency": "GBP",
  "note": "..."
}
```

Item `name` and `price` are copied from the product at submission time, so the record of what was ordered survives later edits to the catalogue.

#### `PageVisit`
| Column | Type | Notes |
|---|---|---|
| `id` | bigserial PK | |
| `websiteId` | uuid FK → Website | |
| `pagePath` | varchar | e.g. `/products` |
| `visitorHash` | bytea(16) | daily-salted hash of IP + user agent; no raw IP is stored |
| `visitedAt` | timestamp | UTC |

Indexed on `(websiteId, visitedAt)` and `(websiteId, pagePath, visitedAt)`.

#### `PageVisitDaily`
| Column | Type | Notes |
|---|---|---|
| `websiteId` | uuid FK → Website | |
| `pagePath` | varchar | |
| `day` | date | UTC day |
| `visits` | int | |
| `uniqueVisitors` | int | distinct `visitorHash` that day |

Primary key `(websiteId, pagePath, day)`. Rolled up hourly by a background job and used for all ranges older than the current day, so analytics queries never scan raw rows for long ranges.

#### `SupportTicket`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → User nullable | ticket author; nulled on account anonymisation |
| `title` | varchar | 120 chars |
| `description` | text | 5000 chars |
| `status` | enum: `open`, `in_progress`, `resolved`, `closed` | default `open` |
| `assignedToId` | uuid FK → User nullable | must have role `admin` or `support` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

#### `SupportTicketReply`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `ticketId` | uuid FK → SupportTicket | |
| `authorId` | uuid FK → User nullable | may be the ticket author or a support agent |
| `authorRole` | enum: `user`, `support` | recorded at write time so the thread renders correctly after anonymisation |
| `body` | text | 5000 chars |
| `createdAt` | timestamp | |

#### `CaptchaChallenge`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `salt` | varchar unique | challenge salt, used as the replay key |
| `consumedAt` | timestamp nullable | set on first successful verification |
| `expiresAt` | timestamp | 5 minutes after issue |

Stored in Redis with a 10-minute TTL rather than Postgres; the shape above defines the record.

#### `StripeEvent`
| Column | Type | Notes |
|---|---|---|
| `id` | varchar PK | Stripe event id, for idempotent redelivery |
| `type` | varchar | |
| `processedAt` | timestamp | |

#### `AdminUser`

_No separate entity — admin and support users are regular `User` rows with `role` set to `admin` or `support`, bootstrapped directly in the database during deployment._

---

### Modules & Endpoints

All paths in this section are written **without** the global prefix. The API mounts everything under `/api` (`app.setGlobalPrefix('api')`), so `POST /auth/google` is served at `/api/auth/google`, and Swagger is at `/api/docs`. The prefix is a routing detail and is not repeated on each row.

Every authenticated route resolves the website from the JWT subject, never from a client-supplied id. Routes addressing a sub-resource by id (`/submissions/:id`, `/websites/me/versions/:id`, `/support/tickets/:id`) verify that the resource belongs to the caller's website or user and return `404` — not `403` — when it does not, so ids cannot be probed.

#### Auth (`/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/google` | public | Exchange Google OAuth code for access + refresh tokens |
| `POST` | `/auth/refresh` | refresh cookie | Rotate tokens; reuse of a consumed token revokes the family |
| `POST` | `/auth/logout` | JWT | Revoke the refresh token family and clear cookies |
| `GET` | `/auth/me` | JWT | Current user: id, email, displayName, avatarUrl, role, and `hasWebsite` |

#### Slug & Email Verification (`/slug`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/slug/check/:slug` | JWT | Availability: `{ available, reason? }` where `reason` is `taken`, `reserved`, or `invalid` |
| `POST` | `/slug` | JWT | Create website; body requires `termsAccepted: true` and a valid `altchaPayload`; reserves the slug and sends a verification code. `400` if terms not accepted, slug invalid, or captcha fails; `409` if the user already has a website |
| `POST` | `/slug/verify` | JWT | Submit the 6-digit code; on success creates the website from the starter template, marks the email verified, and sets `trialEndsAt`. `400` on wrong code, `410` on expired or attempt-exhausted code |
| `POST` | `/slug/resend-code` | JWT | Resend the code; 60-second cooldown, max 5 per hour |

#### Websites (`/websites`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/websites/:slug` | public | Live snapshot for the SSR renderer. `404` when the website is unpublished, unverified, or suspended, with `X-Webvu-Reason` distinguishing the cases for the renderer |
| `GET` | `/websites/me` | JWT | Draft and live snapshots, publish state, subscription state. `404` when the user has no website |
| `PATCH` | `/websites/me` | JWT | Save the draft (theme, header, footer, pages, name, currency). Requires `draftUpdatedAt` for optimistic concurrency; `409` on conflict. Validates against the block schemas; `422` with field paths on failure. Rejected with `403` when the website is read-only |
| `POST` | `/websites/me/publish` | JWT | Validate and promote the draft to live, create a `WebsiteVersion`, purge caches. `403` when read-only, `422` on validation failure |
| `POST` | `/websites/me/unpublish` | JWT | Take the live website offline; sets `unpublishedByUser = true` |
| `PATCH` | `/websites/me/notification-email` | JWT | Set `pendingNotificationEmail` and send a verification code to it; the current address stays in effect until verified |
| `POST` | `/websites/me/notification-email/verify` | JWT | Verify the pending address and promote it |
| `GET` | `/websites/me/export` | JWT | Full JSON export: draft, live, all versions, all submissions |
| `DELETE` | `/websites/me/account` | JWT | Request account deletion; starts the 14-day grace window and cancels any subscription |

#### Assets (`/assets`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/assets` | JWT | Multipart upload; accepts PNG, JPEG, WebP up to 5 MB; re-encodes to WebP, strips EXIF, generates a logo thumbnail when `kind = logo`; returns the CDN URL |
| `GET` | `/assets` | JWT | List the website's assets for the image picker |
| `DELETE` | `/assets/:id` | JWT | Delete an asset. `409` if it is referenced by the draft or the live snapshot |

Uploads are limited to 100 assets and 100 MB total per website.

#### Versions (`/websites/me/versions`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/websites/me/versions` | JWT | List versions (id, createdAt, publishedBy, isLive) newest first, paginated |
| `GET` | `/websites/me/versions/:id` | JWT | Fetch a version snapshot |
| `POST` | `/websites/me/versions/:id/revert` | JWT | Copy the snapshot into the draft and publish it, creating a new version with `revertedFromVersionId` set |

#### Submissions (`/submissions`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/submissions/:slug` | public | Visitor submits a contact or order form; requires a valid `altchaPayload`; validated against the type's data schema; stores the submission and queues the notification email. `404` if the website is not publicly served, `400` on captcha failure, `422` on schema failure, `429` on rate limit |
| `GET` | `/submissions` | JWT | Owner's submissions; filter by `type`, `status`; sort by `createdAt`; paginated |
| `GET` | `/submissions/unread-count` | JWT | `{ count }` for the sidebar badge |
| `GET` | `/submissions/:id` | JWT | Detail; transitions `unread` → `read` only when the current status is `unread` |
| `PATCH` | `/submissions/:id/status` | JWT | Update status |

#### Analytics (`/analytics`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/analytics/visit` | internal | Record a page visit. Called server-to-server by the SSR renderer only; requires the `X-Webvu-Internal` shared secret header and is not reachable from the public edge. Body: slug, pagePath, client IP, user agent. The API derives `visitorHash` and discards the IP |
| `GET` | `/analytics/me` | JWT | Visit stats for the owner's website; query params `from`, `to` (UTC dates, max 365-day span) |

Response shape for `GET /analytics/me`:
```json
{
  "range": { "from": "2026-05-01", "to": "2026-05-31", "timezone": "UTC" },
  "totalVisits": 1240,
  "uniqueVisitors": 830,
  "mostVisitedPage": "/products",
  "timeline": [
    { "date": "2026-05-01", "visits": 42 }
  ],
  "byPage": [
    { "path": "/",         "title": "Home",     "enabled": true,  "visits": 510, "percentage": 41.1 },
    { "path": "/products", "title": "Products", "enabled": true,  "visits": 390, "percentage": 31.5 }
  ],
  "timelineByPage": [
    { "path": "/products", "points": [ { "date": "2026-05-01", "visits": 12 } ] }
  ]
}
```

`percentage` is rounded to one decimal place and computed against `totalVisits`; rows may not sum to exactly 100.

#### Billing (`/billing`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/billing/plan` | public | Plan name, monthly price, currency, trial length — read by the product page and the billing page |
| `GET` | `/billing/subscription` | JWT | Current status, `trialEndsAt`, `currentPeriodEnd` |
| `POST` | `/billing/checkout-session` | JWT | Create a Stripe Checkout Session; returns the redirect URL |
| `POST` | `/billing/portal-session` | JWT | Create a Stripe Customer Portal session; returns the redirect URL |
| `POST` | `/billing/webhook` | Stripe signature | Consume Stripe events; signature-verified and idempotent by event id. Raw body required — this route is exempt from the global JSON body parser |

#### Captcha (`/captcha`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/captcha/challenge` | public | Issue a new Altcha proof-of-work challenge |

#### Support Tickets — User (`/support`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/support/tickets` | JWT | List the user's own tickets; filter by `status` |
| `POST` | `/support/tickets` | JWT | Create a ticket (`open`). Max 10 open tickets per user |
| `GET` | `/support/tickets/:id` | JWT | Ticket detail + replies in chronological order |
| `POST` | `/support/tickets/:id/reply` | JWT | Add a user reply; reopens a `resolved` ticket as `in_progress`; `409` on a `closed` ticket |

#### Admin — Platform Stats (`/admin/stats`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/stats/overview` | Admin | Total users, active websites, visits today/week/month, subscription breakdown; params `from`, `to` |
| `GET` | `/admin/stats/timeline` | Admin | Platform-wide daily visits; params `from`, `to` |
| `GET` | `/admin/stats/top-sites` | Admin | Top 10 websites by visits in the period; params `from`, `to` |
| `GET` | `/admin/stats/sites/:slug/analytics` | Admin | Read-only analytics for one website, same shape as `GET /analytics/me`. Traffic only — never submission contents |

#### Admin — Support Tickets (`/admin/support`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/support/tickets` | Admin/Support | List tickets; params `status`, `assignedTo`, `tab` (`unassigned`/`mine`/`all`) |
| `GET` | `/admin/support/tickets/:id` | Admin/Support | Ticket detail + replies |
| `POST` | `/admin/support/tickets/:id/assign` | Admin/Support | Assign to self; `409` if already assigned to someone else |
| `POST` | `/admin/support/tickets/:id/reassign` | Admin | Reassign to another `admin`/`support` user |
| `POST` | `/admin/support/tickets/:id/reply` | Admin/Support | Add a support reply; Support role restricted to tickets assigned to them |
| `PATCH` | `/admin/support/tickets/:id/status` | Admin/Support | Update status; emails the user on `resolved` or `closed`. Support role restricted to tickets assigned to them |

#### Admin — Users (`/admin/users`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/users` | Admin | Search users by email or slug; returns account and subscription state. Read-only; no impersonation in v1 |

---

### Captcha — Altcha

Altcha (<https://altcha.org>) provides bot protection on public-facing forms. It is open source (MIT), self-hostable, and requires no external service or user account.

**How it works:** Altcha issues a server-signed proof-of-work challenge. The browser widget solves it client-side (CPU-bound, typically under a second) and produces a signed payload, which is submitted with the form and verified server-side. No cookies, no tracking, no third-party requests.

**Protected surfaces:**

| Surface | Endpoint |
|---|---|
| Slug creation modal (Step 1) | `POST /slug` |
| Contact form on a live website | `POST /submissions/:slug` |
| Order form on a live website | `POST /submissions/:slug` |

**Flow:**
1. On form mount the browser calls `GET /captcha/challenge`.
2. The widget solves the challenge and emits a base64-encoded payload.
3. The payload is sent with the form as `altchaPayload`.
4. The server verifies the HMAC signature, checks expiry, and atomically marks the challenge consumed before processing the request; anything invalid, expired, or replayed is rejected with `400`.

Challenge expiry is 5 minutes; consumed challenges are retained for 10 minutes for replay protection. The HMAC key is an environment secret, distinct per environment, and rotatable — the verifier accepts the previous key for a 10-minute overlap during rotation.

Captcha is deliberately **not** applied to `/slug/verify` and `/slug/resend-code`; those are JWT-protected and defended by attempt limits and rate limits instead.

---

### Rate Limits

Enforced with `@nestjs/throttler` backed by Redis, keyed by user id for authenticated routes and by client IP for public ones.

| Route | Limit |
|---|---|
| `POST /auth/google` | 10 / 5 min / IP |
| `POST /auth/refresh` | 60 / hour / user |
| `GET /slug/check/:slug` | 60 / min / user |
| `POST /slug` | 5 / hour / user |
| `POST /slug/verify` | 10 / hour / user, plus 5 attempts per code |
| `POST /slug/resend-code` | 5 / hour / user, 60 s cooldown |
| `POST /submissions/:slug` | 5 / hour / IP / website, 50 / day / website |
| `GET /websites/:slug` | 600 / min / IP (edge-cached, so this is a backstop) |
| `POST /analytics/visit` | 1000 / min / internal caller |
| `POST /assets` | 30 / hour / user |
| `POST /support/tickets` | 5 / day / user |
| `POST /captcha/challenge` | 60 / min / IP |
| All other authenticated routes | 300 / min / user |

Exceeding a limit returns `429` with `Retry-After`.

---

### Validation Rules

| Field | Rule |
|---|---|
| Slug | 3–30 chars, `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`, no `--`, not reserved |
| Website name | 1–60 chars |
| Business name (header) | 1–60 chars |
| Page title | 1–40 chars |
| Meta title | ≤ 60 chars |
| Meta description | ≤ 160 chars |
| Blocks per page | ≤ 30 |
| Block `id` | unique within a page |
| Block `type` | must exist in the component registry |
| `section.background` | one of `none`, `muted`, `accent`, `dark`, `image` |
| `section.backgroundImageUrl` | asset URL; required when `background` is `image` |
| `section.overlayOpacity` | integer 0–80 |
| `section.padding` | one of `sm`, `md`, `lg` |
| `section.width` | one of `contained`, `wide`, `full` |
| `section.anchorId` | `^[a-z0-9][a-z0-9-]{0,39}$`, unique within a page |
| Block props | validated per component, gated on registry `status` — see _Validation staging_ |
| Social link URL | `https://`, host must match the platform's known host list |
| Notification email | RFC 5322, ≤ 254 chars, must be deliverable-looking (no disposable-domain check in v1) |
| Verification code | exactly 6 digits, 15-minute expiry, 5 attempts |
| Submission message | ≤ 5000 chars |
| Submission line items | ≤ 50 items, quantity 1–999 |
| Support ticket title | 1–120 chars |
| Support ticket body / reply | 1–5000 chars |
| Upload | PNG, JPEG, WebP; ≤ 5 MB; ≤ 4000 px on the longest edge |
| Analytics range | ≤ 365 days, `from` ≤ `to`, both valid ISO dates |

Validation failures return `422` with a body of `{ "errors": [ { "path": "pages[2].blocks[0].props.headline", "message": "..." } ] }`.

---

### Guards & Roles

- `JwtAuthGuard` — validates the access token on protected user routes
- `WebsiteOwnerGuard` — resolves the caller's website and attaches it to the request; `404` when absent
- `ActiveSubscriptionGuard` — rejects write operations (`PATCH /websites/me`, publish, revert) with `403` when the website is read-only; read routes are unaffected
- `AdminJwtAuthGuard` — validates the token and checks `role` is `admin` or `support`
- `AdminOnlyGuard` — restricts to `role = admin` (platform stats, reassignment, user search)
- `TicketAssigneeGuard` — for Support role, restricts reply and status changes to tickets assigned to the caller
- `InternalSecretGuard` — validates the shared secret on `POST /analytics/visit`
- `StripeSignatureGuard` — validates the webhook signature on `POST /billing/webhook`

---

### NestJS Module Structure

```
src/
  auth/
  slug/
  websites/
  versions/
  assets/
  submissions/
  analytics/
  billing/          ← Stripe checkout, portal, webhooks, subscription state
  captcha/          ← Altcha challenge issuance and payload verification
  support/
  admin/
    stats/
    support/
    users/
  mail/             ← shared mail service (verification, notifications, billing, tickets)
  jobs/             ← BullMQ processors: email, analytics roll-up, pruning, trial reminders
  common/           ← guards, interceptors, shared Zod schemas, reserved-slug list
  database/         ← TypeORM config, entities, migrations
```

---

## Repository Layout & Toolchain

The repository is an **npm workspace** with three deployable projects and one shared package. The shared package exists because block schemas must be defined once and consumed by both the API and the UI — duplicating them would let validation drift between what the editor permits and what the server accepts.

```
webvu/
  package.json              ← workspace root, single lockfile
  packages/
    shared/                 ← Zod schemas, block types, the component registry
                              metadata, reserved-slug list, shared TS types
  webvu-api/                ← NestJS
  webvu-ui/                 ← Next.js (product page, dashboard, admin, renderer)
  webvu-infra/              ← AWS CDK
```

`packages/shared` is consumed as a workspace dependency and built before its dependents. Both Dockerfiles build from the repository root so the shared package resolves — a change from the current per-project Docker context.

### Pinned versions

The repository is ahead of common defaults in places. These versions are the target, not a floor:

| | Version | Consequence |
|---|---|---|
| Next.js | 16.x | App Router and middleware APIs differ from earlier majors |
| React | 19.x | |
| Tailwind CSS | 4.x | CSS-first theming; no `tailwind.config.js` |
| NestJS | 11.x | Upgrade from the scaffolded 10.x before feature work begins, while there is nothing to migrate |
| Node | 22 LTS | Matches the runtime in the task definitions |

**Before writing any Next.js code**, read the relevant guide under `node_modules/next/dist/docs/`. Next 16 changed enough that assumed conventions are unreliable, and the subdomain-rewrite middleware is the piece most exposed to that. This rule is recorded in `webvu-ui/AGENTS.md`.

### Local development

The entire product runs on one machine with no AWS account, no Google project, no Stripe account, and no internet connection. See _Local Development_.

---

## Infrastructure

### AWS Architecture

Everything runs in AWS, provisioned by the CDK app in `webvu-infra/`.

| Concern | Service |
|---|---|
| DNS | Route 53 hosted zone for `webvu.io` |
| Edge & TLS termination | CloudFront, one distribution per surface |
| Compute | ECS Fargate behind an Application Load Balancer, one service each for the API and the UI |
| Images | ECR |
| Database | RDS PostgreSQL 16, Multi-AZ in production, private subnets only |
| Cache & queues | ElastiCache for Redis, private subnets only |
| Object storage | S3, private bucket, read through CloudFront via Origin Access Control |
| Secrets | AWS Secrets Manager, injected into task definitions; never baked into images |
| Logs & metrics | CloudWatch |

The ALB is reachable only from CloudFront, enforced by a shared secret header and a security group rule. Neither RDS nor ElastiCache is publicly routable.

### DNS & TLS

- `webvu.io`, `dashboard.webvu.io`, `admin.webvu.io`, `api.webvu.io`, `cdn.webvu.io` — Route 53 alias records to the relevant CloudFront distribution
- `*.webvu.io` — wildcard alias record to the renderer distribution, serving every user website
- TLS uses an **ACM wildcard certificate** for `*.webvu.io` plus the apex, DNS-validated through Route 53 and renewed automatically. DNS validation is required because a wildcard cannot be validated over HTTP
- The certificate used by CloudFront **must be issued in `us-east-1`** regardless of where the rest of the stack runs. The ALB needs its own certificate in the stack's own region
- Wildcard certificates do not cover multi-label subdomains, so a slug must be a single DNS label — consistent with the slug rules
- ACM renews automatically, but renewal is still alerted on: expiry within 21 days pages someone

### Environments

| Environment | Domain | Data |
|---|---|---|
| Local | `*.webvu.localhost`, resolved by the browser | Docker Compose: Postgres, Redis, MinIO, Mailpit, Caddy. See _Local Development_ |
| Staging | `*.staging.webvu.io` | Separate database; Stripe test mode; seeded demo websites |
| Production | `*.webvu.io` | Stripe live mode |

Each environment holds its own secrets. No production secret is ever present in staging or local configuration.

### Deployment

- Containerised API and UI; database migrations run as a pre-deploy step and must be backward-compatible with the currently running version, so a deploy can be rolled back without a schema rollback
- Health endpoints: `GET /health/live` (process up) and `GET /health/ready` (database + Redis reachable)
- Zero-downtime rolling ECS deploys; the CloudFront cache absorbs brief API unavailability
- The CDK app also carries scale-down and teardown paths (see `.github/workflows/`), so non-production environments can be parked without being destroyed

### Backups & Recovery

- RDS: automated backups with point-in-time recovery over a 7-day window, retained 30 days; final snapshot taken on stack deletion
- S3: bucket versioning enabled, with a lifecycle rule expiring non-current versions after 30 days
- ElastiCache is **not** backed up — nothing durable lives there, by design
- Restore is rehearsed quarterly against staging. **Target RPO 1 hour, RTO 4 hours**

### Observability

- Structured JSON logs to CloudWatch, with a request id propagated from the renderer through to the API
- Error tracking (Sentry or equivalent) on both surfaces, with user ids attached but never submission contents
- Metrics: request rate and latency per route, publish count, submission count, email delivery success rate, job queue depth and failure count
- Alerts: API 5xx rate above 1% for 5 minutes; email failure rate above 5%; job queue depth growing for 15 minutes; certificate expiry within 21 days; Stripe webhook processing failures

### Secrets

JWT signing key, refresh token pepper, Altcha HMAC key, analytics internal secret, CloudFront-to-ALB shared secret, Stripe secret and webhook signing secret, Resend API key, database URL, Redis URL. All are held in AWS Secrets Manager and injected into ECS task definitions at runtime; none are committed, and none appear in an image layer.

S3 access uses the ECS task role, not an access key. Local development uses MinIO credentials from `.env`, the only long-lived storage credentials that exist anywhere.

---

## Local Development

Everything in this document runs on a single machine. The four services Webvu depends on that have no local equivalent — Google, Resend, Stripe, and CloudFront/S3 — are handled by **drivers**, not by conditional branches at call sites. A driver is selected by environment variable; the production driver is the default, and a local driver is registered only when `NODE_ENV !== 'production'`.

This matters beyond convenience. Driver boundaries are what keep the local path and the production path behaving identically, and two of the local drivers are required by CI regardless of whether anyone develops locally.

### Drivers

| Service | Production | Local | Selected by |
|---|---|---|---|
| `MailService` | `resend` | `smtp` → Mailpit | `MAIL_DRIVER` |
| `AuthProvider` | `google` | `dev-stub` | `AUTH_DRIVER` |
| `BillingService` | `stripe` | `dev-stub` | `BILLING_DRIVER` |
| `StorageService` | `s3` | `minio` | `STORAGE_DRIVER` |

**Mail.** The local driver sends over SMTP to Mailpit, whose web UI shows every verification code, submission notification, billing reminder, and ticket update. `MailService` already exists to make the provider swappable; this is that seam being used rather than a new one.

**Storage.** The same AWS SDK client against MinIO with `forcePathStyle: true`. Only the endpoint and credentials differ, so the S3 code path is genuinely exercised. There is no local CloudFront: caching degrades to the Redis snapshot cache and the Next data cache. That removes a performance characteristic, not a behaviour, and nothing in the correctness of publish or invalidation depends on the edge.

**Billing.** The local driver sets subscription state directly and exposes a **fake clock** that can advance past `trialEndsAt`. Trial expiry → suspension → read-only dashboard → resubscribe → restored snapshot is core behaviour sitting behind a 30-day timer; without a fake clock it is untestable, and with one it is an ordinary test. Stripe test mode with `stripe listen` remains available for verifying the real webhook path.

**Auth.** The local driver presents a login screen listing the seeded users and, on selection, mints exactly the JWT and cookies the Google flow would. Everything downstream — cookie scoping, guards, refresh rotation, role routing — is unchanged and genuinely exercised.

The stub exists because Google refuses to register an `http://` redirect URI for any host other than `localhost` or `127.0.0.1`, so `http://dashboard.webvu.localhost/auth/callback` cannot be used. It is also required by CI: an end-to-end test cannot drive a real Google login.

### Dev auth guards

The auth stub mints sessions, so one guard is not enough. All three must hold:

1. The module is not imported unless `NODE_ENV !== 'production'`.
2. `DEV_AUTH_ENABLED=true` must be set explicitly; absence disables the stub even in development.
3. A startup assertion **crashes the process** if the stub is enabled while `DATABASE_URL` points at a non-local host.

A test asserts that a production-like configuration with the stub enabled fails to boot.

### Hostnames and TLS

Two tiers, because the fast path and the faithful path have different jobs.

**Default — plain http.** Caddy routes by `Host` to the UI and API. Chrome, Edge, and Firefox resolve `*.localhost` to `127.0.0.1` with no hosts-file editing, and WSL2 forwards the published port automatically.

| Host | Serves |
|---|---|
| `webvu.localhost` | Product page |
| `dashboard.webvu.localhost` | Builder dashboard |
| `admin.webvu.localhost` | Admin dashboard |
| `api.webvu.localhost` | NestJS API |
| `cdn.webvu.localhost` | MinIO bucket, standing in for CloudFront |
| `*.webvu.localhost` | User websites, e.g. `beardbaker.webvu.localhost` |

Session cookies drop the `Secure` attribute in development, because a `Secure` cookie is never set over plain http and the resulting failure looks like a bug in the auth code rather than a transport problem. Every other cookie property — host-only, `HttpOnly`, `SameSite=Lax`, `Path` — is identical to production, so the isolation rule in _Domains & Session Model_ is still exercised locally.

**Opt-in — `COMPOSE_PROFILES=tls`.** Caddy's `tls internal` issues certificates from its own local CA, giving https on every host above. This is the faithful tier: `Secure` cookies behave exactly as in production, and real Google OAuth works because the redirect URIs are registrable `https://` URLs. On WSL2 the browser runs on Windows while the services run in Linux, so Caddy's root CA must be trusted in the **Windows** certificate store.

Use the default tier day to day; switch to `tls` before changing anything about auth or cookies.

### Services

`docker compose up -d` at the repository root:

| Service | Ports | Notes |
|---|---|---|
| `postgres` | 5432 | Postgres 16, matching RDS |
| `redis` | 6379 | |
| `minio` | 9000, 9001 | Bucket created on boot with a public-read policy |
| `mailpit` | 1025, 8025 | SMTP sink and web UI |
| `caddy` | 80, 443 | Host routing; the only container publishing a well-known port |

The API (`:3000`) and UI (`:3001`) run on the host rather than in containers, so reload stays fast. The tasks in `webvu.code-workspace` already start both.

Resource use is roughly 1.5–2 GB of RAM for the five containers and two dev servers.

### Seed data

`npm run seed` in `webvu-api` is idempotent and creates:

- One user per role (`user`, `admin`, `support`) — these are what the auth stub lists
- A published website on slug `beardbaker` from the starter template, so `beardbaker.webvu.localhost` renders immediately
- A second website mid-trial and a third suspended, so billing states are visible without waiting
- ~20 submissions spanning both types and all five statuses
- 90 days of `PageVisit` rows with a realistic weekday/weekend shape — without this, analytics is an empty chart and cannot be developed against
- Support tickets in each status, some assigned

### Offline check

Disconnect the network and run the full flow: sign in, edit a block, publish, view the website on its subdomain, submit a contact form, read the notification in Mailpit, advance the fake clock past the trial, watch the website suspend, then reactivate. All of it must pass. That is the standing proof that no development step depends on a third-party account.

---

## Non-Functional Requirements

### Performance

| Surface | Target |
|---|---|
| Live website TTFB (cache hit) | < 100 ms p95 |
| Live website TTFB (cache miss) | < 600 ms p95 |
| Live website Largest Contentful Paint | < 2.5 s p75 on a 4G connection |
| Dashboard initial load | < 2 s p95 |
| Editor interaction (drag, field edit) | < 100 ms to visible feedback |
| Preview refresh after an edit | < 300 ms |
| API read endpoints | < 200 ms p95 |
| Analytics query, 90-day range | < 500 ms p95 (served from the daily roll-up) |
| Publish to live | < 5 s including cache purge |

### Scale targets for v1

Sized so the architecture is not embarrassed at ten times these figures: 10,000 websites, 5,000 published, 2 million page views per month, 50,000 submissions per month, 500 concurrent dashboard users. The raw `PageVisit` table is the only component expected to need attention beyond this point; the daily roll-up exists so that read paths already avoid it.

### Availability

99.5% monthly for live websites, measured externally. The dashboard and admin surfaces have no formal target in v1. The Terms of Service offers no uptime warranty regardless of this internal target.

### Browser Support

Latest two major versions of Chrome, Edge, Firefox, and Safari, on desktop and mobile. No IE11. The **rendered user websites** must additionally degrade gracefully one version further back, since a business owner does not control their customers' browsers.

### Responsive Design

Both the rendered websites and the dashboard are responsive. Breakpoints follow Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280).

- **Rendered websites** must be fully usable at 320 px. Every block has a defined mobile layout: hero stacks image below text; feature, product, and service grids collapse to one column below `md` and two below `lg`; forms are full width with inputs at least 44 px tall
- **Dashboard** is optimised for `lg` and above. Below `md` the editor collapses to a single column, the sidebar becomes a drawer, and the preview pane is available as a full-screen toggle. Drag-and-drop reordering falls back to move-up/move-down buttons on touch
- **Admin** targets desktop only; below `md` it shows a "best viewed on a larger screen" notice and remains usable

### Accessibility

Target **WCAG 2.1 AA** on the dashboard, the product page, and all rendered block components.

- All interactive elements are keyboard reachable with a visible focus ring; block reordering has the keyboard alternative noted above
- Form inputs have associated labels; errors are announced via `aria-live`
- Images carry alt text — the asset uploader asks for it and the renderer omits decorative images from the accessibility tree when it is absent
- Modals trap focus and restore it on close; the onboarding modal is the one non-dismissible dialog and must still be fully keyboard operable
- Colour is never the only carrier of meaning (submission status and publish state use text labels alongside colour)
- **Webvu's own** brand tokens are contrast-tested in CI: every `--wv-text*` on every `--wv-surface*` it is paired with must meet 4.5:1, and the check fails the build. A rebrand that breaks contrast cannot merge
- **User-chosen** theme contrast is warned about but not enforced, as described in _Per-User Theming_ — it is their website, not ours

### Internationalisation

UI copy is English-only in v1, but is authored through a translation layer rather than inline literals so a second locale needs no refactor. Dates are rendered in the viewer's locale; analytics buckets remain UTC and are labelled as such. Currency is per-website, formatted with `Intl.NumberFormat`.

---

## Quality & Acceptance

### Definition of Done

A feature is done when: the endpoint and UI match this specification; validation rules are enforced server-side, not only in the UI; error and empty states are implemented; the happy path has an end-to-end test; authorisation is covered by a test asserting another user's data is unreachable; and the feature is keyboard operable.

A **component** is done when the seven steps in _Component Build-Out_ are complete and its registry entry reads `implemented`. Until then its entry reads `placeholder`, which is a shipped state, not an unfinished one.

### Testing

| Layer | Scope |
|---|---|
| Unit | Section settings validation, per-component props validation and the `status` gate, `defaultProps` merge on promotion, slug validation and the reserved list, visitor hashing, analytics aggregation, Altcha verification, subscription state transitions |
| Design tokens | Token build output is deterministic; every `--wv-*` used in `src/` exists in `tokens.d.ts`; no literal colour outside `brand.ts`; brand contrast pairs meet 4.5:1 |
| Integration | Every endpoint against a real Postgres instance, including ownership and role guards; Stripe webhooks against fixture events |
| End-to-end | Onboarding through to first publish; add blocks to a stack, reorder, set alternating backgrounds, save, publish, and confirm order and banding on the subdomain; submit a contact form → appears in the inbox → email queued; trial expiry → website suspended → resubscribe → website restored; support ticket round trip |
| Visual | **User website components** — per component, as part of its build-out: snapshots at mobile and desktop widths, in two contrasting user themes, across its variants and each `section.background` option. `PlaceholderBlock` is covered once, the same way. **Webvu surfaces** — snapshots of the product page, each dashboard route, and each admin route; these are the diff a rebrand is reviewed through |
| Accessibility | Automated axe pass on every dashboard route and every block |

### CI

Every pull request runs lint, typecheck, unit and integration tests, and a migration check asserting the migrations reproduce the entity schema exactly. Merges to `main` deploy to staging automatically; production deploys are manual.

### Acceptance criteria for the core paths

1. **Onboarding.** A new Google user reaching `dashboard.webvu.io` sees a non-dismissible modal, cannot submit without a valid slug, a solved captcha, and the terms checkbox, receives a code within 60 seconds, and after entering it lands on a dashboard with the starter template loaded and a 30-day trial started.
2. **Publish.** Editing a block and saving changes nothing publicly. Publishing makes the change visible at `<slug>.webvu.io` within 5 seconds and adds exactly one entry to Version History.
3. **Revert.** Reverting to an earlier version restores that content and adds a new version; the reverted-from version still exists.
4. **Submission.** A contact form submitted on a live website without a valid captcha is rejected; with one it appears in the inbox as `Unread` and an email reaches the verified notification email. Opening it once sets `Read`; a manual status is never overwritten.
5. **Isolation.** No authenticated endpoint returns another user's website, submissions, versions, assets, or tickets; attempts return `404`.
6. **Billing.** When the trial expires without a subscription, the live website returns 404 and the dashboard becomes read-only with nothing deleted. Completing Stripe Checkout restores the previous live snapshot without a republish.
7. **Isolation of user content.** No cookie set by Webvu is readable from `<slug>.webvu.io`, and no user-supplied string is ever rendered as HTML.

---

## Open Questions

Items that need a decision before the sections they affect are built. None block starting work.

| # | Question | Affects |
|---|---|---|
| 1 | Monthly price and currency for the single plan | Product page, `GET /billing/plan`, Terms |
| 2 | Trial length — 30 days is assumed throughout | `trialEndsAt`, reminder schedule, product page copy |
| 3 | Refund position for partial months | Terms of Service |
| 4 | Governing jurisdiction | Terms of Service |
| 5 | Sending domain and DKIM/SPF/DMARC setup for transactional email | Deliverability of every transactional email |
| 5a | Resend vs Amazon SES now that the stack is AWS. `MailService` makes this swappable, so it is not urgent | `mail/` implementation, secrets |
| 6 | Whether order forms should show prices at all, given no payment is taken | `order-form` and `product-grid` schemas |
| 7 | Bot user-agent list source for analytics filtering | Analytics accuracy |
| 8 | AWS region for the main stack (the CloudFront certificate is `us-east-1` regardless) | CDK stack, latency, data residency |
| 9 | Whether staging runs its own RDS and ElastiCache or shares a parked instance | Cost, `infra-scale-down` workflow |
