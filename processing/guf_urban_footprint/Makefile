.PHONY: all clean help global europe asia africa north_america south_america oceania

# Output directory
OUTPUT_DIR = ../../frontend/public/geodata

# Default region and resolution
REGION ?= global
RESOLUTION ?= 2.8

# Tile processing parameters
TILE_SIZE ?= 2048
MAX_PIXELS ?= 50000

# Python script
SCRIPT = download_guf_cog.py

# Find uv executable
UV := $(shell which uv 2>/dev/null)

# Output file pattern
OUTPUT_FILE = $(OUTPUT_DIR)/guf_$(REGION)_$(RESOLUTION)arcsec_cog.tif

all: check-uv
	@echo "========================================="
	@echo "Global Urban Footprint (GUF) Processing"
	@echo "========================================="
	@echo ""
	@echo "Downloading GUF data..."
	@echo "  Region: $(REGION)"
	@echo "  Resolution: $(RESOLUTION) arcsec"
	@echo ""
	@$(UV) run --project .. $(SCRIPT) \
		--region $(REGION) \
		--resolution $(RESOLUTION) \
		--tile-size $(TILE_SIZE) \
		--max-pixels $(MAX_PIXELS)
	@echo ""
	@echo "========================================="
	@echo "✓ Processing complete!"
	@echo "========================================="
	@echo ""
	@echo "Output: $(OUTPUT_FILE)"
	@echo ""
	@echo "To use in deck.gl:"
	@echo "  new GeoTiffLayer({"
	@echo "    id: 'guf-layer',"
	@echo "    data: '/geodata/guf_$(REGION)_$(RESOLUTION)arcsec_cog.tif'"
	@echo "  });"
	@echo ""

# Predefined region targets
global:
	@$(MAKE) REGION=global RESOLUTION=$(RESOLUTION)

europe:
	@$(MAKE) REGION=europe RESOLUTION=$(RESOLUTION)

asia:
	@$(MAKE) REGION=asia RESOLUTION=$(RESOLUTION)

africa:
	@$(MAKE) REGION=africa RESOLUTION=$(RESOLUTION)

north_america:
	@$(MAKE) REGION=north_america RESOLUTION=$(RESOLUTION)

south_america:
	@$(MAKE) REGION=south_america RESOLUTION=$(RESOLUTION)

oceania:
	@$(MAKE) REGION=oceania RESOLUTION=$(RESOLUTION)

# Custom bbox target
custom:
	@if [ -z "$(BBOX)" ]; then \
		echo "Error: BBOX not specified. Usage: make custom BBOX='-10,35,30,60'"; \
		exit 1; \
	fi
	@echo "========================================="
	@echo "Global Urban Footprint (GUF) Processing"
	@echo "========================================="
	@echo ""
	@echo "Downloading GUF data..."
	@echo "  BBox: $(BBOX)"
	@echo "  Resolution: $(RESOLUTION) arcsec"
	@echo ""
	@$(UV) run --project .. $(SCRIPT) \
		--bbox $(BBOX) \
		--resolution $(RESOLUTION) \
		--tile-size $(TILE_SIZE) \
		--max-pixels $(MAX_PIXELS)
	@echo ""
	@echo "✓ Processing complete!"

check-uv:
	@if [ -z "$(UV)" ]; then \
		echo "Error: uv is not installed or not in PATH."; \
		echo "Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"; \
		echo "Then add ~/.local/bin to your PATH"; \
		exit 1; \
	fi

clean:
	@rm -f $(OUTPUT_DIR)/guf_*_cog.tif
	@echo "✓ Cleaned guf_urban_footprint files"

help:
	@echo "Global Urban Footprint (GUF) Processing"
	@echo ""
	@echo "Usage:"
	@echo "  make [target] [RESOLUTION=0.4|2.8]"
	@echo ""
	@echo "Targets:"
	@echo "  all             - Download global data (default)"
	@echo "  global          - Download global data"
	@echo "  europe          - Download Europe region"
	@echo "  asia            - Download Asia region"
	@echo "  africa          - Download Africa region"
	@echo "  north_america   - Download North America region"
	@echo "  south_america   - Download South America region"
	@echo "  oceania         - Download Oceania region"
	@echo "  custom          - Download custom bbox (requires BBOX variable)"
	@echo "  clean           - Remove generated files"
	@echo "  help            - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make                                  # Global at 2.8 arcsec"
	@echo "  make europe RESOLUTION=0.4            # Europe at 0.4 arcsec"
	@echo "  make custom BBOX='-10,35,30,60'       # Custom region"
	@echo ""
	@echo "Resolution options:"
	@echo "  0.4 = ~12m  (high detail, large files)"
	@echo "  2.8 = ~84m  (recommended for web)"
