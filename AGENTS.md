# RentFlow – Agent Memory

## Goal
Realign all dashboards to the new role architecture (Webhost, Manager, Landlord, Tenant, Submanager) and implement the UI patterns shown in the HTML mockup files.

## Constraints & Preferences
- Local folder: `C:\Users\hp\Desktop\Rentflow-FINAL-main`
- Repo: `https://github.com/Themugo/Rentflow-FINAL.git` — auto-deploys Vercel from `main`
- Production: `https://app.rentflow.ink` / Supabase `aelzsqxllkypbzslxyju.supabase.co`
- Test accounts: `jimmythemugo@gmail.com` (manager), `kamauwamakena@gmail.com` (tenant), `mugo.james27@gmail.com` (webhost) — all pw `RentFlow@2026!`
- Demo accounts: `demo.manager@rentflow.ink`, `demo.landlord@rentflow.ink` — pw `Demo@2026`
- Edge functions deployed: `send-tenant-invitation`, `create-tenant-account`, `notify-manager-tenant-signup`
- 45 migrations in `supabase/migrations/`

## Build & Verify
- `npm run build` — production build (Vite/Rolldown)
- `npm run dev` — dev server at `http://localhost:5173`
- `npx tsc --noEmit` — TypeScript check
- `npx eslint src` — ESLint
- `npx vitest run` — 125 unit tests (12 files)
- `npm audit` — 0 vulnerabilities
- `npx playwright test` — 14 E2E tests (Chromium)

## Deploy
- `node scripts/deploy-production.mjs --dry-run` — pre-flight checks
- `node scripts/deploy-production.mjs` — deploy (build + edge functions + Vercel push)
- Set secrets: Supabase Dashboard → Edge Functions → Secrets
- Vercel auto-deploys from GitHub `main` branch

## Progress

### Done
- **Sidebar restructured to match `rentflow_full_platform_v2.html` mockup**: Manager nav groups now show Overview (Dashboard), Tenants (Leases, Tenants, Invites, Vacation Notices), Billing (Billing, Water Billing, Statements), Operations (Maintenance, Reports), Account (Settings). Removed Properties group, Communication group, Finance extras, Services.
- **Water Billing standalone page** (`/water-billing`): New property selector + WaterBillingManager integration. Route added for manager, submanager, and agency roles.
- **Invites page** (`/invites`): Wraps InvitationTracker with InviteTenantDialog trigger. Route added for manager, submanager, and agency roles.
- **Statements page** (`/statements`): Wraps PropertyStatementTab with property selector. Route added for manager, submanager, and agency roles.
- **Landlord dashboard tenant PII removed**: Deleted Payment Activity tab (showed tenant names, units, property names). Removed InviteTenantDialog from property cards. Landlord now only sees aggregate revenue, occupancy, and property-level data — zero tenant PII.
- **`can_manage_tenants` removed from all TypeScript types**: Removed from `WebhostPermissions` interface, `AdminPermissionsRow`, `AuthContext.tsx` select query + mapping, `WebhostDashboard.tsx` bootstrap, `supabase/types.ts` (Row/Insert/Update), `useAdminPermissions.ts` comment.
- **AgencyDashboard `agency_id` → `manager_id`**: Fixed deprecated query that referenced `agency_id` column (removed by pending migration). Agency sidebar updated with Invites, Statements links.
- **Agency routes expanded**: Added `/agency/water-billing`, `/agency/invites`, `/agency/statements` routes.
- **Role detection paths updated**: Added `/invites`, `/statements` to `managerPaths` in `AuthContext.tsx`.
- **Agency portal scaffolding** — added `'agency'` to `AppRole` type, `isAgency` to `AuthContext`. Created `AgencyDashboard.tsx` (stats cards, quick actions, sidebar nav), `AgencyAuth.tsx` (emerald-themed login). Routes: `/agency/login`, `/agency` with subroutes for Properties, Tenants, Leases, Billing, Maintenance, Landlords, Reports, Settings.
- **Major refactor from agency→landlord model**: Agency CRUD, filters, grouping, bulk assign removed from `Properties.tsx`.
- **Manager Landlords page** (`/landlords`): `ManagerLandlords.tsx` lists properties with linked landlords, revenue share %.
- **Submanager role-only conversion**: Removed `/submanager` standalone route. Submanagers use manager routes with `viewOnly` wrapper.
- **Rent payment flow**: Multi-modal (STK push, feature phone Paybill, bank transfer), auto SMS+email receipts.
- **Water billing system**: Meter readings per unit, auto-calc charge × rate, "Bill" action.
- **Reports**: Financial/occupancy/maintenance tabs with Chart.js revenue bars/doughnut occupancy chart.

