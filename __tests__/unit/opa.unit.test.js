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

const {
  fetchVulnerabilityData,
  checkContainerSecurity
} = require('../../vuln-dashboard/opa-integration.js');

describe('fetchVulnerabilityData()', () => {
  beforeEach(() => { global.fetch = jest.fn(); });
  afterEach(() => { jest.resetAllMocks(); });

  it('Get vulnerability data - success: Tests if vulnerability array is returned when api succeeds', async () => {
    const fake = [{ VulnerabilityID: 'CVE-1', Severity: 'HIGH' }];
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ Results: [{ Vulnerabilities: fake }] })
    });
    await expect(fetchVulnerabilityData()).resolves.toEqual(fake);
  });

  it('Get vulnerability data - fail: Tests if when vulnerability array is empty = logs error', async () => {
    global.fetch.mockResolvedValue({ ok: false });
    const result = await fetchVulnerabilityData();
    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching vulnerability data:',
      expect.any(Error)
    );
  });
});

describe('checkContainerSecurity()', () => {
  beforeEach(() => { global.fetch = jest.fn(); });
  afterEach(() => { jest.resetAllMocks(); });

  it('check container security (allowed): Returns healthy when opa approves container', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: true })
    });
    await expect(checkContainerSecurity({ foo: 'bar' })).resolves.toBe(true);
  });

  it('check container security (blocked): Returns unhealthy when opa does not approve container', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: false })
    });
    await expect(checkContainerSecurity({ foo: 'bar' })).resolves.toBe(false);
  });
});
