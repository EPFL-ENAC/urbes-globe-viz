import type { Feature, FeatureCollection, Point } from 'geojson'

export interface ProjectProperties {
  id: string
  title: string
  description: string
  unit: string
  info: string
  category: string
}

export type ProjectFeature = Feature<Point, ProjectProperties>
export type ProjectCollection = FeatureCollection<Point, ProjectProperties>

export const projectsGeoJSON: ProjectCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [6.6327, 46.5197] // Geneva
      },
      properties: {
        id: 'buildings',
        title: 'Buildings',
        description: 'Swiss building footprints with construction year data',
        unit: 'year',
        info: 'Source: Swiss Federal Office of Topography',
        category: 'Infrastructure'
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [8.5417, 47.3769] // Zurich
      },
      properties: {
        id: 'wrf',
        title: 'Urban Climate',
        description: 'Climate simulation data for Swiss urban areas',
        unit: '',
        info: 'Source: Aldo Brandi, URBES',
        category: 'Climate'
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [7.4474, 46.9479] // Bern
      },
      properties: {
        id: 'areas',
        title: 'Cantonal Boundaries',
        description: 'Administrative boundaries of Swiss cantons',
        unit: '',
        info: 'Source: Swiss Federal Office of Topography',
        category: 'Geography'
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [6.1432, 46.2044] // Lausanne
      },
      properties: {
        id: 'roads',
        title: 'Roads',
        description: 'Swiss road network with construction year data',
        unit: 'year',
        info: 'Source: Swiss Federal Office of Topography',
        category: 'Infrastructure'
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [7.5886, 47.5596] // Basel
      },
      properties: {
        id: 'roads_swiss_statistics',
        title: 'Traffic 2017',
        description: 'Current traffic volume on Swiss roads',
        unit: 'vehicles/day',
        info: 'Source: Swiss Federal Office for Spatial Development',
        category: 'Transport'
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [8.9511, 46.0037] // Lugano
      },
      properties: {
        id: 'roads_swiss_statistics_projection',
        title: 'Traffic 2050',
        description: 'Projected traffic volume for 2050',
        unit: 'vehicles/day',
        info: 'Source: Swiss Federal Office for Spatial Development',
        category: 'Transport'
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [8.3093, 47.0502] // Lucerne
      },
      properties: {
        id: 'gws_data',
        title: 'Building Numbers',
        description: 'Building density per grid cell',
        unit: '/100m²',
        info: 'Source: Swiss Federal Statistical Office',
        category: 'Statistics'
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [9.3767, 47.4245] // St. Gallen
      },
      properties: {
        id: 'statpop_data',
        title: 'Population',
        description: 'Residential population density',
        unit: '/100m²',
        info: 'Source: Swiss Federal Statistical Office',
        category: 'Statistics'
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [7.3592, 47.2108] // Solothurn
      },
      properties: {
        id: 'hourly_adult_population',
        title: 'Hourly Adult Population',
        description: 'Dynamic population distribution by hour',
        unit: 'adults/500m²',
        info: 'Source: DAVE Simulations, URBES',
        category: 'Demographics'
      }
    }
  ]
}
