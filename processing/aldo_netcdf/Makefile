# WRF NetCDF -> COG and wind arrows for the "Lake-City Climates" project (wrf.ts).
#
#   make bake INPUT_DIR=/path/to/wrfout/files
#
# The wrfout files are not in git. By default they are read from this folder.
# Output goes to out/ (gitignored). Copy it to frontend/public/geodata and
# upload it with `make upload-geodata` from the repo root.

INPUT_DIR ?= .
OUT_DIR ?= out
RUN = 2022-07-15_12_00_00
DOMAINS = d02 d03 d04
# Variables baked for each domain: WRF or derived name -> file suffix.
VARIABLES = T2C:t2c TSKC:tskc WS10:ws10

# One arrow every N cells, about 20 to 25 arrows across each domain.
STRIDE_d02 = 5
STRIDE_d03 = 4
STRIDE_d04 = 4

.PHONY: help bake clean

help:
	@echo "make bake INPUT_DIR=<folder with wrfout_d0*_$(RUN)>   COGs + arrows in $(OUT_DIR)/"
	@echo "make clean                                             remove $(OUT_DIR)/"

bake:
	@mkdir -p $(OUT_DIR)
	@for d in $(DOMAINS); do \
		for pair in $(VARIABLES); do \
			var=$${pair%%:*}; suffix=$${pair##*:}; \
			uv run nc_to_cog.py -i $(INPUT_DIR)/wrfout_$${d}_$(RUN) -v $$var \
				-o $(OUT_DIR)/wrf_$${d}_$${suffix}_cog.tif || exit 1; \
		done; \
	done
	uv run nc_to_cog.py -i $(INPUT_DIR)/wrfout_d02_$(RUN) --arrows $(OUT_DIR)/wrf_d02_wind10.json --stride $(STRIDE_d02)
	uv run nc_to_cog.py -i $(INPUT_DIR)/wrfout_d03_$(RUN) --arrows $(OUT_DIR)/wrf_d03_wind10.json --stride $(STRIDE_d03)
	uv run nc_to_cog.py -i $(INPUT_DIR)/wrfout_d04_$(RUN) --arrows $(OUT_DIR)/wrf_d04_wind10.json --stride $(STRIDE_d04)
	@ls -l $(OUT_DIR)

clean:
	rm -rf $(OUT_DIR)
