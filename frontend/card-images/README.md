# Card source images

Drop one curated image per project here, named after the project id:

    card-images/wrf.jpg
    card-images/buildings.png
    ...

Any common format/size works (jpg, png, webp, tif, avif). Then run:

    npm run card-images          # process all
    npm run card-images -- wrf   # just one

It square-crops (centre) and writes optimized webp to
`public/previews/cards/<id>.webp`, which the project cards serve.