### In Progress
- **Webhost dashboard overhaul**: Remove tenant metrics from Overview stats, add Unlinked Landlords tab filtered by `manager_id IS NULL`, align sidebar to `dashboard_previews.html` (Overview, Managers, Properties, Billing, Tiers, Contracts, Security, Error Logs). Current tab list has several extras (Oversight, Billing Blocks, Webhost Admins, Platform Admins, Activity, Property Types, Payment Settings, Dead-Letter).
- **Tenant dashboard hero card**: Balance card with overdue/pending/clear states from `dashboard_previews.html` mockup.

### Blocked
- New DB migrations (`20260530000000` through `20260601000001`) not yet applied — need Supabase DB password from Project Dashboard → Settings → Database.
- 8 outdated major deps remain: `tailwindcss 3→4`, `date-fns 3→4`, `react-day-picker 8→10`, `recharts 2→3`, `react-resizable-panels 2→4`, `eslint 9→10` + plugins.

## Key Accounts (test)
- Manager: `jimmythemugo@gmail.com` / `RentFlow@2026!`
- Tenant: `kamauwamakena@gmail.com` / `RentFlow@2026!`
- Webhost: `mugo.james27@gmail.com` / `RentFlow@2026!`
- Platform Business: `themugo@rentflow.ink` (needs seeding)
- Platform Admin: `admin@rentflow.ink` (needs seeding)
- Demo Manager: `demo.manager@rentflow.ink` / `Demo@2026`
- Demo Landlord: `demo.landlord@rentflow.ink` / `Demo@2026`

## Supabase
- URL: `https://aelzsqxllkypbzslxyju.supabase.co`
- 45 migrations in `supabase/migrations/`
- Service role key in `scripts/fix-roles.mjs`

## Platform Admin Hierarchy
- `platform_admins` table: 3 tiers — owner (`is_immutable`), business, admin
- Owner: `mugo.james27@gmail.com` — cannot be suspended/deleted
- Business: `themugo@rentflow.ink` — can be suspended by Owner only, can create admins
- Admin: `admin@rentflow.ink` — can be suspended by Owner or Business
- Suspension rules enforced via DB trigger + application-level checks
- UI: Webhost Dashboard → "Platform Admins" tab (owner/business only)

## Customer Billing Blocks
- `customer_billing_blocks` table: per-unit pricing overrides, waivers, discounts
- `price_per_unit` added to `subscription_tiers` (Lite: 40, Pro: 30, Enterprise: 20 KES/unit)
- UI: Webhost Dashboard → "Billing Blocks" tab (owner/business only)
- Supports: per-unit pricing, registration fee waiver, %/flat discounts, custom negotiated blocks

## Webhost Oversight
- `PlatformOversight` component: aggregate stats per manager (properties, units, active tenants)
- No tenant PII exposed
- UI: Webhost Dashboard → "Oversight" tab (all webhosts)

## Role Architecture

### Three-Role Architecture (Webhost sells to three portal types)
```
Tier 1: Platform Ownership
├── Super Webhost (is_immutable)
├── Webhost Admin
└── Webhost Limited Admin
    → NO tenant data access EVER
    → NO tenant tab, NO tenant counts as individuals
    → Sees only system landlords (manager_id IS NULL)

Tier 2: Property Management (three distinct portals)
├── Manager — full operations + collections
│   → Manages tenants directly, collects rent to landlord/own accounts
│   → Owns property relationships, runs enforcement/repairs/services
│   └── Submanager (role, not portal — uses manager routes with permissions)
│       → Created by Manager via Settings → Team
│       → Permission-gated via can()/canWrite() hooks
│
├── Agency — blended agent role
│   → Manages properties ON BEHALF OF landlords (commission model)
│   → Can collect rent to agency accounts OR pass through to landlords
│   → Links landlords to properties with configurable revenue sharing
│   → Full tenant management capabilities (same as manager)
│   → Portal at /agency — own sidebar, login, dashboard
│
└── Landlord — guarded standalone property owner
    → Revenue-only view, NO tenant PII ever
    → Can be linked to Manager (manager_id IS NOT NULL) or Agency
    → System landlords (manager_id IS NULL) visible to webhost
    → Managed landlords invisible to webhost
    → Portal at /landlord/dashboard

Tier 3: Tenants
├── Own portal only (/portal)
├── NO access to other tenants' data
└── NO landlord PII exposure
```

### Access URL Map
| Portal | URL |
|--------|-----|
| Webhost login | `/webhost/login` |
| Manager dashboard | `/` (after login) |
| Agency login | `/agency/login` |
| Agency dashboard | `/agency` |
| Landlord login | `/landlord/login` |
| Landlord dashboard | `/landlord/dashboard` |
| Tenant login | `/tenant/login` |
| Tenant signup | `/tenant/signup` |
| Tenant portal | `/portal` |

