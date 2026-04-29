# TruCheq Design System

## Overview

TruCheq uses a **dark-first** design system built on:
- **Tailwind CSS v4** with `@tailwindcss/postcss`
- **shadcn/ui** (new-york style) for base components
- **@worldcoin/mini-apps-ui-kit-react** for Mini App navigation
- **Framer Motion** for animations

All color references go through **CSS custom properties** (semantic tokens) defined in `globals.css`. Raw hex values should NOT be used in component code — use Tailwind's semantic classes instead.

## Color Palette

### Semantic Tokens (CSS Variables)

| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| `--background` | `#070709` | `bg-background` | Deepest background — app shell, page bg |
| `--foreground` | `#F8FAFC` | `text-foreground` | Primary text on dark backgrounds |
| `--card` | `#16161A` | `bg-card` | Card/panel surface — elevated containers |
| `--card-foreground` | `#F8FAFC` | `text-card-foreground` | Text on card surfaces |
| `--popover` | `#16161A` | `bg-popover` | Popover/dropdown surface |
| `--primary` | `#00D632` | `bg-primary` / `text-primary` | TruCheq green — brand accent, CTAs, active states |
| `--primary-foreground` | `#070709` | `text-primary-foreground` | Text on primary (dark, for contrast) |
| `--secondary` | `#1E293B` | `bg-secondary` | Secondary surfaces |
| `--muted-foreground` | `#94A3B8` | `text-muted-foreground` | Secondary/placeholder text |
| `--destructive` | `#EF4444` | `bg-destructive` | Error/danger states |
| `--border` | `#1E293B` | `border-border` | Default border color |
| `--ring` | `#00D632` | `ring-ring` | Focus ring color |

### Verification Badge Colors

| Level | Text Color | Background | Border |
|---|---|---|---|
| **Orb** | `text-primary` | `bg-primary/10` | `border-primary/20` |
| **Device** | `text-blue-400` | `bg-blue-500/10` | `border-blue-500/20` |
| **Unverified** | `text-white/30` | `bg-white/[0.06]` | `border-white/[0.08]` |

### World UI Kit Colors (defined in `@theme inline`)

The `@worldcoin/mini-apps-ui-kit-react` color palette is mapped in `globals.css` `@theme inline` block. Key ones:
- `--color-brand-primary`: `0 194 48` → maps to TruCheq green
- `--color-success-600`: `0 194 48` → same as brand primary
- `--color-gray-900`: `24 24 24` → close to `--background`

## Typography

- **Font family**: Geist Sans (`--font-geist-sans`) / Geist Mono (`--font-geist-mono`)
- **Headings**: `font-black`, `uppercase`, `tracking-widest` / `tracking-tight`
- **Body text**: `text-sm`, `font-medium` / `font-bold`
- **Labels**: `text-[10px]`, `font-black`, `uppercase`, `tracking-widest`
- **Monospace**: `font-mono` for addresses, codes, tx hashes

### Common Text Patterns

```
Section title:   text-sm font-black text-white uppercase tracking-widest
Card title:      text-lg font-black text-white tracking-tight
Page title:      text-2xl font-black text-white tracking-tight
Description:     text-xs text-white/40
Badge label:     text-[10px] font-black uppercase tracking-widest
Price:           text-lg font-black italic tracking-tighter text-primary
Address:         text-xs font-mono text-white/50 truncate
```

## Component Conventions

### Cards

```tsx
// Standard card (elevated panel)
<div className="rounded-3xl bg-card/90 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">

// Compact card (list items)
<div className="rounded-2xl bg-card/90 backdrop-blur-xl p-3 shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-card/95 transition-colors">

// Inner dark field (within cards)
<div className="p-3 rounded-xl bg-black/40">
```

### Buttons

```tsx
// Primary CTA
<Button className="w-full rounded-xl bg-primary text-primary-foreground font-black h-12 text-sm shadow-[0_4px_16px_rgba(0,214,50,0.3)]">

// Secondary/ghost
<Button variant="outline" className="rounded-xl border-white/10 text-white/60 hover:text-white">

// Destructive
<Button variant="ghost" className="text-white/30 hover:bg-red-500/10 hover:text-red-400">
```

### Verification Badges

