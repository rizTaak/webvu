# Webvu Specification

## Overall

Webvu is a platform that lets users create their own mini websites for their small businesses. Each user gets a unique slug (e.g. `beardbaker`) and their website is accessible at `beardbaker.webvu.io`. Visitors to that URL see the user's website, not the Webvu product page at `webvu.io`.

Each user website supports six pages:
- **Landing** — business intro, hero, features
- **About** — business story, team, values
- **Products** — product catalogue
- **Services** — list of services offered
- **Contact** — contact form
- **Order** — order form

Every website also has a configurable **header** (logo, business name, page navigation) and **footer** (social media links) that appear on all pages.

Users build each page by stacking pre-built block components. They can customise the look and feel of their whole website (colours, font, border radius) through a theme editor. The website structure and theme are stored as JSON and rendered dynamically when a visitor browses the slug.

---

## UI

### Tech Stack

- **Framework**: Next.js (App Router)
- **Component Library**: Shadcn/ui
- **Styling**: Tailwind CSS
- **Theming**: CSS variables (Shadcn's built-in token system)

### Routing

Next.js middleware detects subdomains and rewrites requests transparently:

- `webvu.io` → `src/app/page.tsx` (Webvu product landing page)
- `beardbaker.webvu.io` → `src/app/sites/[slug]/[[...path]]/page.tsx` (user's website)

```
middleware.ts
src/app/
  page.tsx                             ← webvu.io product landing
  sites/
    [slug]/
      [[...path]]/
        page.tsx                       ← user site catch-all (SSR)
  _components/
    site-renderer/
      ThemeInjector.tsx                ← injects CSS variables from theme JSON
      BlockRenderer.tsx                ← maps block type string → React component
      blocks/
        HeroBlock.tsx
        FeatureListBlock.tsx
        AboutBlock.tsx
        ProductGridBlock.tsx
        ServicesBlock.tsx
        ContactFormBlock.tsx
        OrderFormBlock.tsx
      SiteHeader.tsx               ← rendered from header config on every page
      SiteFooter.tsx               ← rendered from footer config on every page
```

### Per-User Theming

The user's saved theme JSON is injected as CSS variables at render time. Because Shadcn/ui uses the same variable names internally, all components automatically reflect the user's brand.

**Theme JSON shape:**
```json
{
  "primaryColor": "262 83% 58%",
  "accentColor": "30 100% 50%",
  "background": "0 0% 100%",
  "foreground": "222 47% 11%",
  "fontFamily": "Inter",
  "borderRadius": "0.5rem"
}
```

**ThemeInjector** renders a `<style>` tag mapping these values to CSS variables (`--primary`, `--background`, `--foreground`, `--radius`, etc.) that Tailwind and Shadcn consume.

### Website JSON Structure

The full website (theme + pages + blocks) is stored as JSON in the backend and fetched server-side on every request.

```json
{
  "slug": "beardbaker",
  "name": "Beard Baker",
  "theme": { ... },
  "header": {
    "logoUrl": "https://...",
    "businessName": "Beard Baker"
  },
  "footer": {
    "socialLinks": [
      { "platform": "instagram", "url": "https://instagram.com/beardbaker" },
      { "platform": "facebook",  "url": "https://facebook.com/beardbaker" },
      { "platform": "twitter",   "url": "https://x.com/beardbaker" },
      { "platform": "tiktok",    "url": "https://tiktok.com/@beardbaker" }
    ]
  },
  "pages": [
    {
      "path": "/",
      "title": "Home",
      "blocks": [
        {
          "id": "b1",
          "type": "hero",
          "props": {
            "headline": "Fresh Beard Care",
            "subheadline": "Handcrafted grooming products",
            "ctaText": "Shop Now",
            "ctaLink": "/products",
            "image": "https://..."
          }
        },
        {
          "id": "b2",
          "type": "feature-list",
          "props": {
            "title": "Why Choose Us",
            "items": ["Natural ingredients", "Free shipping", "30-day returns"]
          }
        }
      ]
    },
    {
      "path": "/about",
      "title": "About",
      "blocks": [
        { "id": "b7", "type": "about", "props": { "title": "Our Story", "body": "..." } }
      ]
    },
    {
      "path": "/products",
      "title": "Products",
      "blocks": [
        { "id": "b3", "type": "product-grid", "props": { "title": "Our Products" } }
      ]
    },
    {
      "path": "/services",
      "title": "Services",
      "blocks": [
        { "id": "b6", "type": "services-list", "props": { "title": "What We Offer" } }
      ]
    },
    {
      "path": "/contact",
      "title": "Contact",
      "blocks": [
        { "id": "b4", "type": "contact-form", "props": { "email": "hi@beardbaker.com" } }
      ]
    },
    {
      "path": "/order",
      "title": "Order",
      "blocks": [
        { "id": "b5", "type": "order-form", "props": {} }
      ]
    }
  ]
}
```

### Block Registry

`BlockRenderer` maps the `type` string from JSON to a React component. Adding a new block type is done by registering it in the map.

```ts
const BLOCK_MAP = {
  'hero':          HeroBlock,
  'feature-list':  FeatureListBlock,
  'about':         AboutBlock,
  'product-grid':  ProductGridBlock,
  'services-list': ServicesBlock,
  'contact-form':  ContactFormBlock,
  'order-form':    OrderFormBlock,
}
```

### Data Flow

```
Browser → beardbaker.webvu.io/products
  → Next.js middleware rewrites to /sites/beardbaker/products
  → SSR page fetches GET /websites/beardbaker from NestJS API
  → API returns website JSON (theme + pages)
  → ThemeInjector injects CSS variables
  → BlockRenderer renders blocks for /products page
  → HTML returned to browser (SEO-friendly)
```

### Builder UI (webvu.io)

The Webvu product itself (`webvu.io`) is where users log in and manage their website. Key views:

- **Page editor** — add, remove, reorder blocks within a page using drag-and-drop (`dnd-kit`)
- **Block config panel** — edit props for the selected block
- **Theme editor** — pick primary colour, accent colour, font family, border radius; live preview
- **Page navigator** — switch between the five pages

---

### webvu.io — Product Landing Page

The public-facing marketing page at `webvu.io`. Contains a fixed header with anchor links to sections on the page and two CTAs.

**Header:**
- Logo / brand name on the left
- Anchor links to page sections on the right (e.g. Features, How It Works, Pricing)
- **`Login`** button — opens auth flow for existing users
- **`Start Creating`** button — opens auth flow then redirects to dashboard on success

**Page sections (scrollable):**
- Hero — headline, subheadline, `Start Creating` CTA
- Features — what you get (pages, blocks, theming, custom URL)
- How It Works — 3-step explainer (sign up → build → share your link)
- Pricing (if applicable)
- Footer

---

### Authentication — Google Only (v1)

All users (regular, support, admin) authenticate via Google OAuth. On first login a `User` row is created with `role = user`. Admin and support roles are set manually in the database as a one-time bootstrap step during deployment — there is no UI or API to promote a user to admin.

JWT payload includes:
```json
{ "sub": "<userId>", "email": "...", "role": "user" }
```

**Future provider extensibility:**
The `User` entity uses a separate `OAuthAccount` child table (provider + providerId) rather than storing `googleId` directly on `User`. This allows a single user account to be linked to multiple OAuth providers without schema changes.

#### `OAuthAccount`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → User | |
| `provider` | varchar | e.g. `google`, `microsoft`, `facebook` |
| `providerId` | varchar | subject ID from the provider |
| `createdAt` | timestamp | |

Unique constraint on `(provider, providerId)`. Adding a new provider in future only requires a new Passport strategy — no entity changes needed.

---

### Authentication

Hosted at `webvu.io`. All users sign in with **Google OAuth only** in v1 — no email/password option.

Both the `Start Creating` and `Login` buttons trigger the same Google OAuth flow. On successful login the user is redirected to `dashboard.webvu.io`.

The auth system must be designed to support additional OAuth providers (e.g. Microsoft, Facebook) in future versions without structural changes — new providers should only require adding a new Passport strategy and a provider button on the login screen.

---

### dashboard.webvu.io — Builder Dashboard

Served under the `dashboard` subdomain. Middleware rewrites `dashboard.webvu.io/*` to the dashboard route tree.

#### Slug Creation (first-time flow)

If the authenticated user has no slug, a **modal dialog** is shown immediately on dashboard load. The modal is non-dismissible — the user must create a slug before proceeding.

The modal is a two-step flow:

**Step 1 — Slug & business email:**
- Input field for slug (lowercase, alphanumeric, hyphens allowed)
- Real-time availability check (debounced API call)
- Email field — defaults to the Google account email but can be overridden
- This email is the **business notification email**: all order submissions and contact form submissions from the user's live website will be delivered here
- **Terms of Service checkbox** — required, must be checked before the form can be submitted. Label reads: _"I agree to the [Terms of Service](https://webvu.io/terms) and [Privacy Policy](https://webvu.io/privacy)"_
- **Altcha captcha widget** embedded at the bottom of the form — must be solved before submission is enabled

**Step 2 — Email verification:**
- A 6-digit verification code is sent to the provided email
- User enters the code in the modal
- On successful verification: slug is created, email is marked verified, modal closes and user lands on the main dashboard
- Resend code option available after a cooldown

The business notification email can be changed later from dashboard settings, which triggers re-verification of the new address.

#### Main Dashboard

After slug creation (or on return visits) the user sees the main dashboard with:

**Sidebar / top nav:**
- Website name + slug (with link to preview `<slug>.webvu.io`)
- Page list — each of the six pages (Landing, About, Products, Services, Contact, Order) with a toggle to enable/disable the page on the live site
- Header & Footer Editor link
- Inbox link (with unread count badge)
- Analytics link
- Theme Editor link
- Version History link
- Support link

**Page Editor (centre panel):**

Opened when the user selects a page from the nav. Shows a vertical stack of the blocks on that page.

- Each block is shown as a card with its type label and a brief preview
- Blocks can be **reordered** by dragging (powered by `dnd-kit`)
- **Add Block** button at the bottom opens a block picker modal listing all available block types
- Clicking a block opens the **Block Config Panel** (right sidebar or inline below the block)
- Blocks can be **removed** via a delete icon on the card

**Block Config Panel (right sidebar):**
- Form fields matching the selected block's `props` schema
- Changes update a local draft in real time (live preview iframe or inline preview)
- **Save** commits the draft as a new version

**Theme Editor:**
- Colour pickers for: Background, Foreground, Primary, Accent, Muted
- Font family selector (from a curated list of Google Fonts)
- Border radius slider
- Live preview of changes via CSS variable injection in the preview iframe
- **Save** commits the theme as a new version

**Header & Footer Editor (`dashboard.webvu.io/site-config`):**

*Header config:*
- Logo upload (image file; stored and served from object storage)
- Business name field (pre-filled from website name)
- Enabled pages are automatically listed as navigation links in the header — no manual configuration needed; order follows the page list order in the sidebar

*Footer config:*
- Social media link fields — one URL input per supported platform:
  - Instagram, Facebook, X (Twitter), TikTok, LinkedIn, YouTube
- Only platforms with a URL entered are shown in the rendered footer
- **Save** commits header + footer config as part of a new version snapshot

#### Versioning

Every time the user saves (page blocks or theme), a new version snapshot of the full website JSON is stored on the backend.

- Versions are timestamped and listed in **Version History** (accessible from the sidebar)
- User can preview any previous version
- User can **revert** to any previous version — this creates a new version entry (revert is non-destructive)
- The live site always serves the latest version

#### Notifications (v1)

When a visitor submits a form on the user's live website, the backend sends an email to the user's verified business notification email:

- **Contact form submission** — includes all fields the visitor filled in (name, message, etc.)
- **Order form submission** — includes order details submitted by the visitor

**Contact Form block** and **Order Form block** on live user websites both include an **Altcha captcha widget** that must be solved before the form can be submitted. The captcha payload is submitted alongside the form data and verified server-side before the submission is stored or the notification email is sent.

#### Inbox

Accessible from `dashboard.webvu.io/inbox`.

**Submission list:**
- Each item shows: type (Contact / Order), visitor name, date received, and current status
- Unread items are visually highlighted
- Filterable by type (All / Contact / Order) and by status
- Sortable by date

**Submission detail:**
- Clicking an item opens the full submission content (all fields submitted by the visitor)
- Opening an item automatically transitions status from **Unread** to **Read**

**Status tags** — user can manually set the status of any submission:

| Status | Meaning |
|---|---|
| `Unread` | Received, not yet opened |
| `Read` | Opened but no action taken |
| `In Progress` | Being acted on |
| `Completed` | Fulfilled / resolved |
| `Cancelled` | Dismissed / irrelevant |

- Status can be changed from both the list view (inline) and the detail view
- Unread count in the sidebar badge reflects items with `Unread` status only

#### Analytics

Accessible from `dashboard.webvu.io/analytics`. Shows visit data for the user's live website.

**Time range selector:**
- Presets: Last 7 days, Last 30 days, Last 90 days
- Custom date range picker

**Site-wide summary (top of page):**
- Total visits in the selected period
- Unique visitors
- Most visited page

**Timeline chart:**
- Line chart showing daily visit count over the selected time range
- Toggleable overlay lines per page so the user can compare page traffic on the same chart

**Per-page breakdown (table below chart):**
- One row per enabled page (Landing, Products, Services, Contact, Order)
- Columns: Page, Visits, % of total
- Clicking a page row filters the timeline chart to show only that page

Visit data is recorded server-side on each page request to the user's live website and stored as lightweight event rows (slug, page path, timestamp). No third-party analytics scripts are injected into user sites.

#### Support

Accessible from `dashboard.webvu.io/support`. Allows users to raise and track support tickets.

**Ticket list:**
- Shows all tickets raised by the user
- Each row shows: ticket title, date created, last updated, and current status
- Filterable by status

**Ticket statuses:**

| Status | Meaning |
|---|---|
| `Open` | Submitted, awaiting response |
| `In Progress` | Being looked at by support |
| `Resolved` | Issue addressed |
| `Closed` | Ticket closed (no further action) |

**Create Ticket:**
- Button at the top of the list opens a form
- Fields: Title (short summary), Description (full explanation of the issue)
- On submit: ticket is created with `Open` status and appears at the top of the list

**Ticket detail:**
- Clicking a ticket opens the detail view showing the full description and status
- In v1 status updates are made by the Webvu support team only — users can view but not change status

---

### Routing Summary

| URL | Destination |
|---|---|
| `webvu.io` | Product landing page |
| `webvu.io/terms` | Terms of Service |
| `webvu.io/privacy` | Privacy Policy |
| `webvu.io/login` | Auth page |
| `dashboard.webvu.io` | Builder dashboard (authenticated) |
| `dashboard.webvu.io/editor/[page]` | Page editor for a specific page |
| `dashboard.webvu.io/theme` | Theme editor |
| `dashboard.webvu.io/site-config` | Header & footer editor |
| `dashboard.webvu.io/history` | Version history |
| `dashboard.webvu.io/inbox` | Contact & order submissions inbox |
| `dashboard.webvu.io/inbox/[id]` | Individual submission detail |
| `dashboard.webvu.io/analytics` | Site & page visit analytics |
| `dashboard.webvu.io/support` | Support ticket list |
| `dashboard.webvu.io/support/new` | Create new support ticket |
| `dashboard.webvu.io/support/[id]` | Support ticket detail |
| `admin.webvu.io` | Admin dashboard — platform overview (Admin role) |
| `admin.webvu.io/support` | Support ticket inbox (Support role) |
| `admin.webvu.io/support/[id]` | Support ticket detail & reply |
| `<slug>.webvu.io` | User's live website (public) |
| `<slug>.webvu.io/[page-path]` | Specific page on user's live website |

---

## Admin

### admin.webvu.io — Internal Dashboard

Served under the `admin` subdomain. Accessible to Webvu internal users only. There are two roles:

| Role | Access |
|---|---|
| `Admin` | Platform analytics + support ticket inbox |
| `Support` | Support ticket inbox only |

Authentication uses the same credential system as the user-facing app but role is set internally — admin accounts cannot be self-registered.

---

### Admin Role — Platform Overview

Accessible at `admin.webvu.io`. Visible to `Admin` role only.

**Summary stats (top of page):**
- Total registered users
- Total active mini websites (at least one visit in last 30 days)
- Total visits across all mini websites today / this week / this month

**Time range selector:** Last 7 days, Last 30 days, Last 90 days, custom range

**Platform-wide timeline chart:**
- Daily total visits across all mini websites over the selected period

**Top 10 mini websites (table):**
- Columns: Rank, Slug, Owner, Total Visits (in period), Pages enabled
- Sortable by visits
- Clicking a row opens a read-only view of that user's analytics detail

---

### Support Role — Ticket Inbox

Accessible at `admin.webvu.io/support`. Visible to both `Admin` and `Support` roles.

**Ticket inbox tabs:**
- **Unassigned** — all open tickets not yet assigned to anyone
- **Mine** — tickets assigned to the logged-in support user
- **All** — every ticket regardless of assignment (read-only for Support, full access for Admin)

**Ticket list columns:** Ticket ID, User (slug + email), Title, Created, Last Updated, Status, Assigned To

**Filterable by:** Status, Assigned To

**Actions from the list:**
- **Assign to me** — available on any unassigned ticket; moves it from Unassigned to Mine tab and sets assignee
- **Reassign** (Admin only) — reassign a ticket to another support user

**Ticket detail (`admin.webvu.io/support/[id]`):**
- Shows original ticket title and description submitted by the user
- Thread-style reply panel — support user types a response and submits
- Response is saved and the user sees it on their ticket detail at `dashboard.webvu.io/support/[id]`
- Support user can update ticket status to `In Progress`, `Resolved`, or `Closed`
- Marking `Resolved` or `Closed` sends an email notification to the user

---

### Legal

Webvu must publish a **Terms of Service** and a **Privacy Policy** before launch, hosted at `webvu.io/terms` and `webvu.io/privacy` respectively.

**Recommended generator:** [getterms.io/terms-and-conditions-generator](https://getterms.io/terms-and-conditions-generator) — drafts lawyer-reviewed documents, covers GDPR/CCPA, free tier available.

**Key clauses the Terms of Service must include:**

| Clause | Purpose |
|---|---|
| User content responsibility | User is solely responsible for all content published on their mini website |
| No liability for user content | Webvu is not liable for any content, claims, or legal actions arising from a user's website |
| No liability for transactions | Webvu is not liable for any orders, payments, or disputes between a user and their customers |
| Platform provided "as is" | Webvu makes no warranties of uptime, fitness for purpose, or error-free operation |
| Limitation of liability | Webvu's total liability is limited to the amount paid by the user in the preceding 12 months |
| Prohibited content | Users must not publish illegal, defamatory, infringing, or harmful content |
| Termination | Webvu reserves the right to suspend or terminate accounts that violate the terms |
| Governing law | Specify applicable jurisdiction |

**Acceptance is recorded at slug creation:** the `POST /slug` API stores a `termsAcceptedAt` timestamp on the `Website` entity when the user submits the form with the checkbox checked. The API rejects the request with `400` if `termsAccepted: true` is not present in the body.

---

## API

### Tech Stack

- **Framework**: NestJS
- **ORM**: TypeORM (`@nestjs/typeorm`)
- **Database**: PostgreSQL
- **Auth**: Passport.js — Google OAuth strategy only; JWT for session tokens
- **Email**: Nodemailer (or a transactional provider such as Resend / SendGrid) for verification codes and notifications

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
| `createdAt` | timestamp | |

OAuth provider linkage is stored in `OAuthAccount` (see Authentication section), not on this entity. This allows future providers to be added without schema changes.

#### `Website`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | varchar unique | e.g. `beardbaker` |
| `name` | varchar | business display name |
| `notificationEmail` | varchar | verified business email for notifications |
| `notificationEmailVerified` | boolean | |
| `termsAcceptedAt` | timestamp | set at slug creation; null if terms not yet accepted |
| `theme` | jsonb | current theme object |
| `pages` | jsonb | current pages + blocks array |
| `ownerId` | uuid FK → User | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

#### `WebsiteVersion`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `websiteId` | uuid FK → Website | |
| `theme` | jsonb | snapshot at save time |
| `pages` | jsonb | snapshot at save time |
| `createdAt` | timestamp | version timestamp |

#### `Submission`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `websiteId` | uuid FK → Website | |
| `type` | enum: `contact`, `order` | |
| `data` | jsonb | all form fields submitted by visitor |
| `status` | enum: `unread`, `read`, `in_progress`, `completed`, `cancelled` | default `unread` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

#### `PageVisit`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `websiteId` | uuid FK → Website | |
| `pagePath` | varchar | e.g. `/products` |
| `visitedAt` | timestamp | |

#### `SupportTicket`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → User | ticket author |
| `title` | varchar | |
| `description` | text | |
| `status` | enum: `open`, `in_progress`, `resolved`, `closed` | default `open` |
| `assignedToId` | uuid FK → User nullable | must have role `admin` or `support` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

#### `SupportTicketReply`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `ticketId` | uuid FK → SupportTicket | |
| `authorId` | uuid FK → User | support agent who replied |
| `body` | text | |
| `createdAt` | timestamp | |

#### `AdminUser`

_No separate entity — admin and support users are regular `User` rows with `role` set to `admin` or `support`. These are bootstrapped directly in the database during deployment. There is no self-registration path for admin accounts._

---

### Modules & Endpoints

#### Auth (`/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/google` | public | Exchange Google OAuth code for JWT |
| `GET` | `/auth/me` | JWT | Return current authenticated user |

#### Slug & Email Verification (`/slug`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/slug/check/:slug` | JWT | Check slug availability (`{ available: bool }`) |
| `POST` | `/slug` | JWT | Create slug; body must include `termsAccepted: true` and valid Altcha payload; sends verification code to provided email; rejected with `400` if terms not accepted |
| `POST` | `/slug/verify` | JWT | Submit 6-digit code; marks email verified and activates website |
| `POST` | `/slug/resend-code` | JWT | Resend verification code (rate-limited) |

#### Websites (`/websites`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/websites/:slug` | public | Fetch full website JSON (theme + pages) for SSR renderer |
| `GET` | `/websites/me` | JWT | Fetch authenticated user's own website |
| `PATCH` | `/websites/me` | JWT | Save pages and/or theme; creates a new `WebsiteVersion` snapshot |
| `PATCH` | `/websites/me/notification-email` | JWT | Update notification email; triggers re-verification flow |

#### Versions (`/websites/me/versions`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/websites/me/versions` | JWT | List all versions (id, createdAt) newest first |
| `GET` | `/websites/me/versions/:id` | JWT | Fetch a specific version snapshot (theme + pages) |
| `POST` | `/websites/me/versions/:id/revert` | JWT | Revert to version — copies snapshot as a new version and sets it as current |

#### Submissions (`/submissions`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/submissions/:slug` | public | Visitor submits contact or order form; request body must include valid Altcha payload; stores submission + sends notification email to owner |
| `GET` | `/submissions` | JWT | List owner's submissions; filterable by `type` and `status` |
| `GET` | `/submissions/:id` | JWT | Get single submission detail; auto-transitions status from `unread` → `read` |
| `PATCH` | `/submissions/:id/status` | JWT | Update submission status |

#### Analytics (`/analytics`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/analytics/visit` | public (internal) | Record a page visit (called server-side by SSR renderer, not from browser) |
| `GET` | `/analytics/me` | JWT | Get visit stats for owner's website; query params: `from`, `to` |

Response shape for `GET /analytics/me`:
```json
{
  "totalVisits": 1240,
  "uniqueVisitors": 830,
  "mostVisitedPage": "/products",
  "timeline": [
    { "date": "2026-05-01", "visits": 42 },
    ...
  ],
  "byPage": [
    { "path": "/", "visits": 510, "percentage": 41 },
    { "path": "/products", "visits": 390, "percentage": 31 },
    ...
  ]
}
```

#### Support Tickets — User (`/support`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/support/tickets` | JWT | List user's own tickets |
| `POST` | `/support/tickets` | JWT | Create a new ticket |
| `GET` | `/support/tickets/:id` | JWT | Get ticket detail + replies |

#### Admin Auth (`/admin/auth`)

_No separate admin auth endpoint. Admin and support users log in via the same `POST /auth/google` flow. The returned JWT includes the user's `role` claim. The admin UI (`admin.webvu.io`) reads the role and shows the appropriate views; the API guards check the role on protected admin routes._

#### Admin — Platform Stats (`/admin/stats`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/stats/overview` | Admin JWT | Total users, active sites, total visits; query params: `from`, `to` |
| `GET` | `/admin/stats/timeline` | Admin JWT | Platform-wide daily visits; query params: `from`, `to` |
| `GET` | `/admin/stats/top-sites` | Admin JWT | Top 10 mini websites by visits in period; query params: `from`, `to` |

#### Admin — Support Tickets (`/admin/support`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/support/tickets` | Admin/Support JWT | List tickets; query params: `status`, `assignedTo`, `tab` (unassigned/mine/all) |
| `GET` | `/admin/support/tickets/:id` | Admin/Support JWT | Ticket detail + replies |
| `POST` | `/admin/support/tickets/:id/assign` | Admin/Support JWT | Assign ticket to self |
| `POST` | `/admin/support/tickets/:id/reassign` | Admin JWT | Reassign ticket to another user with `admin` or `support` role |
| `POST` | `/admin/support/tickets/:id/reply` | Admin/Support JWT | Add a reply to the ticket thread |
| `PATCH` | `/admin/support/tickets/:id/status` | Admin/Support JWT | Update ticket status; triggers email to user on `resolved` or `closed` |

---

### Captcha — Altcha

Altcha (<https://altcha.org>) is used for bot protection on public-facing forms. It is open source (MIT), self-hostable, and requires no external service or user account.

**How it works:**
Altcha uses a server-issued proof-of-work challenge. The browser widget solves the challenge client-side (CPU-bound, typically < 1 second) and produces a signed payload. The payload is submitted with the form and verified server-side. No cookies, no tracking, no third-party requests.

**Protected surfaces:**
| Surface | Form |
|---|---|
| Slug creation modal (Step 1) | `POST /slug` |
| Contact form on live user website | `POST /submissions/:slug` |
| Order form on live user website | `POST /submissions/:slug` |

**Flow:**
1. On form mount, browser calls `GET /captcha/challenge` to obtain a fresh challenge
2. Altcha widget solves the challenge and emits a base64-encoded payload
3. Payload is included in the form submission as `altchaPayload`
4. Server calls the Altcha verification utility before processing the request; rejects with `400` if invalid or expired

**Endpoint:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/captcha/challenge` | public | Issue a new Altcha proof-of-work challenge |

Challenge expiry: 5 minutes. Solved payloads are stored server-side and rejected on reuse (replay protection).

---

### Guards & Roles

- `JwtAuthGuard` — validates JWT on protected user routes
- `AdminJwtAuthGuard` — validates JWT and checks `role` is `admin` or `support`
- `AdminOnlyGuard` — restricts to `admin` role only (reassign, platform stats)

---

### NestJS Module Structure

```
src/
  auth/
  slug/
  websites/
  versions/
  submissions/
  analytics/
  captcha/          ← Altcha challenge issuance and payload verification
  support/
  admin/
    auth/
    stats/
    support/
  mail/             ← shared mail service (verification codes, notifications, ticket updates)
  database/         ← TypeORM config + entities
```
