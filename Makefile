.PHONY: help install dev lint format clean uninstall download-geodata upload-geodata

GEODATA_URL := https://urbes-viz.epfl.ch/geodata
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
	@echo "  install          Install dependencies and set up git hooks"
	@echo "  dev              Start frontend dev server (http://localhost:9000)"
	@echo "  lint             Check formatting with Prettier"
	@echo "  format           Auto-format all files with Prettier"
	@echo "  clean            Remove node_modules and lock files"
	@echo "  uninstall        Remove git hooks and clean dependencies"
	@echo "  download-geodata Download geodata files to frontend/public/geodata/"
	@echo "  upload-geodata   Upload geodata to shared NAS via SMB"

install:
	@echo "Installing root dependencies..."
	npm install
	@echo "Installing frontend dependencies..."
	npm install --prefix frontend
	@echo "Installing git hooks..."
	npx lefthook install
	@echo "Done!"

dev:
	cd frontend && npm run dev

lint:
	npx prettier --check .

format:
	npx prettier --write .

clean:
	rm -rf node_modules frontend/node_modules
	rm -f package-lock.json frontend/package-lock.json

uninstall:
	npx lefthook uninstall || true
	$(MAKE) clean

download-geodata:
	@echo "Downloading geodata from $(GEODATA_URL)..."
	@mkdir -p $(GEODATA_DIR)
	@for file in $(GEODATA_FILES); do \
		mkdir -p "$(GEODATA_DIR)/$$(dirname $$file)"; \
		echo "  ↓ $$file"; \
		curl -# -C - -L --fail -o "$(GEODATA_DIR)/$$file" "$(GEODATA_URL)/$$file" || echo "  ✗ Failed: $$file"; \
	done
	@echo "Done! Files in $(GEODATA_DIR)/"

upload-geodata:
	@./scripts/upload-geodata.sh
