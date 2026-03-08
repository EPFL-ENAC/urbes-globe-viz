.PHONY: setup install clean uninstall help download-geodata

CDN_BASE := https://enacit4r-cdn-s3.epfl.ch/urbes-viz
GEODATA_DIR := frontend/public/geodata

# Files actively referenced in frontend source (config/projects/*.ts and Globe3D.vue)
GEODATA_FILES := \
	building_heights_china.pmtiles \
	buildings_swiss.pmtiles \
	hourly_adult_population.pmtiles \
	roads_swiss_statistics.pmtiles \
	dave_flows_work.geojson \
	dave_flows_outdoor.geojson \
	dave_flows_indoor_leisure.geojson \
	ne_110m_land.geojson \
	human_settlement_2025_cog.tif \
	wrf_t2/t2_012.png

# Default target
help:
	@echo "Available commands:"
	@echo "  setup      - Set up repository from template (first-time setup)"
	@echo "  install    - Install dependencies and set up git hooks"
	@echo "  clean      - Clean node_modules and package-lock.json"
	@echo "  uninstall  - Remove git hooks and clean dependencies"
	@echo "  download-geodata - Download all geodata files from CDN to frontend/public/geodata/"
	@echo "  help       - Show this help message"


# Install dependencies and set up git hooks
install:
	@echo "Installing npm dependencies..."
	npm install
	@echo "Installing git hooks with lefthook..."
	npx lefthook install
	@echo "Setup complete!"

# Clean dependencies
clean:
	@echo "Cleaning dependencies..."
	rm -rf node_modules
	rm -f package-lock.json

# Uninstall hooks and clean
uninstall:
	@echo "Uninstalling git hooks..."
	npx lefthook uninstall || true
	$(MAKE) clean
	@echo "Uninstall complete!"


download-geodata:
	@echo "Downloading geodata from CDN ($(CDN_BASE))..."
	@echo "Note: human_settlement_2025_cog.tif may be large — download resumes if interrupted."
	@mkdir -p $(GEODATA_DIR)
	@for file in $(GEODATA_FILES); do \
		mkdir -p "$(GEODATA_DIR)/$$(dirname $$file)"; \
		echo "  ↓ $$file"; \
		curl -# -C - -L --fail -o "$(GEODATA_DIR)/$$file" "$(CDN_BASE)/$$file" || echo "  ✗ Failed: $$file"; \
	done
	@echo "Done! Files saved to $(GEODATA_DIR)/"

lint:
	@echo "Running linter..."
	npx prettier --check .
	@echo "Linting complete!"

format:
	@echo "Running formatter..."
	npx prettier --write .
	@echo "Formatting complete!"