// index.js
const express = require('express');
const multer = require('multer');
const unzip = require('unzipper');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const client = require('prom-client');
const fetch = require('node-fetch');

const app = express();
const register = new client.Registry();

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const TRIVY_DIR = path.join(__dirname, 'trivy-results');
const SONAR_DIR = path.join(__dirname, 'sonar-results');

const sonarToken = process.env.SONAR_TOKEN;

// Gauge for Trivy severities
const trivyGauge = new client.Gauge({
  name: 'trivy_vulnerabilities',
  help: 'Number of Trivy vulnerabilities by severity',
  labelNames: ['severity']
});
register.registerMetric(trivyGauge);

const sonarGauge = new client.Gauge({
  name: 'sonar_issues',
  help: 'Number of SonarQube issues by severity',
  labelNames: ['severity']
});
register.registerMetric(sonarGauge);

//CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 
app.get('/insights.html', (req, res) =>
  res.sendFile(path.join(__dirname, 'insights.html'))
);

app.get('/results.html', (req, res) =>
  res.sendFile(path.join(__dirname, 'results.html'))
);

//  list uploads with Trivy & Sonar URLs
app.get('/api/uploads', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, entries) => {
    if (err) return res.status(500).json({ error: err.message });

    const uploads = entries
      .filter(name => /^\d+$/.test(name))
      .map(id => {
        // find project name from first subfolder
        let project = id;
        try {
          const subs = fs.readdirSync(path.join(UPLOAD_DIR, id))
            .filter(c => fs.statSync(path.join(UPLOAD_DIR, id, c)).isDirectory());
          project = subs.find(s => s !== '.scannerwork') || subs[0] || id;
        } catch (_) { }

        return {
          id,
          project,
          timestamp: Number(id),
          trivyUrl: `/trivy-results/${id}.json`,
          sonarUrl: `/sonar-results/${id}.json`
        };
      });

    res.json({ uploads });
  });
});

// Static folders
app.use(express.static(path.join(__dirname, 'public')));

// Proxies
app.use('/api/prometheus',
  createProxyMiddleware({
    target: 'http://prometheus:9090',
    changeOrigin: true,
    pathRewrite: { '^/api/prometheus': '' }
  })
);
app.use('/api/sonarqube',
  createProxyMiddleware({
    target: 'http://sonarqube:9000',
    changeOrigin: true,
    pathRewrite: { '^/api/sonarqube': '' },
    onProxyReq(proxyReq) {
      const auth = Buffer.from(`${sonarToken}:`).toString('base64');
      proxyReq.setHeader('Authorization', `Basic ${auth}`);
    }
  })
);

//  Clear data endpoint
function clearAllData(req, res) {
  try {
    // call SonarQube delete API
    execSync(
      `curl -X POST -u ${sonarToken}: ` +
      `"http://sonarqube:9000/api/projects/delete?project=${encodeURIComponent('vuln-dashboard')}"`
    );
    console.log('✅ Cleared SonarQube project only');
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error clearing SonarQube project:', err.message);
    res.status(500).json({ error: err.message });
  }
}

app.post('/api/clear', clearAllData);
app.delete('/api/clear', clearAllData);

//Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

//  Ensure dirs exist on startup
[UPLOAD_DIR, TRIVY_DIR, SONAR_DIR].forEach(dir =>
  fs.mkdirSync(dir, { recursive: true })
);

// 8) prometheus client metrics
const scanDuration = new client.Histogram({
  name: 'scan_duration_seconds',
  help: 'Duration of scan operations in seconds',
  buckets: [0.1, 5, 15, 50, 100, 300],
  labelNames: ['status']
});
const scanCount = new client.Counter({
  name: 'scans_total',
  help: 'Total number of scans performed',
  labelNames: ['status']
});
register.registerMetric(scanDuration);
register.registerMetric(scanCount);

// 9) Multer for uploads
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /\.(zip|tar\.gz)$/i.test(file.originalname)
      ? cb(null, true)
      : cb(new Error('Only ZIP/tar.gz archives allowed'), false)
});

//  Helper to find Dockerfile
function findDockerfile(startPath) {
  for (const name of fs.readdirSync(startPath)) {
    const full = path.join(startPath, name);
    if (fs.statSync(full).isDirectory()) {
      const found = findDockerfile(full);
      if (found) return found;
    } else if (name.toLowerCase() === 'dockerfile') {
      return full;
    }
  }
  return null;
}