```tsx
// Orb
<Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-[9px] font-black uppercase px-1.5 py-0">
  <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Orb
</Badge>

// Device
<Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-[9px] font-black uppercase px-1.5 py-0">
  <Smartphone className="w-2.5 h-2.5 mr-0.5" /> Device
</Badge>

// Unverified
<Badge variant="outline" className="border-white/10 text-white/30 bg-white/[0.03] text-[9px] font-black uppercase px-1.5 py-0">
  <User className="w-2.5 h-2.5 mr-0.5" /> Unverified
</Badge>
```

### Animations

```tsx
// Card enter animation
<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

// Tab switch
<AnimatePresence mode="wait">
  <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} />
</AnimatePresence>

// FAB pulse glow
className="animate-pulse-glow"  /* defined in globals.css utilities */
```

## Layout

- **Max width**: `max-w-lg mx-auto` (32rem / 512px — mobile-first)
- **Content padding**: `px-4` horizontal, `pt-4` top, `pb-[calc(env(safe-area-inset-bottom)+5rem)]` bottom (space for tab bar)
- **Safe area**: `env(safe-area-inset-bottom)` for iOS notch
- **Mini App offset**: `bottom-[var(--world-nav-height)]` for World App's native nav bar

## Icon Conventions

- **Icon library**: Lucide React (via shadcn default)
- **Prefix**: `Lucide` prefix for named imports from `lucide-react` in MarketTab; direct names elsewhere
- **Sizes**: `w-3 h-3` (inline), `w-4 h-4` (standard), `w-5 h-5` (section), `w-6 h-6` (header), `w-10 h-10` (hero)

## shadcn/ui Components Used

| Component | Path | Notes |
|---|---|---|
| Button | `ui/button.tsx` | Primary UI element — all CTAs |
| Badge | `ui/badge.tsx` | Verification levels, tags |
| Card | `ui/card.tsx` | Market listing cards |
| Input | `ui/input.tsx` | Search, chat, forms |
| Skeleton | `ui/skeleton.tsx` | Loading states |
| Switch | `ui/switch.tsx` | Agent toggle, landing page |
| Avatar | `ui/avatar.tsx` | Landing page only |
| Separator | `ui/separator.tsx` | Dividers |
| ScrollArea | `ui/scroll-area.tsx` | Scrollable regions |
| Sonner (Toaster) | `ui/sonner.tsx` | Toast notifications |

## File Structure

```
src/components/
  ui/              ← shadcn/ui primitives (do not edit directly)
  AppShell.tsx     ← Main layout + tab navigation
  ChatTab.tsx      ← XMTP messaging
  FeedTab.tsx      ← Listing feed + create listing
  HomeContent.tsx  ← Entry point (tab router)
  LandingPage.tsx  ← /about marketing page
  MarketTab.tsx    ← Alternative market view (unused in main flow?)
  ProfileTab.tsx   ← User profile + World ID verification + agent settings
  Providers.tsx    ← Context providers (wagmi, Auth, XMTP)
  ConnectButton.tsx ← wagmi injected() wallet connect (standalone browser)
```

## Anti-patterns to Avoid

1. ❌ **Raw hex in components**: Don't use `bg-[#16161A]` — use `bg-card`
2. ❌ **Inline color values**: Don't use `text-[#94A3B8]` — use `text-muted-foreground`
3. ❌ **Hardcoded shadows**: Prefer semantic shadow patterns from the convention above
4. ❌ **World ID as login**: Wallet connection = login. World ID = optional verification badge.
5. ❌ **Conditional hooks**: Don't call wagmi hooks conditionally — use the `WagmiAuthSync` pattern instead.

## Environment-Specific Rendering

| Feature | Mini App (World App) | Standalone Browser |
|---|---|---|
| **Login** | `MiniKit.walletAuth()` auto on init | wagmi `ConnectButton` (injected) |
| **Header** | `@worldcoin/mini-apps-ui-kit-react` `TopBar` | Custom `StandaloneHeader` |
| **Bottom nav** | `BottomBar` with `world-nav-height` offset | Custom bottom tabs |
| **Payments** | `MiniKit.pay()` native | TODO: wagmi transaction |
| **World ID** | Profile tab → IDKit | Profile tab → IDKit |
| **Auth gate** | Auto (no overlay needed) | Inline prompts per tab (no blocking overlay) |
