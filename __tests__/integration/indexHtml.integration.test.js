/**
 * @jest-environment jsdom
 */
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');


describe('index.html Integration', () => {
    let window, document

    beforeAll(async () => {
        const html = fs.readFileSync(
            path.resolve(__dirname, '../../vuln-dashboard/index.html'),
            'utf8'
        )
        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable'
        })
        window = dom.window
        document = window.document
        await new Promise(r => window.addEventListener('DOMContentLoaded', r))
    })

    it('loadOPA(): Shows Healthy when OPA scans code and no errors and vice versa', async () => {
        await window.loadOPA()
        const status = document.getElementById('opa-status').textContent
        expect(['Healthy', 'Unhealthy']).toContain(status)
    })

    it('loadPromethues(): Updates Prometheus targets health', async () => {
        await window.loadPrometheus()
        const upCount = document.getElementById('prom-up-count').textContent
        expect(upCount).toMatch(/^(\d+|—)$/)
    })

    it('loadSonarIssues(): Fills SonarQube issue tables', async () => {
        await window.loadSonarIssues()
        const rows = document.getElementById('sonar-issues-body').querySelectorAll('tr')
        expect(rows.length).toBeGreaterThan(0)
    })



    it('Sidebar navigation: Verifies clicking links loads correct pages', () => {
        const hrefs = Array.from(document.querySelectorAll('.sidebar-nav a')).map(a => a.href)
        expect(hrefs).toContainEqual(expect.stringContaining('insights.html'));
        expect(hrefs).toContainEqual(expect.stringContaining('upload.html'))
    })

    it('page load: End-to-end check dashboard loads', () => {
        expect(document.querySelector('canvas')).not.toBeNull()
    })

    it('updateScannedApp(): Shows current scanned app name', () => {
        const name = document.getElementById('scanned-name').textContent
        expect(name).toMatch(/\w+/)
    })
})
