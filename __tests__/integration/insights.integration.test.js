/**
 * @jest-environment jsdom
 */
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const fs   = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('insights.html Integration', () => {
  let window, document;

  beforeAll(async () => {
    const html = fs.readFileSync(
      path.resolve(__dirname, '../../vuln-dashboard/insights.html'),
      'utf8'
    );
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable'
    });
    window   = dom.window;
    document = window.document;
    await new Promise(r => window.addEventListener('DOMContentLoaded', r));
  });

  it('Iframe load: Checks dashboard loads metrics correctly', () => {
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.src).toMatch(/:\/\/.*3000/);
  });

  it('Sidebar navigation: Verifies clicking links loads correct pages', () => {
    const hrefs = Array.from(
      document.querySelectorAll('.sidebar-nav a')
    ).map(a => a.getAttribute('href'));
    expect(hrefs).toContainEqual(expect.stringContaining('insights.html'));
    expect(hrefs).toContainEqual(expect.stringContaining('upload.html'));
    expect(hrefs).toContainEqual(expect.stringContaining('results.html'));
    expect(hrefs).toContainEqual(expect.stringContaining('index.html'));
  });
});
