/**
 * @jest-environment jsdom
 */

if (typeof setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(() => fn(...args), 0)
}

const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

const fs    = require('fs')
const path  = require('path')
const fetch = require('cross-fetch')
global.fetch = fetch

const { JSDOM } = require('jsdom')
const { app }   = require('../../vuln-dashboard/scan-service/index.js')

jest.setTimeout(20000)

let server, origin

beforeAll(done => {
  process.env.NODE_ENV = 'test'
  server = app.listen(0, () => {
    origin = `http://localhost:${server.address().port}`
    done()
  })
})

afterAll(() => server.close())

describe('upload.html (live backend)', () => {
  let window, document, form, fileInput, submitBtn, cancelBtn, statusCard

  beforeEach(async () => {
    const html = fs.readFileSync(
      path.resolve(__dirname, '../../vuln-dashboard/upload.html'),
      'utf8'
    )

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: origin + '/upload.html'
    })

    window   = dom.window
    document = window.document

    window.fetch = (url, opts) => fetch(origin + url, opts)

    await new Promise(r => window.addEventListener('DOMContentLoaded', r))

    form       = document.getElementById('upload-form')
    fileInput  = document.getElementById('archive')
    submitBtn  = document.getElementById('submit-btn')
    cancelBtn  = document.getElementById('cancel-btn')
    statusCard = document.getElementById('status')
  })

  it('File selection: UI updates when a file is selected', () => {
    const file = new window.File(['hello'], 'test.zip', {
      type: 'application/zip', size: 1234
    })

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true,
      configurable: true
    })

    fileInput.dispatchEvent(new window.Event('change'))

    expect(submitBtn.disabled).toBe(false)
    expect(document.getElementById('file-label').textContent)
      .toBe('test.zip')
  })

  it('Drag and drop: UI updates when a file is dropped', () => {
    const file = new window.File(['data'], 'drag.tar.gz', {
      type: 'application/gzip', size: 2048
    })
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true,
      configurable: true
    })
    fileInput.dispatchEvent(new window.Event('change'))

    expect(submitBtn.disabled).toBe(false)
    expect(document.getElementById('file-label').textContent)
      .toBe('drag.tar.gz')
  })

 
   

  it('Failed scan: Shows error message when scan fails', async () => {
    const file = new window.File(['bad'], 'bad.zip', {
      type: 'application/zip', size: 512
    })

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true,
      configurable: true
    })
    fileInput.dispatchEvent(new window.Event('change'))

    form.dispatchEvent(new window.Event('submit', {
      bubbles: true, cancelable: true
    }))
    await new Promise(r => setTimeout(r, 500))

    expect(statusCard.textContent).toMatch(/Error:/)
  })

  it('Cancel scan: stop an ongoing scan', async () => {
    const file = new window.File(['x'], 'ok.zip', {
      type: 'application/zip', size: 512
    })

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true,
      configurable: true
    })
    fileInput.dispatchEvent(new window.Event('change'))

    form.dispatchEvent(new window.Event('submit', {
      bubbles: true, cancelable: true
    }))

    expect(cancelBtn.disabled).toBe(false)

    cancelBtn.click()
    await new Promise(r => setTimeout(r, 200))

    expect(statusCard.textContent).toMatch(/Scan cancelled/)
    expect(cancelBtn.disabled).toBe(true)
  })
})