### Hard Access Rules
1. **Webhost tenant firewall**: Webhosts can NEVER access tenant data. No tenant routes, no tenant API queries, no `can_manage_tenants` permission.
2. **Landlord split by `manager_id`**: `manager_id IS NOT NULL` = managed (webhost has zero visibility). `manager_id IS NULL` = system (webhost oversight).
3. **Manager data isolation**: All queries scoped by `manager_id = auth.uid()`. No cross-manager data leakage.
4. **Landlord revenue-only view**: Landlords see aggregate revenue, NOT individual tenant names, contact info, or payment breakdowns.

### Role Definitions
| Role | Portal | Route | Who Creates | Description |
|------|--------|-------|-------------|-------------|
| **Webhost** | Own dashboard | `/webhost` | Platform Admin | Sells subscriptions, manages platform. Tiers: super_admin / admin / limited_admin |
| **Agency Team Manager** | Manager dashboard | `/` (via manager routes) | Buys from Webhost | "Boss" of an agency. Manages tenants directly and/or properties for landlords. Agency staff are submanagers. |
| **Agency Staff** | Manager dashboard (restricted) | `/` via manager routes | Agency Team Manager | Role assigned to agency staff. Uses same manager UI with limited permissions. Created via Settings → Team. |
| **Manager** | Own dashboard | `/` | Webhost | Manages tenants on behalf of landlords. Has "Landlords" tab to link property owners. |
| **Submanager** | Manager dashboard (restricted) | `/` via manager routes | Manager | Role (NOT standalone portal). Uses same manager UI but with restricted permissions. Created via Settings → Team. |
| **Landlord** | Guarded standalone portal | `/landlord/dashboard` | Invited by Manager or Webhost | Property owner. Sees aggregate revenue, requests payouts. NO tenant PII. Can be linked to Manager or Agency. |
| **Agency** | Own dashboard | `/agency` | Webhost | Blended agent role. Manages properties for landlords (commission model). Full tenant mgmt. Own login/sidebar. |
| **Tenant** | Own portal | `/portal` | Invitation from Manager | Lives in a unit. Pays rent, submits maintenance, views invoices. |

### Payment Flows
1. **Manager operates, landlord collects**: Manager manages tenants, runs enforcement/repairs/services. Payments go to property owner (landlord). Manager earns via platform subscription.
2. **Agency collects (full management)**: Agency manages tenants directly. Payments go to agency's accounts. Agency earns via management fee.
3. **Agency manages, pays landlord**: Agency manages property for landlord. Payments collected by agency, passed to landlord after deducting commission.
4. **Landlord self-managed**: Landlord operates their own properties independently through their portal.

### Key Tables
- `user_roles` — `(user_id, role: manager|tenant|webhost|submanager|landlord, approval_status)`
- `property_landlords` — `(property_id, landlord_user_id, manager_id, revenue_share_pct, operating_model, payment_destination)`
- `manager_submanagers` — `(manager_id, submanager_user_id)`
- `submanager_permissions` — Permission flags per submanager
- `submanager_property_assignments` — Property access restrictions per submanager

### What Changed
- **No "Agency" tab/management in Properties page**: Agencies are NOT managed by individual managers. Agency Team Managers buy subscriptions from Webhost directly.
- **New "Landlords" tab in Manager sidebar**: Managers link property owners via `/landlords` route.
- **Submanager is a role, not a portal**: Submanagers no longer have `/submanager` route. They use the same manager dashboard with permission restrictions via `can()`/`canWrite()` hooks.
- **Removed agency_id from properties**: Properties no longer have `agency_id` field. Agency relationships are managed through `property_landlords.operating_model`.

## Key Decisions
- **Three-role architecture**: Webhost sells to three portal types — Manager (full ops+collections), Agency (blended agent role), Landlord (guarded standalone, no tenant PII).
- **Agency is a separate portal** at `/agency` with own login, sidebar, and dashboard. Manages properties on behalf of landlords (commission model) and/or collects rent directly.
- **Landlord split by `manager_id`**: `manager_id IS NOT NULL` = managed landlord (visible only to manager, webhost has zero visibility). `manager_id IS NULL` = system landlord (under webhost oversight).
- **Submanager is a role, not a portal**: Submanagers use the same manager dashboard with restricted permissions via `can()`/`canWrite()` hooks. Created by Manager or Agency Team Manager in Settings → Team.
- **Manager-enters-all-data model** (no smartphone required for tenant): manager fills name, email, phone, property, unit, rent, deposit upfront. Tenant only accepts + sets password.
- **Phone on invitation**: `tenant_invitations.phone` column added, pre-filled in `TenantAuth.tsx`.
- **Payment flows**: Manager operates/landlord collects OR agency collects(pays landlord after commission) OR landlord self-managed — configured via `property_landlords.operating_model`.

