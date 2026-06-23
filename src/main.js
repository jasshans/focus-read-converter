import './style.css'
import { convertBook } from './converter.js'
import { DEFAULT_FONT, FONT_OPTIONS } from './fonts.js'

const $ = (selector) => document.querySelector(selector)
const dropZone = $('#drop-zone')
const fileInput = $('#file-input')
const selectedFile = $('#selected-file')
const convertButton = $('#convert-button')
const outputFormat = $('#output-format')
const progressPanel = $('#progress-panel')
const resultPanel = $('#result-panel')
const errorPanel = $('#error-panel')
let currentFile = null
let lastResult = null
let selectedFont = DEFAULT_FONT

const fontTrigger = $('#font-trigger')
const fontMenu = $('#font-menu')

function applyPreviewStyle(element, font) {
  element.style.fontFamily = font.cssFamily
  element.style.fontWeight = font.fontWeight || 400
  element.style.fontStretch = font.fontStretch || 'normal'
}

function renderFontMenu() {
  fontMenu.replaceChildren()
  for (const group of ['Kindle fonts', 'Common fonts']) {
    const label = document.createElement('p')
    label.className = 'font-group-label'
    label.textContent = group
    fontMenu.append(label)
    for (const font of FONT_OPTIONS.filter((option) => option.group === group)) {
      const option = document.createElement('button')
      option.type = 'button'
      option.className = 'font-option'
      option.dataset.fontId = font.id
      option.setAttribute('role', 'option')
      option.setAttribute('aria-selected', String(font.id === selectedFont.id))
      option.innerHTML = `<span class="font-option-name"></span><span class="font-option-preview"><b>Fo</b>cus <b>re</b>ading</span><span class="font-option-check" aria-hidden="true">✓</span>`
      option.querySelector('.font-option-name').textContent = font.label
      applyPreviewStyle(option.querySelector('.font-option-preview'), font)
      option.addEventListener('click', () => selectFont(font))
      fontMenu.append(option)
    }
  }
}

function setFontMenuOpen(open, focusSelected = false) {
  fontMenu.hidden = !open
  fontTrigger.setAttribute('aria-expanded', String(open))
  if (open && focusSelected) fontMenu.querySelector('[aria-selected="true"]')?.focus()
}

function selectFont(font) {
  selectedFont = font
  $('#selected-font-name').textContent = font.label
  applyPreviewStyle($('#selected-font-preview'), font)
  fontMenu.querySelectorAll('.font-option').forEach((option) => {
    option.setAttribute('aria-selected', String(option.dataset.fontId === font.id))
  })
  setFontMenuOpen(false)
  fontTrigger.focus()
}

renderFontMenu()
applyPreviewStyle($('#selected-font-preview'), selectedFont)

fontTrigger.addEventListener('click', () => setFontMenuOpen(fontMenu.hidden))
fontTrigger.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    setFontMenuOpen(true, true)
  }
})
fontMenu.addEventListener('keydown', (event) => {
  const options = Array.from(fontMenu.querySelectorAll('.font-option'))
  const index = options.indexOf(document.activeElement)
  if (event.key === 'Escape') {
    setFontMenuOpen(false)
    fontTrigger.focus()
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const direction = event.key === 'ArrowDown' ? 1 : -1
    options[(index + direction + options.length) % options.length]?.focus()
  }
})
document.addEventListener('click', (event) => {
  if (!$('#font-picker').contains(event.target)) setFontMenuOpen(false)
})

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function setFile(file) {
  resultPanel.hidden = true
  errorPanel.hidden = true
  if (!file) {
    currentFile = null
    fileInput.value = ''
    selectedFile.hidden = true
    dropZone.hidden = false
    convertButton.disabled = true
    return
  }
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension !== 'epub') {
    showError('Please choose an .epub file. This tool only converts EPUB to a focused EPUB.')
    return
  }
  if (file.size > 200 * 1024 * 1024) {
    showError('This file is larger than the 200 MB browser limit.')
    return
  }
  currentFile = file
  $('.file-icon').textContent = 'EP'
  $('#file-name').textContent = file.name
  $('#file-meta').textContent = `${extension.toUpperCase()} · ${formatBytes(file.size)}`
  selectedFile.hidden = false
  dropZone.hidden = true
  convertButton.disabled = false
}

function showError(message) {
  progressPanel.hidden = true
  resultPanel.hidden = true
  $('#error-message').textContent = message
  errorPanel.hidden = false
}

function updateProgress(percent, detail) {
  const value = Math.max(0, Math.min(100, percent))
  $('#progress-value').textContent = `${value}%`
  $('#progress-bar').style.width = `${value}%`
  $('#progress-label').textContent = value >= 100 ? 'Conversion complete' : 'Creating your focus EPUB…'
  $('#progress-detail').textContent = detail
}

dropZone.addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', () => setFile(fileInput.files[0]))
$('#remove-file').addEventListener('click', () => setFile(null))

for (const eventName of ['dragenter', 'dragover']) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault()
    dropZone.classList.add('is-dragging')
  })
}
for (const eventName of ['dragleave', 'drop']) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault()
    dropZone.classList.remove('is-dragging')
  })
}
dropZone.addEventListener('drop', (event) => setFile(event.dataTransfer.files[0]))

convertButton.addEventListener('click', async () => {
  if (!currentFile) return
  convertButton.disabled = true
  errorPanel.hidden = true
  resultPanel.hidden = true
  progressPanel.hidden = false
    updateProgress(0, 'Your EPUB is staying right here in this browser.')
  try {
    lastResult = await convertBook(currentFile, outputFormat.value, selectedFont.id, updateProgress)
    lastResult.download()
    $('#result-summary').textContent = `${lastResult.chapters} chapter${lastResult.chapters === 1 ? '' : 's'} · ${lastResult.words.toLocaleString()} words enhanced · ${selectedFont.label} · ${lastResult.format.toUpperCase()}`
    progressPanel.hidden = true
    resultPanel.hidden = false
  } catch (error) {
    console.error(error)
    showError(error?.message || 'The file appears to be damaged or protected with DRM.')
  } finally {
    convertButton.disabled = false
  }
})

$('#download-again').addEventListener('click', () => lastResult?.download())

const themeToggle = $('#theme-toggle')
const storedTheme = localStorage.getItem('focus-read-theme')
if (storedTheme === 'dark' || (!storedTheme && matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.dataset.theme = 'dark'
}
function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark'
  themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`)
}
syncThemeButton()
themeToggle.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark'
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  localStorage.setItem('focus-read-theme', dark ? 'dark' : 'light')
  syncThemeButton()
})
