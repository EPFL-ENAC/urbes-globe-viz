# Aldo's NetCDF Processing Makefile
# Usage: make convert-t2 or make list-vars

INPUT_DIR = /mnt/data/Documents/Code/urbes-globe-viz/processing/aldo_netcdf
OUTPUT_DIR = $(INPUT_DIR)

# WRF d02 (1km, Leman Lake region)
WRF_D02 = $(INPUT_DIR)/wrfout_d02_2022-07-15_12_00_00
# WRF d03 (333m, Lausanne)
WRF_D03 = $(INPUT_DIR)/wrfout_d03_2022-07-15_12_00_00
# WRF d04 (333m, Geneva)
WRF_D04 = $(INPUT_DIR)/wrfout_d04_2022-07-15_12_00_00
# PALM (0.5m, urban canopy)
PALM = $(INPUT_DIR)/TEST_4_3d.001-001.nc

# Zoom levels based on resolution
# Zoom 12 = ~38m/px (good for 1km data)
# Zoom 14 = ~9.5m/px (good for 333m data)
# Zoom 16 = ~2.4m/px (good for 0.5m data)

.PHONY: help list-vars convert-t2 convert-precip convert-wind clean

help:
	@echo "Aldo's NetCDF Processing Pipeline"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  list-vars       - List available variables in NetCDF files"
	@echo "  convert-t2      - Convert 2m temperature from all WRF domains"
	@echo "  convert-precip  - Convert precipitation from WRF d02"
	@echo "  convert-wind    - Convert 10m wind from WRF d03"
	@echo "  clean           - Remove generated COG files"

list-vars:
	@echo "=== WRF d02 (1km, Leman Lake) ==="
	@gdalinfo $(WRF_D02) 2>&1 | grep "_description=" | head -20 || echo "No variables found"
	@echo ""
	@echo "=== WRF d03 (333m, Lausanne) ==="
	@gdalinfo $(WRF_D03) 2>&1 | grep "_description=" | head -20 || echo "No variables found"
	@echo ""
	@echo "=== WRF d04 (333m, Geneva) ==="
	@gdalinfo $(WRF_D04) 2>&1 | grep "_description=" | head -20 || echo "No variables found"
	@echo ""
	@echo "Common variables: T2 (temp), PRECIP, RAINNC, U10, V10, PSFC, RELHUM"

# WRF d02 - 2m temperature (covers Leman Lake region)
convert-t2-d02:
	@echo "Converting T2 from WRF d02..."
	uv run nc_to_cog.py \
		--input $(WRF_D02) \
		--variable T2 \
		--output $(OUTPUT_DIR)/wrf_d02_t2_cog.tif \
		--zoom-level 12 \
		--resampling average \
		--compress DEFLATE

# WRF d03 - 2m temperature (Lausanne area)
convert-t2-d03:
	@echo "Converting T2 from WRF d03..."
	uv run nc_to_cog.py \
		--input $(WRF_D03) \
		--variable T2 \
		--output $(OUTPUT_DIR)/wrf_d03_t2_cog.tif \
		--zoom-level 14 \
		--resampling average \
		--compress DEFLATE

# WRF d04 - 2m temperature (Geneva area)
convert-t2-d04:
	@echo "Converting T2 from WRF d04..."
	uv run nc_to_cog.py \
		--input $(WRF_D04) \
		--variable T2 \
		--output $(OUTPUT_DIR)/wrf_d04_t2_cog.tif \
		--zoom-level 14 \
		--resampling average \
		--compress DEFLATE

# Convert all WRF d02 temperature
convert-t2: convert-t2-d02 convert-t2-d03 convert-t2-d04
	@echo "All T2 conversions complete!"

# WRF d02 - Precipitation
convert-precip:
	@echo "Converting PRECIP from WRF d02..."
	uv run nc_to_cog.py \
		--input $(WRF_D02) \
		--variable PRECIP \
		--output $(OUTPUT_DIR)/wrf_d02_precip_cog.tif \
		--zoom-level 12 \
		--resampling near \
		--compress DEFLATE

# WRF d03 - 10m wind (U10, V10 components)
convert-wind:
	@echo "Converting U10 from WRF d03..."
	uv run nc_to_cog.py \
		--input $(WRF_D03) \
		--variable U10 \
		--output $(OUTPUT_DIR)/wrf_d03_u10_cog.tif \
		--zoom-level 14 \
		--resampling average \
		--compress DEFLATE
	@echo "Converting V10 from WRF d03..."
	uv run nc_to_cog.py \
		--input $(WRF_D03) \
		--variable V10 \
		--output $(OUTPUT_DIR)/wrf_d03_v10_cog.tif \
		--zoom-level 14 \
		--resampling average \
		--compress DEFLATE

# Custom conversion (edit these variables)
convert-custom:
	@echo "Running custom conversion..."
	uv run nc_to_cog.py \
		--input $(INPUT_DIR)/YOUR_FILE.nc \
		--variable YOUR_VAR \
		--output $(OUTPUT_DIR)/output_cog.tif \
		--zoom-level 14 \
		--resampling average

clean:
	@echo "Removing generated COG files..."
	rm -f $(OUTPUT_DIR)/*_cog.tif
	@echo "Clean complete!"
