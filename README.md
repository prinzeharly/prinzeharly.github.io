# prinzeharly.github.io

Portfolio of Prinze Harly — student, photographer, videographer, and aspiring engineer.
Live at https://prinzeharly.com (GitHub Pages, custom domain via `CNAME`).

## Structure

```
index.html            page markup
style.css             design tokens, layout, motion
script.js             entrance, scroll reveals, parallax, menu, photo/film viewer
CNAME                 custom domain — keep this file
assets/img/           optimized images (WebP at several widths + JPEG fallback)
assets/fonts/         TeX Gyre Heros web fonts + GUST Font License
assets/photos/        full-resolution originals (not loaded by the page)
```

No build step, no frameworks, no external services besides the YouTube embeds.

## Preview locally

```bash
cd prinzeharly.github.io
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly also works, but a local server matches GitHub Pages.)

## Adding a photograph

1. Put the original in `assets/photos/` (remove GPS location data first — phone photos usually contain it).
2. Export WebP versions at 640, 1024, 1440 and 2048 px wide (or the original width if smaller)
   plus one 1024 px JPEG into `assets/img/`, named `photo-09-640.webp` etc.
3. Copy one of the `<figure class="plate">` blocks in `index.html`, update the paths,
   alt text, place, date and exposure values (from the photo's EXIF data).

## Adding a film

Copy an `<article class="film">` block and change `href`, `data-video` (the YouTube ID),
`data-title`, `data-meta`, the thumbnail paths and the info text.
