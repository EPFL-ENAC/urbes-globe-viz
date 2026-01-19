# URBES GLOBE VIZ

Website to visualize URBES projects.

**Access the platform here:**

**dev url: [https://urbes-globe-viz-dev.epfl.ch/](https://urbes-globe-viz-dev.epfl.ch/)**  
**prod url: [https://urbes-globe-viz.epfl.ch/](https://urbes-globe-viz.epfl.ch/)**

## Contributors

- EPFL - (Research & Data): Gabriele Manoli, Guo-Shiuan Lin, Martin Hendrick
- EPFL - ENAC-IT4R (Implementation): Pierre Ripoll
- EPFL - ENAC-IT4R (Project Management): Charlotte Weil

## Tech Stack

### Frontend

- [Vue.js 3](https://vuejs.org/) - Progressive JavaScript Framework
- [Quasar](https://quasar.dev/) - Vue.js Framework
- [nginx](https://nginx.org/) - Web Server

### Infrastructure

- [Docker](https://www.docker.com/) - Containerization
- [Traefik](https://traefik.io/) - Edge Router

## Development

### Prerequisites

- Node.js (v22+)
- npm
- Python 3
- Docker

### Setup & Usage

You can use Make with the following commands:

```bash
make install
make clean
make uninstall
make lint
make format
```

### Development Environment

The development environment includes:

- Frontend at http://localhost:9000
- Backend API at https://localhost:8060
- Traefik Dashboard at http://localhost:8080

## Data Management

Data for the platform is organized the following way:

### Main Data Repository

- Location:
- ## Contains:
  -

### Application Data

- Location: `./`
- Contains:
  - Application-specific data
  - Configuration files
  - Smaller datasets ..

Data is version-controlled and regularly updated to reflect the latest research findings

## Internationalization

The platform supports multiple languages including English, French, and Arabic. Translations are managed through i18n files located in `frontend/src/i18n/`. based on `frontend/src/assets/i18n`

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Status

Under active development. [Report bugs here](https://github.com/EPFL-ENAC/urbes-globe-viz/issues).

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE) - see the LICENSE file for details.

This is free software: you can redistribute it and/or modify it under the terms of the GPL-3.0 as published by the Free Software Foundation.

## Remaining Manual Tasks

Please complete these tasks manually:

- [ ] Add token for the github action secrets called: MY_RELEASE_PLEASE_TOKEN (since you kept the release-please workflow)
- [ ] Check if you need all the labels: https://github.com/EPFL-ENAC/urbes-globe-viz/labels
- [ ] Create your first milestone: https://github.com/EPFL-ENAC/urbes-globe-viz/milestones
- [ ] Protect your branch if you're a pro user: https://github.com/EPFL-ENAC/urbes-globe-viz/settings/branches
- [ ] [Activate discussion](https://github.com/EPFL-ENAC/urbes-globe-viz/settings)
