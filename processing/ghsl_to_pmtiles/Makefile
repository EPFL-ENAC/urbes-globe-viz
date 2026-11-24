GEODATA := /mnt/nvme/urbes-globe-viz/geodata
PROCESSES := 14

# 512 px tiles: same sharpness as 256 px one zoom deeper, so the archive stops
# at z12 (the 256 px archive went to z13). 4 times fewer requests per view.
TILESIZE := 512
LOW_ZOOMS := 0-7
HIGH_ZOOMS := 8-12
NAME := ghsl-512
TILES := $(GEODATA)/ghsl_tiles_512
# Tiles smaller than this are deleted after generation. At 512 px the smallest
# WebP is about 580 B, so this drops almost nothing (see README).
MIN_BYTES := 500

.PHONY: help vrt tiles-low tiles-high tiles postprocess pmtiles upload clean

help:
	@echo "GHSL → PMTiles pipeline ($(TILESIZE) px tiles, output $(NAME).pmtiles)"
	@echo "Fallback for ENACIT4R-CUDA. The main build runs on SCITAS Jed, see README.md."
	@echo ""
	@echo "  make vrt          Create RGBA VRT from source COG (instant)"
	@echo "  make tiles-low    Generate zoom $(LOW_ZOOMS) tiles (~30 min, average resampling)"
	@echo "  make tiles-high   Generate zoom $(HIGH_ZOOMS) tiles (several hours, near resampling)"
	@echo "  make postprocess  Delete near-empty tiles (< $(MIN_BYTES) B)"
	@echo "  make pmtiles      Pack tiles into $(NAME).mbtiles, then $(NAME).pmtiles"
	@echo "  make upload       Print where to upload $(NAME).pmtiles"
	@echo "  make clean        Delete the $(NAME) tiles and archives (not ghsl.pmtiles)"
	@echo ""
	@echo "Full pipeline: make vrt tiles-low tiles-high postprocess pmtiles"
	@echo ""
	@echo "After uploading, regenerate the bundled low-zoom tiles:"
	@echo "  cd frontend && npm run extract:ghsl-low"

vrt:
	cd $(GEODATA) && gdaldem color-relief \
		ghsl_built_3857_cog.tif \
		ghsl_colors.txt \
		ghsl_rgba.vrt \
		-of VRT -alpha

tiles-low:
	cd $(GEODATA) && gdal2tiles.py \
		--zoom=$(LOW_ZOOMS) \
		--tilesize=$(TILESIZE) \
		--processes=$(PROCESSES) \
		--resampling=average \
		--xyz -x \
		--tiledriver=WEBP --webp-quality=85 \
		ghsl_rgba.vrt $(TILES)/ \
		2>&1 | tee tiles_low_$(TILESIZE).log

tiles-high:
	cd $(GEODATA) && gdal2tiles.py \
		--zoom=$(HIGH_ZOOMS) \
		--tilesize=$(TILESIZE) \
		--processes=$(PROCESSES) \
		--resampling=near \
		--xyz -x \
		--tiledriver=WEBP --webp-quality=85 \
		ghsl_rgba.vrt $(TILES)/ \
		2>&1 | tee tiles_high_$(TILESIZE).log

tiles: tiles-low tiles-high

postprocess:
	find $(TILES)/ -name "*.webp" -size -$(MIN_BYTES)c -delete
	find $(TILES)/ -type d -empty -delete
	@echo "Remaining tiles:"
	@find $(TILES)/ -name "*.webp" | wc -l
	@du -sh $(TILES)/

# `pmtiles convert` only reads an .mbtiles file, not a tile folder. So we pack
# the folder first (pack_mbtiles.py, stdlib only, flips XYZ rows to TMS).
pmtiles:
	@command -v pmtiles >/dev/null 2>&1 || { \
		echo "pmtiles not found. Download from:"; \
		echo "  https://github.com/protomaps/go-pmtiles/releases"; \
		exit 1; \
	}
	rm -f $(GEODATA)/$(NAME).mbtiles
	python3 pack_mbtiles.py $(TILES) $(GEODATA)/$(NAME).mbtiles 16
	pmtiles convert $(GEODATA)/$(NAME).mbtiles $(GEODATA)/$(NAME).pmtiles
	pmtiles show $(GEODATA)/$(NAME).pmtiles
	@ls -lh $(GEODATA)/$(NAME).pmtiles

upload:
	@echo "Copy $(GEODATA)/$(NAME).pmtiles to the NAS share"
	@echo "  //enac-nas1.rcp.epfl.ch/fts-enac-it/urbes-viz.epfl.ch/"
	@echo "Do not replace ghsl.pmtiles, prod uses it. See README.md, step 5."
	@echo "Available at: https://urbes-viz.epfl.ch/geodata/$(NAME).pmtiles"

clean:
	rm -rf $(TILES)/
	rm -f $(GEODATA)/$(NAME).mbtiles $(GEODATA)/$(NAME).pmtiles
