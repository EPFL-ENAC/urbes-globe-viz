.PHONY: all clean install martin_building_heights guf_urban_footprint dave_flows

# Output directory
OUTPUT_DIR = ../frontend/public/geodata

# Find uv executable
UV := $(shell which uv 2>/dev/null)

all: martin_building_heights dave_flows

install:
	@echo "Installing Python dependencies with uv..."
	@if [ -z "$(UV)" ]; then \
		echo "Error: uv is not installed or not in PATH."; \
		echo "Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"; \
		echo "Then add ~/.local/bin to your PATH"; \
		exit 1; \
	fi
	@$(UV) sync
	@echo "✓ Dependencies installed"

martin_building_heights:
	@$(MAKE) -C martin_building_heights all

guf_urban_footprint:
	@$(MAKE) -C guf_urban_footprint all

dave_flows:
	@$(MAKE) -C dave_flows all

clean:
	@$(MAKE) -C martin_building_heights clean
	@$(MAKE) -C guf_urban_footprint clean
	@$(MAKE) -C dave_flows clean
	@echo "All processed files cleaned"
