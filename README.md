# SaveWatt Website

Static marketing website for SaveWatt.

## Cloudflare Pages

### Option A: Cloudflare Git integration

Use these build settings when creating the project from the Cloudflare dashboard:

- Framework preset: `None`
- Build command: leave empty
- Build output directory: `.`
- Root directory: `/`
- Production branch: `main`

### Option B: GitHub Actions deploy

This repo includes `.github/workflows/deploy-cloudflare-pages.yml`, which deploys to Cloudflare Pages on every push to `main`.

Add this in GitHub repository settings:

- Repository secret: `CLOUDFLARE_API_TOKEN` with `Cloudflare Pages:Edit` permission for the target account

The production entry page is `index.html`. The Swiss design experiment is available at `index-v2.html`.

## Local Preview

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.