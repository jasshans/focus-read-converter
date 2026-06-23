export const FONT_OPTIONS = [
  { id: 'bookerly', label: 'Bookerly', group: 'Kindle fonts', cssFamily: '"Bookerly", Georgia, serif' },
  { id: 'amazon-ember', label: 'Amazon Ember', group: 'Kindle fonts', cssFamily: '"Amazon Ember", Arial, sans-serif' },
  { id: 'amazon-ember-bold', label: 'Amazon Ember Bold', group: 'Kindle fonts', cssFamily: '"Amazon Ember", Arial, sans-serif', fontWeight: 700 },
  { id: 'baskerville', label: 'Baskerville', group: 'Kindle fonts', cssFamily: 'Baskerville, "Baskerville Old Face", Georgia, serif' },
  { id: 'caecilia', label: 'Caecilia', group: 'Kindle fonts', cssFamily: 'Caecilia, Rockwell, Georgia, serif' },
  { id: 'caecilia-condensed', label: 'Caecilia Condensed', group: 'Kindle fonts', cssFamily: '"Caecilia Condensed", "Arial Narrow", Georgia, serif', fontStretch: 'condensed' },
  { id: 'futura', label: 'Futura', group: 'Kindle fonts', cssFamily: 'Futura, "Trebuchet MS", Arial, sans-serif' },
  { id: 'helvetica', label: 'Helvetica', group: 'Kindle fonts', cssFamily: 'Helvetica, Arial, sans-serif' },
  { id: 'palatino', label: 'Palatino', group: 'Kindle fonts', cssFamily: 'Palatino, "Palatino Linotype", Georgia, serif' },
  { id: 'georgia', label: 'Georgia', group: 'Common fonts', cssFamily: 'Georgia, serif' },
  { id: 'garamond', label: 'Garamond', group: 'Common fonts', cssFamily: 'Garamond, "EB Garamond", Georgia, serif' },
  { id: 'times-new-roman', label: 'Times New Roman', group: 'Common fonts', cssFamily: '"Times New Roman", Times, serif' },
  { id: 'arial', label: 'Arial', group: 'Common fonts', cssFamily: 'Arial, sans-serif' },
  { id: 'verdana', label: 'Verdana', group: 'Common fonts', cssFamily: 'Verdana, Geneva, sans-serif' },
  { id: 'trebuchet-ms', label: 'Trebuchet MS', group: 'Common fonts', cssFamily: '"Trebuchet MS", Arial, sans-serif' },
  { id: 'tahoma', label: 'Tahoma', group: 'Common fonts', cssFamily: 'Tahoma, Verdana, sans-serif' },
  { id: 'courier-new', label: 'Courier New', group: 'Common fonts', cssFamily: '"Courier New", Courier, monospace' },
  { id: 'cambria', label: 'Cambria', group: 'Common fonts', cssFamily: 'Cambria, Georgia, serif' },
  { id: 'century-schoolbook', label: 'Century Schoolbook', group: 'Common fonts', cssFamily: '"Century Schoolbook", Century, Georgia, serif' },
]

export const DEFAULT_FONT = FONT_OPTIONS[0]

export function getFont(fontId) {
  return FONT_OPTIONS.find((font) => font.id === fontId) || DEFAULT_FONT
}

export function focusFontCss(font) {
  const weight = font.fontWeight ? `font-weight:${font.fontWeight};` : ''
  const stretch = font.fontStretch ? `font-stretch:${font.fontStretch};` : ''
  return `font-family:${font.cssFamily};${weight}${stretch}`
}
