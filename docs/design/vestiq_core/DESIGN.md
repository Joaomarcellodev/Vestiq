---
name: Vestiq Core
colors:
  surface: '#fcf8ff'
  surface-dim: '#dbd7ec'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f2ff'
  surface-container: '#f0ebff'
  surface-container-high: '#eae6fa'
  surface-container-highest: '#e4e0f4'
  on-surface: '#1b1a28'
  on-surface-variant: '#4c4453'
  inverse-surface: '#302f3e'
  inverse-on-surface: '#f3eeff'
  outline: '#7d7384'
  outline-variant: '#cec2d5'
  surface-tint: '#7e38c6'
  primary: '#56009a'
  on-primary: '#ffffff'
  primary-container: '#7027b8'
  on-primary-container: '#dab6ff'
  inverse-primary: '#dbb8ff'
  secondary: '#b1008a'
  on-secondary: '#ffffff'
  secondary-container: '#fe4cca'
  on-secondary-container: '#5d0047'
  tertiary: '#3b3850'
  on-tertiary: '#ffffff'
  tertiary-container: '#524f68'
  on-tertiary-container: '#c6c2e0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#efdbff'
  primary-fixed-dim: '#dbb8ff'
  on-primary-fixed: '#2b0052'
  on-primary-fixed-variant: '#6415ac'
  secondary-fixed: '#ffd8eb'
  secondary-fixed-dim: '#ffaedd'
  on-secondary-fixed: '#3b002c'
  on-secondary-fixed-variant: '#880069'
  tertiary-fixed: '#e4dffe'
  tertiary-fixed-dim: '#c8c3e1'
  on-tertiary-fixed: '#1b192f'
  on-tertiary-fixed-variant: '#47445d'
  background: '#fcf8ff'
  on-background: '#1b1a28'
  surface-variant: '#e4e0f4'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
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
  xl: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is built for a premium B2B fashion resale platform, balancing the high-energy world of fashion with the rigorous demands of enterprise SaaS. The brand personality is **authoritative, efficient, and sophisticated**. 

The style utilizes a **Corporate Modern** foundation with **Minimalist** execution. It avoids traditional e-commerce "softness" in favor of structured data layouts, crisp visual hierarchy, and intentional whitespace. The goal is to provide a "pro-tool" feel that empowers resellers to manage complex inventories with precision, utilizing subtle depth and a vibrant but controlled color palette to signal premium quality.

## Colors

The palette is anchored by **Deep Purple**, providing a sense of luxury and stability, while the **Magenta** accent is used sparingly for high-priority calls to action and critical status indicators. 

- **Primary (#7027B8):** Used for primary actions, active states, and branding elements.
- **Secondary (#D21FA5):** Used for accents, highlights, and promotional triggers.
- **Surface & Background:** A cool-toned off-white (#F8F7FA) serves as the canvas, while pure white (#FFFFFF) defines elevated surfaces like cards and modals.
- **Text:** Primary text uses a near-black navy (#17152B) for maximum legibility, with secondary text in a muted slate (#646273) for metadata and labels.

## Typography

The design system uses **Plus Jakarta Sans** for its modern, geometric clarity and friendly yet professional atmosphere. 

- **Hierarchy:** Use bold weights for headlines to create a strong "editorial" feel common in fashion, while maintaining a clear scale for data-heavy dashboard views.
- **Labels:** Small labels and captions use a semi-bold weight and increased letter spacing to ensure legibility when used in tight UI clusters or data tables.
- **Mobile Adaption:** Headlines scale down significantly on mobile to prevent awkward wrapping, ensuring the professional "SaaS" aesthetic remains intact on smaller viewports.

## Layout & Spacing

The layout is built on a **4px grid system** for granular control. 

- **Grid Model:** Use a 12-column fluid grid for desktop with 24px gutters. For mobile, switch to a 4-column grid with 16px gutters.
- **Rhythm:** Vertical spacing should follow a consistent doubling pattern (8, 16, 32, 64) to maintain a logical flow. 
- **Density:** Dashboards should utilize a "Medium" density—comfortable enough for long-term use but tight enough to display significant amounts of inventory data without excessive scrolling.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layering** and **Ambient Shadows**. 

- **The Base:** The background (#F8F7FA) is the lowest level. 
- **The Surface:** Cards and containers sit on the background at "Level 1" depth. They use a subtle 1px border (#E5E2EA) and a soft, diffused shadow (0px 4px 20px rgba(23, 21, 43, 0.04)) to appear lifted.
- **The Interactive:** Overlays, dropdowns, and modals sit at "Level 2". These utilize a more pronounced shadow (0px 12px 32px rgba(23, 21, 43, 0.08)) and no border to emphasize their priority over the underlying content.

## Shapes

The shape language is consistently **Rounded**, providing a sophisticated and modern feel.

- **Components:** Buttons and input fields use a standard 8px radius (rounded-md).
- **Containers:** Larger elements like cards and dashboard widgets use a 12px radius (rounded-lg) to create a softer, more premium framing for content.
- **Icons:** Use icons with rounded terminals and a 2px stroke weight to match the UI's geometry.

## Components

### Buttons
- **Primary:** Solid #7027B8 with white text. 8px radius.
- **Secondary:** Outlined with #E5E2EA border, #17152B text.
- **Ghost:** No border, #646273 text, purple tint on hover.

### Input Fields
- **Default:** White fill, #E5E2EA border, 8px radius. 
- **Focus State:** 2px solid #7027B8 border with a subtle 4px purple outer glow.

### Cards
- **Product Card:** 12px radius, white surface, subtle shadow. High-quality imagery should fill the top half, with a 16px padding for text content.
- **Data Widget:** 12px radius, white surface, 1px border. Use 24px internal padding for chart containers.

### Chips & Badges
- **Status Tags:** Use low-saturation background tints (e.g., light purple for "In Review", light green for "Sold") with high-contrast text for accessibility. 32px height (pill-shaped).

### Lists & Tables
- **Data Tables:** Zebra striping is avoided. Use 1px bottom borders (#E5E2EA) for rows and 16px vertical padding. Headers should be all-caps using `label-md` typography.