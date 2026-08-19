.PHONY: help install dev lint format clean uninstall download-geodata upload-geodata previews

GEODATA_URL := https://urbes-viz.epfl.ch/geodata
GEODATA_DIR := frontend/public/geodata

# Base URL of a running app server for screenshot capture (override as needed,
# e.g. make previews PREVIEW_BASE_URL=http://localhost:4173 for `vite preview`)
PREVIEW_BASE_URL ?= http://localhost:5173

# Files too large for local download — always streamed from NAS
GEODATA_EXCLUDE := ghsl.pmtiles,index.html,robots.txt

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
	@echo "  previews         Generate project preview thumbnails (needs a running app server)"

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
	wget -r -np -nH --cut-dirs=1 -P $(GEODATA_DIR) -N -q --show-progress \
		--reject="$(GEODATA_EXCLUDE)" \
		$(GEODATA_URL)/
	@echo "Done! Files in $(GEODATA_DIR)/"

upload-geodata:
	@./scripts/upload-geodata.sh

previews:
	@echo "Generating previews from $(PREVIEW_BASE_URL)..."
	cd frontend && PREVIEW_BASE_URL=$(PREVIEW_BASE_URL) npm run previews