//Main scan endpoint
app.post('/', upload.single('archive'), async (req, res) => {
  const endTimer = scanDuration.startTimer();
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const id = Date.now().toString();
  const extractPath = path.join(UPLOAD_DIR, id);
  const trivyOut = path.join(TRIVY_DIR, `${id}.json`);

  // giveing each scan its own Sonar project key

  const sonarProjectKey = `scan-${id}`;
  try {
    //  extract
    fs.rmSync(extractPath, { recursive: true, force: true });
    fs.mkdirSync(extractPath, { recursive: true });
    await new Promise((r, rej) => {
      fs.createReadStream(req.file.path)
        .pipe(unzip.Extract({ path: extractPath }))
        .on('close', r).on('error', rej);
    });

    // build &  temp Docker image
    const df = findDockerfile(extractPath);
    if (!df) throw new Error('No Dockerfile found');
    const dfDir = path.dirname(df);
    execSync(`docker build -t uploaded-${id} -f "${df}" "${dfDir}"`, { stdio: 'inherit', timeout: 900000 });
    execSync(`docker run -d --name scan-container-${id} uploaded-${id} tail -f /dev/null`, { stdio: 'inherit' });
    execSync(`docker commit scan-container-${id} snapshot-${id}`, { stdio: 'inherit' });
    execSync(`docker rm -f scan-container-${id}`, { stdio: 'inherit' });

    // Trivy scan & update latest.json
    execSync(`trivy image --format json -o "${trivyOut}" snapshot-${id}`, { stdio: 'inherit' });
    fs.copyFileSync(trivyOut, path.join(TRIVY_DIR, 'latest.json'));
    console.log('✅ Updated Trivy latest.json');

    // update Prometheus gauge
    const trivyData = JSON.parse(fs.readFileSync(path.join(TRIVY_DIR, 'latest.json'), 'utf8'));
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    trivyData.Results.forEach(r => (r.Vulnerabilities || []).forEach(v => {
      counts[v.Severity] = (counts[v.Severity] || 0) + 1;
    }));
    Object.entries(counts).forEach(([sev, val]) => trivyGauge.set({ severity: sev }, val));

    //  SonarQube analysis 
    fs.copyFileSync(
      path.join(__dirname, 'sonar-project.properties'),
      path.join(extractPath, 'sonar-project.properties')
    );
    fs.writeFileSync(
      path.join(extractPath, 'tsconfig.json'),
      JSON.stringify(
        { compilerOptions: { allowJs: true, noEmit: true }, include: ['**/*.js', '**/*.ts'] },
        null, 2
      )
    );

    try {
      console.log('➡️ Running SonarQube analysis…');
      execSync(
        [
          'sonar-scanner',
          `-Dsonar.login=${sonarToken}`,
          '-Dsonar.host.url=http://sonarqube:9000',
          `-Dsonar.projectKey=${sonarProjectKey}`,
          `-Dsonar.projectName=${sonarProjectKey}`,
          '-Dsonar.sources=.'        
        ].join(' '),
        { cwd: extractPath, stdio: 'inherit', timeout: 300000 }
      );
      console.log('✅ Sonar analysis complete');

      const PROJECT_KEY = 'vuln-dashboard';   

      const sonarApi =
        `http://sonarqube:9000/api/issues/search?` +
        `projectKeys=${encodeURIComponent(PROJECT_KEY)}` +
        `&ps=500&p=1`;
      const raw = execSync(`curl -u ${sonarToken}: "${sonarApi}"`);

      // write the per-scan file
      const perScanPath = path.join(SONAR_DIR, `${id}.json`);
      fs.writeFileSync(perScanPath, raw);

      // mirror to latest.json
      fs.copyFileSync(perScanPath, path.join(SONAR_DIR, 'latest.json'));
      console.log('✅ Updated SonarQube latest.json');

      // update Prometheus gauge
      const sonarData = JSON.parse(raw.toString('utf8'));
      const sonarCounts = { BLOCKER: 0, CRITICAL: 0, MAJOR: 0, MINOR: 0, INFO: 0 };
      (sonarData.issues || []).forEach(i => {
        const sev = i.severity.toUpperCase();
        if (sonarCounts[sev] !== undefined) sonarCounts[sev]++;
      });
      Object.entries(sonarCounts).forEach(([severity, count]) => {
        sonarGauge.set({ severity }, count);
      });


    } catch (err) {
      console.error('❌ Sonar scan or JSON write failed:', err);

      throw err;
    }


    // cleaning  Docker images
    execSync(`docker rmi -f uploaded-${id} snapshot-${id}`, { stdio: 'inherit' });

    scanCount.inc({ status: 'success' });
    endTimer({ status: 'success' });

    res.json({
      success: true,
      trivy: `/trivy-results/${id}.json`,
      sonar: `/sonar-results/${id}.json`
    });
  } catch (err) {
    scanCount.inc({ status: 'error' });
    endTimer({ status: 'error' });
    console.error('Scan failed:', err);
    fs.rmSync(extractPath, { recursive: true, force: true });
    if (req.file.path) fs.rmSync(req.file.path, { force: true });
    res.status(500).json({ error: err.message });
  }
});

//  Static mounts for results
app.use('/trivy-results', express.static(TRIVY_DIR));
app.use('/sonar-results', express.static(SONAR_DIR));



if (process.env.NODE_ENV !== 'test') {
  app.listen(3001, '0.0.0.0', () =>
    console.log('🚀 Scan service running on port 3001')
  );
}


module.exports = { app };