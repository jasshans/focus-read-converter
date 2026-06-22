# Focus Read Converter

A private, browser-based ebook converter for GitHub Pages. Drop in an EPUB or MOBI book and download a new focus-reading edition that emphasizes the opening half of each word.

## Features

- Drag-and-drop or native file browser
- EPUB and MOBI input
- Keep the original format or convert between EPUB and MOBI
- 19 selectable reading fonts with live focus-style previews
- Kindle device fonts without bundling proprietary font files
- Live chapter-by-chapter progress
- Fully local processing: books are never uploaded
- Responsive light and dark themes

EPUB-to-EPUB conversion preserves the original package, styles, images, metadata, and navigation while changing readable text nodes. Conversions involving MOBI use a compatibility-oriented, text-focused path and may simplify advanced layout and imagery. DRM-protected books are not supported.

Kindle fonts are referenced by family name and use compatible fallbacks in browsers and other readers. They are not copied or embedded in the project. A reader must already have the selected proprietary font installed to display that exact face.

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

The included GitHub Actions workflow tests, builds, and deploys `dist/` to GitHub Pages on every push to `main`.

## License

MIT
