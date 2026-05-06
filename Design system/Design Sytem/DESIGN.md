---
name: Institutional Dark Mode
colors:
  surface: '#101415'
  surface-dim: '#101415'
  surface-bright: '#363a3b'
  surface-container-lowest: '#0b0f10'
  surface-container-low: '#191c1e'
  surface-container: '#1d2022'
  surface-container-high: '#272a2c'
  surface-container-highest: '#323537'
  on-surface: '#e0e3e5'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#e0e3e5'
  inverse-on-surface: '#2d3133'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#b9c7e0'
  on-secondary: '#233144'
  secondary-container: '#3c4a5e'
  on-secondary-container: '#abb9d2'
  tertiary: '#adc6ff'
  on-tertiary: '#002e6a'
  tertiary-container: '#71a1ff'
  on-tertiary-container: '#00367a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#101415'
  on-background: '#e0e3e5'
  surface-variant: '#323537'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.08em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  margin-mobile: 16px
  margin-desktop: 32px
  gutter: 16px
---

## Brand & Style

This design system is built on the pillars of **Institutional Precision** and **Technical Transparency**. It is designed for high-stakes financial environments where clarity and speed are paramount, but aesthetic sophistication is required to convey prestige.

The style is a synthesis of **Minimalism** and **Glassmorphism**. By stripping away unnecessary decorative elements and focusing on a core palette of deep obsidian and emerald, the UI directs the user's attention to market data and execution. Glassmorphism is used sparingly as a functional layer to indicate hierarchy and "above-surface" presence for modals and overlays, ensuring the interface feels deep and immersive rather than flat and static.

## Colors

The color strategy for this design system prioritizes legibility in low-light environments. 
- **The Core:** The background uses a deep obsidian (#0F172A), providing a stable, high-contrast foundation that reduces eye strain during long trading sessions.
- **Action & Success:** Emerald Green (#10B981) is the primary semantic and action color, used for buy orders, profit indicators, and primary CTAs.
- **Depth Gradients:** To avoid a "flat" dark mode, subtle gradients transitioning from deep slate to obsidian are applied to cards and containers.
- **Accents:** A secondary palette of slate grays (#64748B) handles inactive states and borders, while a tertiary blue is reserved for informational highlights.

## Typography

The typography utilizes **Inter** for its exceptional clarity and high x-height, which is critical for reading dense financial figures.

Hierarchy is established through weight and tracking rather than just size. **Generous tracking (letter-spacing)** is applied to labels and small captions to ensure they remain legible against dark backgrounds. For numeric data and price feeds, use the medium weight to ensure "glowing" text does not bleed into the background. Headlines should remain tight and authoritative, while body copy is given extra line-height to facilitate scanning of long-form reports or terms.

## Layout & Spacing

This design system employs a **12-column fixed grid** for desktop and a **4-column fluid grid** for mobile. The spacing rhythm is based on a **4px baseline**, ensuring that all elements align perfectly with the text's line height.

Layouts should favor high-density information in the center with wide, generous margins on the periphery to maintain a "premium" feel. Components like order books and charts should use `md` (16px) gutters to maintain separation without wasting valuable screen real estate.

## Elevation & Depth

In this design system, depth is communicated through **Glassmorphism and Tonal Layering**.

1.  **Base Layer:** The obsidian background (#0F172A).
2.  **Mid Layer (Cards):** Subtle slate borders (1px, 10% white opacity) and a background-blur (12px to 20px) create a frosted glass effect that feels light despite the dark palette.
3.  **Top Layer (Modals/Popovers):** These use a more pronounced background blur and a subtle 1px inner stroke to simulate a light source from above.

Shadows are avoided in favor of **inner glows and border tints**, which look cleaner and more modern on OLED displays.

## Shapes

The shape language is characterized by **large, soft radii** that contrast with the "hard" data of financial markets. This creates a more approachable and modern user experience.

- **Standard Containers:** A base radius of **16px** (Level 2) is used for all primary cards and panels.
- **Buttons:** Buttons follow a **24px** radius or a full pill-shape to make them distinct from informational containers.
- **Small Elements:** Tooltips and tags use a **8px** radius to maintain visual consistency without looking overly circular.

## Components

### Buttons
Primary action buttons use the Emerald Green (#10B981) with high-contrast black text for maximum visibility. Secondary buttons should be transparent with a subtle 1px slate border and white text.

### Cards
Cards are the primary vehicle for glassmorphism. They must include a `backdrop-filter: blur(16px)` and a linear-gradient background (Top-left: white at 5% opacity to Bottom-right: white at 2% opacity).

### Input Fields
Inputs are dark-filled (#1E293B) with a 1px border that glows Emerald Green when focused. Use Inter's mono-spaced numeric features for amount inputs to ensure numbers don't jump during typing.

### Financial Indicators
- **Profit/Loss Chips:** Rounded pill shapes with subtle background tints (Emerald for profit, Ruby for loss) and high-contrast text.
- **Sparklines:** Clean, single-pixel width lines with a gradient area fill below the curve to show historical trends without cluttering the view.

### Checkboxes & Radios
These should feel like "toggles" or "switches" where possible, using the primary Emerald Green for the active state to reinforce the "on" or "go" mental model.