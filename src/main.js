import './style.css'
import { convertBook } from './converter.js'

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
  if (!['epub', 'mobi'].includes(extension)) {
    showError('Please choose an .epub or .mobi file.')
    return
  }
  if (file.size > 200 * 1024 * 1024) {
    showError('This file is larger than the 200 MB browser limit.')
    return
  }
  currentFile = file
  $('.file-icon').textContent = extension.toUpperCase().slice(0, 2)
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
  $('#progress-label').textContent = value >= 100 ? 'Conversion complete' : 'Creating your bionic edition…'
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
  updateProgress(0, 'Your file is staying right here in this browser.')
  try {
    lastResult = await convertBook(currentFile, outputFormat.value, updateProgress)
    lastResult.download()
    $('#result-summary').textContent = `${lastResult.chapters} chapter${lastResult.chapters === 1 ? '' : 's'} · ${lastResult.words.toLocaleString()} words enhanced · ${lastResult.format.toUpperCase()}`
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
const storedTheme = localStorage.getItem('bionic-theme')
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
  localStorage.setItem('bionic-theme', dark ? 'dark' : 'light')
  syncThemeButton()
})
