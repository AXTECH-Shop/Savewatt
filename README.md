# SaveWatt Website

Static marketing website for SaveWatt.

## Cloudflare Pages

This project is deployed with Wrangler direct uploads.

Deploy after pushing changes to GitHub:

```sh
./scripts/deploy-wrangler.sh
```

The script creates a clean `.deploy-site/` folder with only the public site files, creates the `savewatt` Pages project if needed, then deploys it with Wrangler.

The production entry page is `index.html`. The Swiss design experiment is available at `index-v2.html`.

## Local Preview

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.