## Mockup References
- `rentflow_authority_structure.html`: defines hard role hierarchy tiers, access URL map, firewall rules.
- `dashboard_previews.html`: shows Webhost sidebar (Overview, Managers, Properties, Billing, Tiers, Contracts, Security, Error Logs), Landlord property cards with occupancy bars, Tenant hero balance card.
- `rentflow_full_platform_v2.html`: exact Manager sidebar layout (Dashboard, Leases, Tenants, Invites, Vacation Notices, Billing, Water Billing, Statements, Maintenance, Reports, Settings) + Tenant portal nav (Home, Pay Rent, Maintenance, Documents, Vacation Notice).

## Next Steps
1. Complete Agency portal pages: properties, tenants, leases, billing, maintenance, landlords, reports, settings under `/agency/*` routes.
2. Rebuild `WebhostDashboard.tsx`: remove tenant references, add Unlinked Landlords tab, align tabs to mockup (Overview, Managers, Properties, Billing, Tiers, Contracts, Security, Error Logs).
3. Rebuild `LandlordDashboard.tsx`: replace raw tenant payment table with property cards showing occupancy bars, revenue share %, "Your share" per property. No tenant PII at all.
4. Trim manager sidebar to match `rentflow_full_platform_v2.html`: Dashboard, Leases, Tenants, Invites, Vacation Notices, Billing, Water Billing, Statements, Maintenance, Reports, Settings.
5. Remove `can_manage_tenants` from `admin_permissions` table and `WebhostPermissions` type.
6. Block all `/tenants`, `/portal` routes for webhost role in route config.
7. Add `manager_id IS NULL` filter to webhost's landlord queries.
8. Apply pending DB migrations from Supabase Dashboard SQL Editor.
9. Re-deploy edge functions with latest `send-tenant-invitation` (phone support).
10. Remove `agency_id` column from `property_landlords` via migration.

## Relevant Files
- `src/features/webhost/pages/WebhostDashboard.tsx`: needs full rebuild — remove tenants, add unlinked landlords, match sidebar mockup.
- `src/features/landlord/pages/LandlordDashboard.tsx`: rebuild to show property cards with occupancy/revenue bars, no tenant PII.
- `src/shared/components/layout/Sidebar.tsx`: trim manager nav to match `rentflow_full_platform_v2.html`.
- `src/app/routes.ts`: block `/tenants` and `/portal` for webhost role.
- `src/features/properties/pages/Properties.tsx`: agency code already removed; manager property grid is flat.
- `src/features/landlord/pages/ManagerLandlords.tsx`: newly created — manage landlord links per property.
- `src/features/properties/components/PropertyAuthorityPanel.tsx`: operating model config (payment destination per landlord type).
- `src/features/landlord/components/LandlordTeamSettings.tsx`: submanager team mgmt.
- `src/shared/hooks/useRBAC.ts`: permission gating for submanager role.
- `src/features/auth/AuthContext.tsx`: role detection, `submanagerPermissions`.
- `supabase/migrations/20260523000000_operating_model_authority.sql`: operating model on `property_landlords`.
- `supabase/functions/send-tenant-invitation/index.ts`: stores `phone` on invitation, sends email/SMS/WhatsApp.
- `src/features/tenants/components/InviteTenantDialog.tsx`: accepts `preSelectedPropertyId` for property-scoped invites.

## Known Issues
- `manager_profiles` table created by migration 14 — NOT in `_base_schema.sql`
- `zod` v4 installed — `formatValidationErrors` uses `error.issues` (not `error.errors`)
- 8 outdated major deps remain: `tailwindcss 3→4`, `date-fns 3→4`, `react-day-picker 8→10`, `recharts 2→3`, `react-resizable-panels 2→4`, `eslint 9→10` + plugins
- E2E tests credential-gated via env vars
- `activity_logs` RLS requires `actor_id = auth.uid()` — direct inserts return 403; use `rpc('log_activity')` instead
- New migrations (`20260530000000_platform_admin_hierarchy.sql`, `20260530000001_customer_billing_blocks.sql`) must be run against Supabase project
- Platform admin accounts (owner/business/admin) need initial seeding in `platform_admins` table + `user_roles` + `admin_permissions`

## Vercel
- Auto-deploys from GitHub `main` branch
- `vercel.json` configures SPA rewrites + security headers
- CSP allows Supabase, Sentry, Stripe

## Sentry
- DSN in `.env.local` (gitignored)
- Free Dev plan
