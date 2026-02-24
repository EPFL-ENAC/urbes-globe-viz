.PHONY: all work indoor_leisure outdoor clean help

# Paths — note the space in "DAVE simulations"
DATA_DIR := ../../frontend/public/DAVE simulations
OUTPUT_DIR := ../../frontend/public/geodata
GRID := $(DATA_DIR)/500_grid_Vaud_Geneva_within.shp

# Input flow files
FLOWS_WORK    := $(DATA_DIR)/flows_1_199_10_min1persons.csv
FLOWS_INDOOR  := $(DATA_DIR)/flows_5_199_18_min1persons.csv
FLOWS_OUTDOOR := $(DATA_DIR)/flows_6_199_18_min1persons.csv

# Output files (GeoJSON kept alongside PMTiles for deck.gl consumption)
OUT_WORK         := $(OUTPUT_DIR)/dave_flows_work.pmtiles
OUT_INDOOR       := $(OUTPUT_DIR)/dave_flows_indoor_leisure.pmtiles
OUT_OUTDOOR      := $(OUTPUT_DIR)/dave_flows_outdoor.pmtiles
GEOJSON_WORK     := $(OUTPUT_DIR)/dave_flows_work.geojson
GEOJSON_INDOOR   := $(OUTPUT_DIR)/dave_flows_indoor_leisure.geojson
GEOJSON_OUTDOOR  := $(OUTPUT_DIR)/dave_flows_outdoor.geojson

# Find uv executable
UV := $(shell which uv 2>/dev/null)

all: work indoor_leisure outdoor

work:
	@echo "==> Work environment flows (environment 1, 10am)"
	@./process.sh "$(GRID)" "$(FLOWS_WORK)" "$(OUT_WORK)"

indoor_leisure:
	@echo "==> Indoor leisure flows (environment 5, 6pm)"
	@./process.sh "$(GRID)" "$(FLOWS_INDOOR)" "$(OUT_INDOOR)"

outdoor:
	@echo "==> Outdoor flows (environment 6, 6pm)"
	@./process.sh "$(GRID)" "$(FLOWS_OUTDOOR)" "$(OUT_OUTDOOR)"

clean:
	@rm -f "$(OUT_WORK)" "$(OUT_INDOOR)" "$(OUT_OUTDOOR)"
	@rm -f "$(GEOJSON_WORK)" "$(GEOJSON_INDOOR)" "$(GEOJSON_OUTDOOR)"
	@echo "✓ Cleaned dave_flows files"

help:
	@echo "Targets:"
	@echo "  work           — Work environment flows (environment code 1, 10am)"
	@echo "  indoor_leisure — Indoor leisure flows (environment code 5, 6pm)"
	@echo "  outdoor        — Outdoor flows (environment code 6, 6pm)"
	@echo "  all            — Process all three environments"
	@echo "  clean          — Remove all generated PMTiles files"
