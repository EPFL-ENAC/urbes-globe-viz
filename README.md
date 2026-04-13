# Urbes Globe Viz

Interactive 3D globe visualization platform for the [URBES research group](https://www.epfl.ch/labs/urbes/) at EPFL, displaying urban morphology, mobility flows, building heights, and other geospatial datasets.

- **Dev:** https://urbes-globe-viz-dev.epfl.ch/
- **Prod:** https://urbes-globe-viz.epfl.ch/
- **GitHub:** https://github.com/EPFL-ENAC/urbes-globe-viz

---

## Adding New Data

**Researchers:** follow the step-by-step guide → [`docs/guide.md`](docs/guide.md)

It covers everything from installing tools to submitting your dataset as a pull request. No programming experience required.

For quick reference on individual data conversion commands, see the [processing cookbook](processing/cookbook/README.md).

---

## Development

### Prerequisites

- **Node.js v22+ and npm** — download from [nodejs.org](https://nodejs.org/) (LTS version). npm is bundled with Node.
- Python 3 (for data processing)

> **Windows users**: after installing Node.js, use the commands below via PowerShell or the
> Node.js command prompt. Replace `make install` with the commands it wraps:
>
> ```powershell
> npm install
> npm install --prefix frontend
> npx lefthook install
> ```

### Commands

```bash
make install   # install frontend dependencies + git hooks
make lint      # ESLint + Prettier check
make format    # Prettier auto-format

cd frontend && npm run dev    # dev server at http://localhost:9000
cd frontend && npm run build  # production build
```

### Pre-commit hooks

This project uses [lefthook](https://github.com/evilmartians/lefthook) to run Prettier before each commit. Stage all changes to a file before committing to avoid patch-reapply conflicts.

---

## Project Structure

```
urbes-globe-viz/
├── frontend/
│   └── src/
│       ├── components/features/   # Map renderers (Globe3D, DaveFlowsMap, ProjectMap)
│       ├── config/projects/       # Per-dataset configs (one .ts file per project)
│       ├── pages/                 # GlobeView (home) + ProjectDetailView
│       └── stores/                # Pinia stores
└── processing/
    ├── cookbook/                  # ← Recipes for converting data (start here)
    ├── aldo_netcdf/               # WRF/PALM NetCDF → multi-band COG pipeline
    ├── ghsl_to_pmtiles/           # GHSL built-surface pipeline (SCITAS HPC)
    ├── dave_flows/                # DAVE mobility flow processing
    └── martin_building_heights/   # Building heights → PMTiles
```

---

## Tech Stack

| Layer              | Technology         |
| ------------------ | ------------------ |
| Frontend framework | Vue 3 + TypeScript |
| UI components      | Quasar             |
| Map engine         | MapLibre GL JS     |
| 3D overlays        | Deck.gl            |
| Build tool         | Vite               |
| Web server         | nginx (Docker)     |

---

## Contributors

- EPFL URBES (Research & Data): Gabriele Manoli, Guo-Shiuan Lin, Martin Hendrick
- EPFL ENAC-IT4R (Implementation): Pierre Ripoll
- EPFL ENAC-IT4R (Project Management): Charlotte Weil

## License

[GNU General Public License v3.0](LICENSE)
