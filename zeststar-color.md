# ZestStar Color Scheme

Source: `frontend/app/globals.css`

---

## Brand Colors

| Role | Token | Hex | Usage |
|---|---|---|---|
| **Primary** | `primary` | `#C15F3C` | Buttons, CTAs, active states, primary actions |
| **Primary Dark** | `primary-dark` | `#A04B2D` | Hover / pressed state on primary elements |
| **Primary Light** | `primary-light` | `#FBEEE8` | Chip backgrounds, hover fills, tinted surfaces |
| **Accent** | `accent` | `#D4960F` | Discount badges, savings text, highlights |
| **Accent Dark** | `accent-dark` | `#B07808` | Hover on accent elements |
| **Yellow** | `yellow` | `#FDD835` | Star ratings |

## Neutral Colors

| Role | Token | Hex | Usage |
|---|---|---|---|
| **Background** | `cream` | `#FAFAF5` | Page background, card fills |
| **Text (Primary)** | `dark` | `#1C1C1E` | Headings, primary body text |
| **Text (Secondary)** | `muted` | `#6B6B6B` | Labels, placeholders, secondary text |
| **Border** | `border` | `#EEEEEE` | Card borders, dividers, input borders |

---

## CSS Variables (globals.css)

```css
--color-primary:       #C15F3C;
--color-primary-dark:  #A04B2D;
--color-primary-light: #FBEEE8;
--color-accent:        #D4960F;
--color-accent-dark:   #B07808;
--color-yellow:        #FDD835;
--color-cream:         #FAFAF5;
--color-dark:          #1C1C1E;
--color-muted:         #6B6B6B;
--color-border:        #EEEEEE;
```

---

## Typography

| Role | Font | Usage |
|---|---|---|
| **Body / UI** | DM Sans | All body text, labels, buttons, inputs |
| **Headings / Display** | Playfair Display | Product names, section titles, hero text |

---

## Usage in Tailwind (Web)

```html
<!-- Primary button -->
<button class="bg-primary hover:bg-primary-dark text-white">...</button>

<!-- Accent badge -->
<span class="bg-accent text-white">10% OFF</span>

<!-- Card -->
<div class="bg-white border border-border rounded-2xl">...</div>

<!-- Page background -->
<div class="bg-cream">...</div>

<!-- Secondary text -->
<p class="text-muted">...</p>
```

---

## Usage in React Native (NativeWind)

Add to `tailwind.config.js` in the mobile project:

```js
theme: {
  extend: {
    colors: {
      primary:       '#C15F3C',
      'primary-dark': '#A04B2D',
      'primary-light': '#FBEEE8',
      accent:        '#D4960F',
      'accent-dark': '#B07808',
      yellow:        '#FDD835',
      cream:         '#FAFAF5',
      dark:          '#1C1C1E',
      muted:         '#6B6B6B',
      border:        '#EEEEEE',
    },
  },
},
```

Same Tailwind class names work in both web and mobile — consistent design across platforms.
