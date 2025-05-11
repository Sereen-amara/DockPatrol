// __tests__/integration/dockerfile-build.integration.test.js
const { spawnSync, exec } = require('child_process');
const path = require('path');

// Detect Docker availability
const hasDocker = spawnSync('docker', ['--version'], { shell: true, stdio: 'ignore' }).status === 0;
const describeIfDocker = hasDocker ? describe : describe.skip;

describeIfDocker('Dockerfile', () => {
  // give it up to 10 minutes
  jest.setTimeout(10 * 60_000);

  it('Build image: Tests whether docker build completes successfully', done => {
    const context = path.resolve(__dirname, '..', '..', 'vuln-dashboard', 'scan-service');

    exec(
      'docker build -f Dockerfile -t scan-service-test .',
      { cwd: context, shell: true },
      (err /*, stdout, stderr */) => {
        expect(err).toBeNull();  
        done();
      }
    );
  });
});
