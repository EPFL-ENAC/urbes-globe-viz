## URBES Globe Viz - Vue.js Application Structure with Visual Design

### Design Language

**Overall Aesthetic:** Modern, minimalist, dark theme with emphasis on data visualization
**Color Scheme:**

- Primary: Deep black/dark gray backgrounds (#000000 to #1a1a1a)
- Accents: Vibrant project thumbnails (reds, blues, earth tones)
- Text: White/light gray for high contrast
- Interactive elements: Subtle highlights on hover

### Main Views (Pages/Routes)

1. **GlobeView** (Landing Page - `/`)

   **Visual Layout:**

   ```
   ┌─────────────────────────────────────────┐
   │ EPFL URBES    [About] [Contact]         │ ← Minimal top nav, white text
   ├─────────────────────────────────────────┤
   │                                         │
   │           ╭─────────╮                   │
   │          │  🌍 3D   │                   │ ← Large central globe
   │          │  Globe   │                   │   Earth colors (blue/green)
   │           ╰─────────╯                   │   on black background
   │                                         │
   ├─────────────────────────────────────────┤
   │ [📷][📷][📷][📷][📷][📷][📷][📷][📷]    │ ← Horizontal scrolling
   │  Title  Title  Title  Title  ...       │   carousel of square
   └─────────────────────────────────────────┘   project thumbnails
   ```

   **Visual Details:**
   - **Globe:** Smooth 3D sphere, subtle Earth texture, glowing project markers (dots/pins)
   - **Background:** Pure black or very dark gradient
   - **Project Carousel:**
     - Square thumbnails (~100-150px) with satellite/map imagery
     - Gentle rounded corners
     - Small white text labels below each
     - Smooth horizontal scroll (no scrollbar visible)
     - Subtle spacing between cards
   - **Markers on Globe:** Bright colored dots that stand out against Earth

2. **ProjectDetailView** (Project Page - `/project/:id`)

   **Visual Layout:**

   ```
   ┌─────────────────────────────────────────┐
   │ EPFL URBES    [About] [Contact]         │
   ├──────────────┬──────────────────────────┤
   │              │                          │
   │  "MORE"      │   Minimalist Basemap     │ ← Light gray/white map
   │   ◀          │   (Light gray terrain)   │   showing project area
   │              │                          │
   │  Peoples     │   ┌────────────┐         │ ← Curved flow lines
   │  flow        │   │ Info Box   │         │   Building extrusions
   │              │   └────────────┘         │   (3D if applicable)
   │  [📷][📷]    │       ╱╲ ╱╲              │
   │  [📷][📷]    │      ╱  ╲╱  ╲            │
   │  2018  2025  │     Flows/Buildings      │
   │              │                          │
   └──────────────┴──────────────────────────┘
   ```

   **Visual Details:**
   - **Basemap:** Very light gray (#f5f5f5), minimal labels, clean OSM style
   - **Left Drawer/Sidebar:**
     - White or very light background
     - Opens on hover/"MORE" interaction
     - Contains project title, description text, thumbnail grid
     - Timeline visualization (years as clickable thumbnails)
   - **Data Visualizations:**
     - Flow lines: Curved bezier paths in warm colors (orange/red)
     - Buildings: 3D extrusions or colored footprints
     - Subtle shadows for depth
   - **Info Box:** Dark semi-transparent overlay with white text when hovering features

### Component Styling Details

**NavigationBar**

- Height: ~60px
- Background: Transparent or very subtle dark overlay
- Logo: EPFL (red) + URBES text in white
- Links: Simple white text, no buttons, hover underline

**Globe3D**

- Size: Fill most of viewport (leave space for carousel)
- Camera: Smooth orbital controls
- Lighting: Subtle ambient + directional for depth
- Stars/Space: Optional subtle star field background

**ProjectCard** (in Carousel)

- Dimensions: Square (~120x120px to 150x150px)
- Thumbnail: Full-bleed image (satellite, map, or viz)
- Hover: Subtle scale-up (1.05x) + soft shadow
- Text: Title below thumbnail, small sans-serif, 2-line max

**ProjectDrawer**

- Width: ~300-400px
- Background: White or very light gray
- Typography: Clean sans-serif (e.g., Inter, Roboto)
- Sections: Clear hierarchy with subtle dividers
- Thumbnails in drawer: Smaller grid (2x2 or 2xN)

**MapControls**

- Position: Top-right corner
- Style: Minimal circular buttons
- Icons: Simple +/- and rotate symbols
- Background: Semi-transparent white or dark depending on view
- Hover: Slight opacity change

**MapLegend**

- Position: Bottom-left corner
- Style: Small, compact, semi-transparent background
- Content: Color scales, symbols explained
- Typography: Small, light weight

### Typography

- **Headings:** Sans-serif, medium weight (e.g., "Inter", "Helvetica Neue")
- **Body:** Sans-serif, regular weight, good readability
- **Sizes:**
  - Page title: 24-32px
  - Section headers: 18-20px
  - Body text: 14-16px
  - Captions: 12-14px

### Animation & Transitions

- **Globe rotation:** Smooth, gentle auto-rotation when idle
- **Zoom transitions:** Eased camera movements (800ms)
- **Drawer opening:** Slide-in from left (300ms ease-out)
- **Hover effects:** Quick scale/opacity changes (150-200ms)
- **Project transitions:** Globe → Detail should feel continuous, not jarring

### Best Practices for Implementation

**Simplicity:**

- Avoid visual clutter
- Let data visualizations be the focus
- Use whitespace generously
- Minimize UI chrome (no heavy borders, gradients, or decorative elements)

**Readability:**

- High contrast text on backgrounds
- Sufficient text sizing
- Clear visual hierarchy
- Consistent spacing system (8px grid recommended)
