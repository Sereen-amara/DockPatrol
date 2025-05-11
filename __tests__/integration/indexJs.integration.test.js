/**
 * @jest-environment node
 */
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { app } = require('../../vuln-dashboard/scan-service/index.js');
jest.setTimeout(5 * 60 * 1000);

// allow up to 5 minutes for real scans
jest.setTimeout(5 * 60 * 1000);

describe('Index.js full integration', () => {
  


    // 13) Trivy results
    it('GET /trivy-results/:id → 200 + JSON', async () => {
        const files = fs.readdirSync(
            path.resolve(__dirname, '../../vuln-dashboard/scan-service/trivy-results')
        );
        if (!files.length) return;
        const res = await request(app).get(`/trivy-results/${files[0]}`);
        expect(res.status).toBe(200);
        expect(res.type).toMatch(/json/);
    });

    // 14) Sonar results
    it('GET /sonar-results/:id → 200 + JSON', async () => {
        const files = fs.readdirSync(
            path.resolve(__dirname, '../../vuln-dashboard/scan-service/sonar-results')
        );
        if (!files.length) return;
        const res = await request(app).get(`/sonar-results/${files[0]}`);
        expect(res.status).toBe(200);
        expect(res.type).toMatch(/json/);
    });
});
