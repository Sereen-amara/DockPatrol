<<<<<<< HEAD
# Docker-Project

=======
>>>>>>> master
## Disclaimer
This repository contains a vulnerable PHP file for testing purposes only. Use it responsibly in a controlled environment. 
DO NOT deploy this code to production systems.


This application is designed to provide a dashboard to monitor vulnerabilities identified through  Trivy and SonarQube, alongside system metrics from Prometheus. It allows users to visualize vulnerabilities categorized by severity and source, enabling efficient vulnerability management.



Vulnerability Breakdown:
Displays vulnerabilities identified by Trivy (DAST) and SonarQube (SAST).
Segregates vulnerabilities into Critical, High, Medium, and Low categories.
 
Charts:
2 chart categorized into SAST and DAST.
Prometheus metrics visualized for system monitoring (e.g., CPU usage, memory usage, and service availability).

Trivy: Scans for container vulnerabilities (DAST).
SonarQube: Scans code for static vulnerabilities (SAST).
Prometheus: System performance metrics.


Setup Instructions: 

Step 1:
git clone <repository-url> 
cd <repository-folder>

n
Step 2:
docker-compose up --build

Step 3: 
Access the following services:

Vulnerability Dashboard: http://localhost:8081
PHP Application: http://localhost:8080
SonarQube: http://localhost:9000
Prometheus: http://localhost:9090


tep 3: Run Scans
Trivy: Run the following command to generate scan results:

trivy fs --format json -o trivy-results/php-vuln.json 


Usage: 
Access the Vulnerability Dashboard.
View identified vulnerabilities categorized as:
Critical
High
Medium
Low

See the the charts between SAST (SonarQube) and DAST (Trivy).
<<<<<<< HEAD
Use the Prometheus metrics to monitor system health.
=======
Use the Prometheus metrics to monitor system health.
>>>>>>> master
