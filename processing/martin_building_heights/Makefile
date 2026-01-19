.PHONY: all clean

# Output directory
OUTPUT_DIR = ../../frontend/public/geodata

# Find uv executable
UV := $(shell which uv 2>/dev/null)

# Input file
INPUT_CSV = city_height_obs_vs_sim.csv

# Intermediate files
GEOJSON = building_heights_china.geojson
GEOJSONSEQ = building_heights_china.geojsonseq

# Output file
OUTPUT_PMTILES = $(OUTPUT_DIR)/building_heights_china.pmtiles

all: $(OUTPUT_PMTILES)

$(GEOJSON): $(INPUT_CSV) csv_to_geojson.py
	@echo "Converting CSV to GeoJSON..."
	@if [ -z "$(UV)" ]; then \
		echo "Error: uv not found. Run 'make install' from processing directory first."; \
		exit 1; \
	fi
	@$(UV) run --project .. csv_to_geojson.py

$(GEOJSONSEQ): $(GEOJSON)
	@echo "Converting GeoJSON to GeoJSONSeq..."
	@ogr2ogr -f GeoJSONSeq $(GEOJSONSEQ) $(GEOJSON)

$(OUTPUT_PMTILES): $(GEOJSONSEQ)
	@echo "Converting GeoJSONSeq to PMTiles with tippecanoe..."
	@tippecanoe \
		--output=$(OUTPUT_PMTILES) \
		--layer=building_heights_china \
		--force \
		--maximum-zoom=12 \
		--minimum-zoom=4 \
		--base-zoom=8 \
		--drop-densest-as-needed \
		--extend-zooms-if-still-dropping \
		$(GEOJSONSEQ)
	@echo "Cleaning up intermediate files..."
	@rm -f $(GEOJSONSEQ)
	@echo "✓ PMTiles created at $(OUTPUT_PMTILES)"

clean:
	@rm -f $(OUTPUT_PMTILES)
	@rm -f $(GEOJSON) $(GEOJSONSEQ)
	@rm -f *.mbtiles
	@echo "✓ Cleaned martin_building_heights files"
