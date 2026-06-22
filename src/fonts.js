export const FONT_OPTIONS = [
  { id: 'bookerly', label: 'Bookerly', group: 'Kindle fonts', cssFamily: '"Bookerly", Georgia, serif', mobiFace: 'Bookerly' },
  { id: 'amazon-ember', label: 'Amazon Ember', group: 'Kindle fonts', cssFamily: '"Amazon Ember", Arial, sans-serif', mobiFace: 'Amazon Ember' },
  { id: 'amazon-ember-bold', label: 'Amazon Ember Bold', group: 'Kindle fonts', cssFamily: '"Amazon Ember", Arial, sans-serif', mobiFace: 'Amazon Ember', fontWeight: 700 },
  { id: 'baskerville', label: 'Baskerville', group: 'Kindle fonts', cssFamily: 'Baskerville, "Baskerville Old Face", Georgia, serif', mobiFace: 'Baskerville' },
  { id: 'caecilia', label: 'Caecilia', group: 'Kindle fonts', cssFamily: 'Caecilia, Rockwell, Georgia, serif', mobiFace: 'Caecilia' },
  { id: 'caecilia-condensed', label: 'Caecilia Condensed', group: 'Kindle fonts', cssFamily: '"Caecilia Condensed", "Arial Narrow", Georgia, serif', mobiFace: 'Caecilia Condensed', fontStretch: 'condensed' },
  { id: 'futura', label: 'Futura', group: 'Kindle fonts', cssFamily: 'Futura, "Trebuchet MS", Arial, sans-serif', mobiFace: 'Futura' },
  { id: 'helvetica', label: 'Helvetica', group: 'Kindle fonts', cssFamily: 'Helvetica, Arial, sans-serif', mobiFace: 'Helvetica' },
  { id: 'palatino', label: 'Palatino', group: 'Kindle fonts', cssFamily: 'Palatino, "Palatino Linotype", Georgia, serif', mobiFace: 'Palatino' },
  { id: 'georgia', label: 'Georgia', group: 'Common fonts', cssFamily: 'Georgia, serif', mobiFace: 'Georgia' },
  { id: 'garamond', label: 'Garamond', group: 'Common fonts', cssFamily: 'Garamond, "EB Garamond", Georgia, serif', mobiFace: 'Garamond' },
  { id: 'times-new-roman', label: 'Times New Roman', group: 'Common fonts', cssFamily: '"Times New Roman", Times, serif', mobiFace: 'Times New Roman' },
  { id: 'arial', label: 'Arial', group: 'Common fonts', cssFamily: 'Arial, sans-serif', mobiFace: 'Arial' },
  { id: 'verdana', label: 'Verdana', group: 'Common fonts', cssFamily: 'Verdana, Geneva, sans-serif', mobiFace: 'Verdana' },
  { id: 'trebuchet-ms', label: 'Trebuchet MS', group: 'Common fonts', cssFamily: '"Trebuchet MS", Arial, sans-serif', mobiFace: 'Trebuchet MS' },
  { id: 'tahoma', label: 'Tahoma', group: 'Common fonts', cssFamily: 'Tahoma, Verdana, sans-serif', mobiFace: 'Tahoma' },
  { id: 'courier-new', label: 'Courier New', group: 'Common fonts', cssFamily: '"Courier New", Courier, monospace', mobiFace: 'Courier New' },
  { id: 'cambria', label: 'Cambria', group: 'Common fonts', cssFamily: 'Cambria, Georgia, serif', mobiFace: 'Cambria' },
  { id: 'century-schoolbook', label: 'Century Schoolbook', group: 'Common fonts', cssFamily: '"Century Schoolbook", Century, Georgia, serif', mobiFace: 'Century Schoolbook' },
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
