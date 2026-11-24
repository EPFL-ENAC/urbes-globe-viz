# Changelog

## [1.4.0](https://github.com/EPFL-ENAC/urbes-globe-viz/compare/v1.3.1...v1.4.0) (2026-11-24)


### Features

* **basemap:** prefetch GHSL tiles of each flight, show the globe in one go ([b5eb856](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/b5eb856124ae0a1211eb471b142aab0c1257841f))
* **basemap:** prefetch GHSL tiles of each flight, show the globe in one go ([8106e57](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/8106e571fae2963b9f98620e7d45a6515b96535f))
* **ghsl:** 512 px basemap tiles from ghsl-512.pmtiles ([6f3f33b](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/6f3f33baaed9c9e1497fdced61008009aa07dee8))
* **ghsl:** upload job from Jed to the NAS ([bbcb121](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/bbcb12157ff4e84a1d2d5ea2ee25dcee72120368))

## [1.3.1](https://github.com/EPFL-ENAC/urbes-globe-viz/compare/v1.3.0...v1.3.1) (2026-11-23)


### Bug Fixes

* **globe:** keep the hover preview aligned with the basemap ([cf05ac0](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/cf05ac065ee6001a581e34014a7aa0d70e89f01b))
* **globe:** keep the hover preview aligned with the basemap ([#49](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/49)) ([15f2368](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/15f2368a067508bbfd35fe337d5d41cc46d5580e))
* **globe:** passive globe follows the mobile breakpoint after load ([b70f73b](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/b70f73b0393ca51791706a44a9eb1a5b06ee82c3)), closes [#48](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/48)
* **landing:** phones in landscape get the mobile layout ([cd353b1](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/cd353b16a9d328bfc440383a138a187a650d0c5e))
* **mobile:** sheet, tap targets and small text on project pages ([e031c86](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/e031c8643b54012917072e8187a4615948298cda)), closes [#48](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/48)

## [1.3.0](https://github.com/EPFL-ENAC/urbes-globe-viz/compare/v1.2.0...v1.3.0) (2026-10-15)


### Features

* **theme:** follow the OS dark/light setting ([d1d4792](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/d1d4792ea1e08c1f8b7a976d0c1c3f56d5227d0e))

## [1.2.0](https://github.com/EPFL-ENAC/urbes-globe-viz/compare/v1.1.1...v1.2.0) (2026-09-29)


### Features

* **cards:** new card image for population dynamics, showing mobility flows ([aa7d98d](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/aa7d98daf4c6a299d5fad3022bb2aa6c6a86dbad)), closes [#45](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/45)
* **landing:** catchier project titles ([c28c0d7](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/c28c0d743bf3fe6f636810f90e72c13d46c82105)), closes [#45](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/45)


### Bug Fixes

* **wrf:** replace the fake d02 chart with the domains schema ([863a7da](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/863a7dac7a81651ce779b70c40e15406de6326a4)), closes [#45](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/45)

## [1.1.1](https://github.com/EPFL-ENAC/urbes-globe-viz/compare/v1.1.0...v1.1.1) (2026-09-08)


### Bug Fixes

* **landing:** purple "Complexity", intro sentence moved to the info panel ([620fd6d](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/620fd6d2d5e1429c50c4f977ed7231ce3ce83a9a))


### Reverts

* back to the horizontal project strip on compact viewports ([27ad88e](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/27ad88e0486e60c52e0fa8de2760db0d5c01d693))

## [1.1.0](https://github.com/EPFL-ENAC/urbes-globe-viz/compare/v1.0.1...v1.1.0) (2026-08-24)


### Features

* **globe:** instant basemap paint via bundled low-zoom tiles and hybrid ghsl:// source ([0b78e38](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/0b78e38077402c2761ad62bb69fcce240b2741e9))


### Bug Fixes

* **landing:** nav on the page gutter, b/w basemap, compact type for zoomed browsers ([ce9831c](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/ce9831c032112788226e5ebc2506312a4fdc356b))

## [1.0.1](https://github.com/EPFL-ENAC/urbes-globe-viz/compare/v0.2.2...v1.0.1) (2026-08-19)


### Features

* **basemap:** duotone the globe to the violet accent, drop graticules and land ([a3835f9](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/a3835f97bd2cc29f04a8216fce29ffadbfcc1154))
* **card:** curated duotone project-card thumbnails ([a9abe0b](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/a9abe0b42782899e370a724717693e9c4a83e70e))
* **globe:** add land/graticule basemap layers, flatten paper whites, greyer map bg, sans year label ([eac40c5](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/eac40c52f0992508bf8174e6af8a952123959fe6))
* **globe:** perspective-aligned hover preview billboards ([bad1747](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/bad1747c5cc5a1d756cd57476c05f67d2657d9af))
* **hero:** single full-contrast panel with URBES lab links ([978ef72](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/978ef7219ca6e228a2cca348d47f673521d5ccaa))
* **links:** open all links in new tabs ([bfb3f01](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/bfb3f01503ef6a8d2c7b1d788dc7a5534f5c720a))
* minimal black/white/purple landing, far-out previews, visible dark globe ([#39](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/39)) ([ab01a8f](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/ab01a8f8880c9c137fb5c65f1c992b93670e5521))
* minimal purple design system, duotoned globe, preview and map-control fixes ([#40](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/40)) ([1fc43a6](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/1fc43a66293466ca25ded68deaf9fe71db93d631))
* **project-detail:** flow hub sections at natural height, stretch only the last ([a3b40b1](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/a3b40b1c6f4c4ccfd14c5d1a2a5cf7db3722d67e))
* **theme:** light-first paper design system with self-hosted Suisse Int'l ([0a48221](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/0a48221abc93e98de01926b6869df22b9aa89be0))
* **theme:** purple violet accent matching architecturehub, neutral EPFL logo ([f02a65a](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/f02a65a4affb568cd6e2a63bf2b48638492e7011))


### Bug Fixes

* **globe:** draw graticules behind land, fade them, align markers to sphere surface ([f7bf49f](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/f7bf49f7396b0f248442f759920dface598242c5))
* **markdown:** guard token index access so vue-tsc build passes ([9e04465](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/9e0446538eea26ae2c10e76647f8fb0d1e02540a))
* **nav:** square info and theme-toggle buttons to match paper system ([4af6058](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/4af60585cea078b637e6676d1342b4733f180e9b))
* **previews:** duotone previews via table ramp so dark mode stops clipping to pink ([7d942a6](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/7d942a6a91c82086234ab3bdc3e0ba9276d93eea))
* **previews:** stop deck.gl arcs collapsing under globe, ramp them white-to-purple ([0d21a49](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/0d21a493e8c0cbf9f8c5fa561232f9a1c09b2f40))
* **previews:** stop preview duotone clipping to pink, release as 1.0.1 ([519c169](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/519c169d49c2466c2a57ec760cea29dc494c3a8c))
* **project-detail:** guard hub section tag against undefined split result ([567b54c](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/567b54c980f6ae01cc4f7f19aa6615a0f17ff816))


### Miscellaneous Chores

* release as 1.0.1 ([cc350e5](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/cc350e5e23665f4e6cba522adbb433e201903815))

## [0.2.2](https://github.com/EPFL-ENAC/urbes-globe-viz/compare/v0.2.1...v0.2.2) (2026-06-17)


### Bug Fixes

* **wrf:** update wrf.ts ([#35](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/35)) ([000d808](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/000d808bb230e642b83fd429afc0a7f997344f7b))

## [0.2.1](https://github.com/EPFL-ENAC/urbes-globe-viz/compare/v0.2.0...v0.2.1) (2026-06-16)


### Bug Fixes

* **wrf:** render updated descriptions on detail page ([#21](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/21)) ([#33](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/33)) ([fd08bca](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/fd08bcae30476697a7a2ec96910066ca79bb3905))

## [0.2.0](https://github.com/EPFL-ENAC/urbes-globe-viz/compare/v0.1.8...v0.2.0) (2026-06-15)


### Features

* **wrf:** update project description texts, allow string year ([#21](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/21)) ([c4173b0](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/c4173b037abf7ee1e73ba1f43f14867885d4ae48))

## [0.1.8](https://github.com/EPFL-ENAC/urbes-globe-viz/compare/v0.1.7...v0.1.8) (2026-06-15)


### Bug Fixes

* **projects:** preserve title line breaks ([#27](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/27)) ([6d3d451](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/6d3d4518c4dca35c5e7c9416d77c98084036232a))
* **projects:** split merged tab title on two lines ([#24](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/24)) ([a6c4628](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/a6c462804385bdd2cd731ba19ee099802a982c40))
* **she-sim:** version pmtiles filename to bust cache, document update convention ([#28](https://github.com/EPFL-ENAC/urbes-globe-viz/issues/28)) ([512c185](https://github.com/EPFL-ENAC/urbes-globe-viz/commit/512c18589adf30ccb02938d2f8214d2f87617ff3))
