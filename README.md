# Focus Read Converter

A private, browser-based ebook converter for GitHub Pages. Drop in an EPUB and download a new focus-reading EPUB that emphasizes the opening half of each word.

## Features

- Drag-and-drop or native file browser
- EPUB input
- EPUB-to-EPUB focus-mode output
- 19 selectable reading fonts with live focus-style previews
- Kindle device fonts without bundling proprietary font files
- Live chapter-by-chapter progress
- Fully local processing: books are never uploaded
- Responsive light and dark themes

EPUB-to-EPUB conversion preserves the original package, styles, images, metadata, and navigation while changing readable text nodes. MOBI input, MOBI output, AZW3 output, and DRM-protected books are not supported.

For Kindle, download the focused EPUB and use Amazon Send to Kindle. Amazon handles the Kindle-side conversion. Direct AZW3/MOBI export requires Kindle-specific native tooling such as Calibre/Kindle tools, which is not a reliable fit for a static GitHub Pages browser app.

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
