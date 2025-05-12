# DockPatrol

A simple guide to set up, launch, and use DockPatrol for scanning Docker images with Trivy and SonarQube.

---

## Prerequisites

* Docker & Docker Compose installed
* Node.js & npm installed

---

## Step 1: Setup and Launch

### 1. Clone the Repository

```bash
git clone https://github.com/Sereen-amara/DockPatrol
cd DockPatrol
```

### 2. Install Dependencies

In the project root, run:

```bash
npm install
```

### 3. Prepare Storage Directories

Ensure these folders exist alongside your code:

* `uploads`
* `trivy-results`
* `sonar-results`

You can create them with:

```bash
mkdir uploads trivy-results sonar-results
```

### 4. Start All Services

From the project root, run:

```bash
docker compose up
```

---

## Step 2: Verify and Use

### 1. Verify Services

* **Dashboard UI:** [http://localhost:8081](http://localhost:8081)

Ensure all containers are healthy and the dashboard is reachable.

### 2. Run a Scan

1. In the Dashboard UI, go to **Upload**
2. Select a `.zip` or `.tar.gz` containing your `Dockerfile` (plus any context files)
3. Click **Start scan**
4. When it finishes, view or download the Trivy and Sonar reports

### 3. Run Automated Tests

* **Full test suite:**

  ```bash
  npm test
  ```

* **Coverage report:**

  ```bash
  npm run coverage
  ```
