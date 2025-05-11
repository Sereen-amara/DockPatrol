async function fetchVulnerabilityData() {
    try {
        const response = await fetch('/trivy-results/php-vuln.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data?.Results?.[0]?.Vulnerabilities || [];
    } catch (error) {
        console.error("Error fetching vulnerability data:", error);
        return [];
    }
}

async function checkContainerSecurity(imageData) {
    try {
        const response = await fetch("http://localhost:8181/v1/data/docker_security/allow", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ input: imageData })
        });

        const result = await response.json();
        console.log("OPA response:", result);
        return result.result;
    } catch (error) {
        console.error("Error fetching OPA policy decision:", error);
        return false;
    }
}

async function updateDashboard() {
    try {
        const vulns = await fetchVulnerabilityData();
        console.log('Loaded vulnerabilities:', vulns);

        document.getElementById('critical-count').textContent =
            vulns.filter(v => v.Severity === 'CRITICAL').length;
        document.getElementById('high-count').textContent =
            vulns.filter(v => v.Severity === 'HIGH').length;
        document.getElementById('medium-count').textContent =
            vulns.filter(v => v.Severity === 'MEDIUM').length;
        document.getElementById('low-count').textContent =
            vulns.filter(v => v.Severity === 'LOW').length;

        const isAllowed = await checkContainerSecurity({
            image: {
                signed: true,
                verified: true,
                vulnerabilities: vulns.map(v => ({
                    id: v.VulnerabilityID,
                    severity: v.Severity
                }))
            }
        });

        const statusElement = document.getElementById("opa-status");
        statusElement.textContent = isAllowed ? "Allowed" : "Blocked";
        statusElement.className = isAllowed ? "badge low" : "badge critical"; 

    } catch (error) {
        console.error("Dashboard update failed:", error);
    }
}

module.exports = {
  fetchVulnerabilityData,
  checkContainerSecurity,
  updateDashboard
};

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('load', updateDashboard);
}

