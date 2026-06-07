# SaveWatt Website

Static marketing website for SaveWatt.

## Cloudflare Pages

Use these build settings:

- Framework preset: `None`
- Build command: leave empty
- Build output directory: `.`
- Root directory: `/`
- Production branch: `main`

The production entry page is `index.html`. The Swiss design experiment is available at `index-v2.html`.

## Local Preview

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.