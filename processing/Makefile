.PHONY: all clean martin_building_heights

# Output directory
OUTPUT_DIR = ../frontend/public/geodata

all: martin_building_heights

martin_building_heights:
	@echo "Processing Martin building heights dataset..."
	cd martin_building_heights && bash process.sh
	@echo "Martin building heights PMTiles created successfully"

clean:
	rm -f $(OUTPUT_DIR)/building_heights_china.pmtiles
	rm -f martin_building_heights/*.mbtiles
	@echo "Cleaned processed files"
