URBES Globe Viz - Vue.js Application Structure
Core Architecture
Application Type: Single Page Application (SPA) with Vue 3 + Deck.gl for 3D visualization
Main Views (Pages/Routes)

GlobeView (Landing Page - /)

Primary: 3D interactive globe with project markers
Secondary: Horizontal scrollable project list/grid at bottom

ProjectDetailView (Project Page - /project/:id)

Primary: 2D minimalist basemap showing project area
Overlays: Building heights, flow visualizations, connections
Sidebar/Drawer: Project metadata, descriptions, publications

Component Hierarchy
App
├── NavigationBar (top)
├── Router View
│ ├── GlobeView
│ │ ├── Globe3D (Deck.gl wrapper)
│ │ ├── MapControls (zoom, rotate, reset)
│ │ ├── MapLegend
│ │ └── ProjectCarousel (bottom strip)
│ │ └── ProjectCard (thumbnail + title)
│ │
│ └── ProjectDetailView
│ ├── BaseMap (minimalist 2D)
│ ├── DataLayers (buildings, flows)
│ ├── ProjectDrawer (hover-triggered)
│ │ ├── ProjectInfo
│ │ ├── PublicationsList
│ │ └── RelatedProjects
│ └── MapControls
Essential Composables

useGlobeState - Globe camera position, rotation, zoom level
useProjectData - Fetch and manage project data (locations, metadata)
useMapControls - Handle pan, zoom, rotate interactions
useProjectSelection - Track selected/hovered project
useTileLoader - Handle PMTiles/vector tiles loading
useDataLayers - Manage visibility of buildings, flows, markers

State Management Needs

Global State: Current view, selected project, filter settings
Map State: Camera position, zoom level, active layers
Data State: Projects list, current project details, tile cache

Key Interactions

Globe → Project: Click marker → zoom to location → transition to detail view
Carousel → Globe: Click thumbnail → rotate globe to project
Hover: Show drawer with quick info
Filters: Filter projects by theme/year/researcher (optional feature)

Data Flow
API/Static Data → useProjectData →
├→ Globe3D (positions/markers)
├→ ProjectCarousel (list/thumbnails)
└→ ProjectDetailView (full details)
