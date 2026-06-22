# Bionic read converter

A private, browser-based ebook converter for GitHub Pages. Drop in an EPUB or MOBI book and download a new edition with the opening half of each word emphasized.

## Features

- Drag-and-drop or native file browser
- EPUB and MOBI input
- Keep original format, convert to EPUB, or convert to MOBI
- Live chapter-by-chapter progress
- Fully local processing: books are never uploaded
- Responsive light and dark themes

EPUB-to-EPUB conversion preserves the original package, styles, images, metadata, and navigation while changing readable text nodes. Conversions involving MOBI use a compatibility-oriented, text-focused path and may simplify advanced layout and imagery. DRM-protected books are not supported.

## Local development

```bash
npm install
npm run dev
```

Run the automated checks and production build with:

```bash
npm test
npm run build
```

## Deployment

The included GitHub Actions workflow tests, builds, and deploys `dist/` to GitHub Pages on every push to `main`. In the repository settings, select **GitHub Actions** as the Pages source.

## Original CLI

The earlier Calibre-based Python script remains available as `apply_bioread.py` for local command-line use.

## License

MIT
