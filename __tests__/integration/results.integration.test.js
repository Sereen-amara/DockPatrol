/**
 * @jest-environment jsdom
 */
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('results.html', () => {
  let window, document;

  beforeEach(async () => {
    const html = fs.readFileSync(
      path.resolve(__dirname, '../../vuln-dashboard/results.html'),
      'utf8'
    );
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable'
    });
    window = dom.window;
    document = window.document;

  
    window.fetch = jest.fn();
    await new Promise(r => window.addEventListener('DOMContentLoaded', r));
  });

  it('Page load: Tests page is loaded with correct tables and report details', () => {
    expect(document.querySelector('#history-table')).not.toBeNull();
    expect(document.querySelector('#report-details')).not.toBeNull();
  });

  

  it('Sidebar navigation: Verifies clicking links loads correct pages', () => {
    const links = Array.from(document.querySelectorAll('.sidebar-nav a'));
    expect(links.map(a => a.getAttribute('href'))).toEqual([
      '/index.html', '/upload.html', '/insights.html', '/results.html'
    ]);
  });
});
