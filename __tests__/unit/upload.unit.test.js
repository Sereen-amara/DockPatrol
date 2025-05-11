/**
 * @jest-environment jsdom
 */
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Upload.html – File size formatting', () => {
  let window;

  beforeAll(() => {
    const html = fs.readFileSync(
      path.resolve(__dirname, '../../vuln-dashboard/upload.html'),
      'utf8'
    );
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable'
    });
    window = dom.window;
  });

  it('converts 0 bytes correctly', () => {
    expect(window.formatFileSize(0)).toBe('0 Bytes');
  });

  it('leaves bytes < 1 KB as “Bytes”', () => {
    expect(window.formatFileSize(512)).toBe('512 Bytes');
    expect(window.formatFileSize(1023)).toBe('1023 Bytes');
  });



  it('formats MB values', () => {
    expect(window.formatFileSize(1024 * 1024)).toBe('1 MB');
    
    expect(window.formatFileSize(12345678)).toBe('11.77 MB');
  });

});
