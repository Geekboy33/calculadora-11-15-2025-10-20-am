# 🎨 DAES CoreBanking - Sistema de Diseño Profesional

## Nivel: Enterprise FinTech / Neo-Bank

Inspirado en las mejores plataformas del mundo:
- **Revolut** - Banking digital
- **N26** - Neo-banco europeo
- **Stripe** - Pagos institucionales
- **Wise** - Transferencias internacionales
- **Plaid** - Infraestructura financiera

---

## 🎨 PALETA DE COLORES

### Primary - Professional Blue
```
Uso: Botones principales, enlaces, acciones primarias
#3b82f6 (500) - Base
#2563eb (600) - Hover
#1d4ed8 (700) - Active
```

### Success - Modern Green
```
Uso: Confirmaciones, completados, aumentos
#22c55e (500) - Base
#16a34a (600) - Hover
#15803d (700) - Active
```

### Warning - Professional Amber
```
Uso: Advertencias, estados pendientes
#f59e0b (500) - Base
#d97706 (600) - Hover
#b45309 (700) - Active
```

### Danger - Modern Red
```
Uso: Errores, eliminaciones, alertas críticas
#ef4444 (500) - Base
#dc2626 (600) - Hover
#b91c1c (700) - Active
```

### Accent Colors
```
Cyan: #06b6d4 - Datos financieros, métricas
Purple: #8b5cf6 - Premium features, API
```

---

## 🖋️ TIPOGRAFÍA

### Familia de Fuentes

```css
Primary: Inter (Sans-serif)
- Weights: 300, 400, 500, 600, 700, 800, 900
- Uso: Textos generales, UI

Display: Poppins (Display)
- Weights: 600, 700, 800, 900
- Uso: Títulos, headers, números grandes

Mono: JetBrains Mono (Monospace)
- Weights: 400, 500, 600, 700
- Uso: Códigos, IDs, números de cuenta
```

### Escala de Tamaño

```
xs:    0.75rem  (12px)  - Labels, metadata
sm:    0.875rem (14px)  - Texto secundario
base:  1rem     (16px)  - Texto principal
lg:    1.125rem (18px)  - Subtítulos
xl:    1.25rem  (20px)  - Títulos de sección
2xl:   1.5rem   (24px)  - Headers
3xl:   1.875rem (30px)  - Títulos principales
4xl:   2.25rem  (36px)  - Hero text
```

---

## 📐 ESPACIADO

### Scale (8px base)
```
1:  0.25rem  (4px)
2:  0.5rem   (8px)
3:  0.75rem  (12px)
4:  1rem     (16px)
6:  1.5rem   (24px)
8:  2rem     (32px)
12: 3rem     (48px)
16: 4rem     (64px)
```

---

## 🔲 COMPONENTES

### Cards Premium
```tsx
<div className="card-premium hover-lift">
  <h3 className="font-display text-xl">Título</h3>
  <p className="text-neutral-400">Contenido</p>
</div>
```

### Metric Cards
```tsx
<div className="metric-card">
  <div className="text-sm text-neutral-400">Total Balance</div>
  <div className="text-3xl font-bold text-primary-400">
    $1,250,000
  </div>
</div>
```

### Buttons
```tsx
<button className="btn-primary">
  Primary Action
</button>

<button className="btn-success">
  Confirm
</button>
```

### Badges
```tsx
<span className="badge badge-success">Active</span>
<span className="badge badge-warning">Pending</span>
<span className="badge badge-danger">Failed</span>
<span className="badge badge-primary">New</span>
```

### Inputs
```tsx
<input className="input-premium" />
```

---

## 🌓 DARK THEME

### Backgrounds
```css
Primary:   #0a0e1a  (Muy oscuro, profesional)
Secondary: #131720  (Cards, panels)
Tertiary:  #1a1f2e  (Elevated components)
Elevated:  #242938  (Modals, dropdowns)
```

### Borders
```css
Subtle:    rgba(255, 255, 255, 0.06)
Normal:    rgba(255, 255, 255, 0.08)
Elevated:  rgba(255, 255, 255, 0.12)
Focus:     rgba(59, 130, 246, 0.3)
```

---

## ✨ EFECTOS

