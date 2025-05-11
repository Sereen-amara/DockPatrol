/**
 * @jest-environment jsdom
 */

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

const { updateDashboard } = require('../../vuln-dashboard/opa-integration.js');

describe('updateDashboard()', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="critical-count"></div>
      <div id="high-count"></div>
      <div id="medium-count"></div>
      <div id="low-count"></div>
      <div id="opa-status"></div>
    `;
    jest.resetAllMocks();
  });

  it('Update dashboard (allowed): Tests for healthy update', async () => {
    const fakeVulns = [
      { VulnerabilityID: 'a', Severity: 'CRITICAL' },
      { VulnerabilityID: 'b', Severity: 'LOW' }
    ];
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{ Vulnerabilities: fakeVulns }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: true })
      });

    await updateDashboard();

    expect(document.getElementById('critical-count').textContent).toBe('1');
    expect(document.getElementById('low-count').textContent).toBe('1');
    expect(document.getElementById('opa-status').textContent).toBe('Allowed');
  });

  it('Update dashboard (blocked): Tests for unhealthy update', async () => {
    const fakeVulns = [
      { VulnerabilityID: 'x', Severity: 'HIGH' },
      { VulnerabilityID: 'y', Severity: 'MEDIUM' }
    ];
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{ Vulnerabilities: fakeVulns }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: false })
      });

    await updateDashboard();

    expect(document.getElementById('high-count').textContent).toBe('1');
    expect(document.getElementById('medium-count').textContent).toBe('1');
    expect(document.getElementById('opa-status').textContent).toBe('Blocked');
  });
});
