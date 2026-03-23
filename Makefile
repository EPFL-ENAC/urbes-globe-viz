.PHONY: setup install clean uninstall help download-geodata upload-geodata

CDN_BASE := https://urbes-viz.epfl.ch/geodata
GEODATA_DIR := frontend/public/geodata

# SMB upload configuration (override in .env)
SMB_SERVER ?= enac-nas1.rcp.epfl.ch
SMB_SHARE ?= fts-enac-it
SMB_PATH ?= urbes-viz.epfl.ch
SMB_USER ?= $(shell whoami)
SMB_MOUNT_POINT ?= /tmp/urbes-smb-mount

# Load .env if exists
-include .env

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
	@echo "  setup           - Set up repository from template (first-time setup)"
	@echo "  install         - Install dependencies and set up git hooks"
	@echo "  clean           - Clean node_modules and package-lock.json"
	@echo "  uninstall       - Remove git hooks and clean dependencies"
	@echo "  download-geodata - Download all geodata files from CDN to frontend/public/geodata/"
	@echo "  upload-geodata  - Upload frontend/public/geodata/ to SMB share"
	@echo "  help            - Show this help message"


# Install dependencies and set up git hooks
install:
	@echo "Installing root npm dependencies..."
	npm install
	@echo "Installing frontend npm dependencies..."
	npm install --prefix frontend
	@echo "Installing git hooks with lefthook..."
	npx lefthook install
	@echo "Setup complete!"

# Clean dependencies
clean:
	@echo "Cleaning dependencies..."
	rm -rf node_modules
	rm -f package-lock.json
	rm -rf frontend/node_modules
	rm -f frontend/package-lock.json

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

upload-geodata:
	@./scripts/upload-geodata.sh

lint:
	@echo "Running linter..."
	npx prettier --check .
	@echo "Linting complete!"

format:
	@echo "Running formatter..."
	npx prettier --write .
	@echo "Formatting complete!"