### Shadows
```css
glow:           0 0 20px rgba(59, 130, 246, 0.3)
glow-success:   0 0 20px rgba(34, 197, 94, 0.3)
premium:        0 25px 50px -12px rgba(0, 0, 0, 0.25)
```

### Glassmorphism
```tsx
<div className="glass-effect">
  backdrop-filter: blur(20px)
</div>
```

### Hover Effects
```tsx
<div className="hover-lift">
  transform: translateY(-4px) on hover
</div>
```

---

## 📱 RESPONSIVE

### Mobile-First Approach

```css
/* Base: Mobile (< 640px) */
padding: 1rem
font-size: 0.875rem

/* Tablet (≥ 768px) */
padding: 1.5rem
font-size: 1rem

/* Desktop (≥ 1024px) */
padding: 2rem
font-size: 1rem
max-width: 1280px
```

### Breakpoints
```
xs:  475px  (Small phones)
sm:  640px  (Phones)
md:  768px  (Tablets)
lg:  1024px (Small laptops)
xl:  1280px (Desktops)
2xl: 1536px (Large screens)
```

---

## 🎯 PRINCIPIOS DE DISEÑO

### 1. Claridad
- Jerarquía visual clara
- Contraste apropiado (WCAG AA)
- Espaciado generoso

### 2. Consistencia
- Mismos colores para mismas acciones
- Espaciado uniforme (8px grid)
- Animaciones coherentes

### 3. Performance
- Transiciones suaves (0.2s - 0.3s)
- Loading states claros
- Skeleton screens

### 4. Accesibilidad
- Contraste de color > 4.5:1
- Focus states visibles
- Navegación por teclado

### 5. Responsive
- Mobile-first
- Touch targets ≥ 44px
- Adaptive layouts

---

## 🔄 TRANSICIONES

### Timing Functions
```css
Ease:    cubic-bezier(0.4, 0, 0.2, 1)  - Standard
Bounce:  cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

### Durations
```
Fast:    0.15s - Hover states
Normal:  0.2s  - Clicks, focus
Slow:    0.3s  - Page transitions
```

---

## 📊 MÉTRICAS Y NÚMEROS

### Formato
```
Montos:     $1,250,000.00 (Inter Bold)
Porcentajes: 125.50% (JetBrains Mono)
IDs:        TXN-ABC123 (JetBrains Mono)
Fechas:     16/11/2025 18:30 (Inter Regular)
```

### Colores por Tipo
```
Positivo: success-500 (#22c55e)
Negativo: danger-500 (#ef4444)
Neutral:  primary-400 (#60a5fa)
Warning:  warning-500 (#f59e0b)
```

---

## 🎨 EJEMPLOS DE USO

### Dashboard Card
```tsx
<div className="card-premium hover-lift animate-slide-in">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-display text-xl text-white">Total Balance</h3>
    <Database className="w-6 h-6 text-primary-400" />
  </div>
  <div className="text-4xl font-bold text-primary-400 font-mono">
    $125,000,000
  </div>
  <div className="text-sm text-success-400 mt-2">
    +12.5% from last month
  </div>
</div>
```

### Transaction List Item
```tsx
<div className="dark-card-elevated hover-lift p-4 rounded-xl">
  <div className="flex items-center gap-2 mb-2">
    <span className="badge badge-success">Completed</span>
    <span className="badge badge-primary">Transfer</span>
  </div>
  <div className="text-white font-semibold">
    Transfer to Main Account
  </div>
  <div className="flex justify-between mt-3">
    <span className="text-neutral-400 text-sm">16/11/2025 18:30</span>
    <span className="text-2xl font-bold text-success-400 font-mono">
      +$50,000.00
    </span>
  </div>
</div>
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

```
✅ Paleta de colores profesional definida
✅ Tipografía Inter + Poppins + JetBrains Mono
✅ Componentes base (cards, buttons, badges)
✅ Dark theme optimizado
✅ Responsive breakpoints
✅ Animaciones suaves
✅ Glassmorphism effects
✅ Shadows premium
✅ Scrollbar personalizado
✅ Mobile-first approach
```

---

## 🚀 PRÓXIMOS PASOS

1. Aplicar design system en módulos principales
2. Actualizar Dashboard con nuevo diseño
3. Mejorar Login screen
4. Optimizar módulos API
5. Refinar responsive mobile

---

**¡Sistema de diseño de nivel Enterprise FinTech implementado!** 🎨✨

