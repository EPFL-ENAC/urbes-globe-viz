GEODATA := /mnt/nvme/urbes-globe-viz/geodata
PROCESSES := 14

.PHONY: help vrt tiles-low tiles-high tiles postprocess pmtiles upload clean

help:
	@echo "GHSL → PMTiles pipeline"
	@echo ""
	@echo "  make vrt          Create RGBA VRT from source COG (instant)"
	@echo "  make tiles-low    Generate zoom 0-8 tiles (~30 min, average resampling)"
	@echo "  make tiles-high   Generate zoom 9-13 tiles (~8-15 hours, near resampling)"
	@echo "  make postprocess  Delete near-empty tiles"
	@echo "  make pmtiles      Package tiles directory into ghsl.pmtiles"
	@echo "  make upload       Upload ghsl.pmtiles to CDN"
	@echo ""
	@echo "Full pipeline: make vrt tiles-low tiles-high postprocess pmtiles upload"

vrt:
	cd $(GEODATA) && gdaldem color-relief \
		ghsl_built_3857_cog.tif \
		ghsl_colors.txt \
		ghsl_rgba.vrt \
		-of VRT -alpha

tiles-low:
	cd $(GEODATA) && gdal2tiles.py \
		--zoom=0-8 \
		--processes=$(PROCESSES) \
		--resampling=average \
		--xyz -x \
		--tiledriver=WEBP --webp-quality=85 \
		ghsl_rgba.vrt ./ghsl_tiles/ \
		2>&1 | tee tiles_low.log

tiles-high:
	cd $(GEODATA) && gdal2tiles.py \
		--zoom=9-13 \
		--processes=$(PROCESSES) \
		--resampling=near \
		--xyz -x \
		--tiledriver=WEBP --webp-quality=85 \
		ghsl_rgba.vrt ./ghsl_tiles/ \
		2>&1 | tee tiles_high.log

tiles: tiles-low tiles-high

postprocess:
	find $(GEODATA)/ghsl_tiles/ -name "*.webp" -size -500c -delete
	find $(GEODATA)/ghsl_tiles/ -type d -empty -delete
	@echo "Remaining tiles:"
	@find $(GEODATA)/ghsl_tiles/ -name "*.webp" | wc -l
	@du -sh $(GEODATA)/ghsl_tiles/

pmtiles:
	@command -v pmtiles >/dev/null 2>&1 || { \
		echo "pmtiles not found. Download from:"; \
		echo "  https://github.com/protomaps/go-pmtiles/releases"; \
		exit 1; \
	}
	pmtiles convert $(GEODATA)/ghsl_tiles/ $(GEODATA)/ghsl.pmtiles
	@ls -lh $(GEODATA)/ghsl.pmtiles

upload:
	@echo "Upload ghsl.pmtiles to the shared EPFL NAS geodata/ folder"
	@echo "Available at: https://urbes-viz.epfl.ch/geodata/ghsl.pmtiles"

clean:
	rm -rf $(GEODATA)/ghsl_tiles/
	rm -f $(GEODATA)/ghsl.pmtiles
