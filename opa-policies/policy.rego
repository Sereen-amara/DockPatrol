package docker_security

default allow = false


allow if {
    input.image.signed == true
    input.image.verified == true
    not critical_vulnerability
}


critical_vulnerability if {
    vuln := input.image.vulnerabilities[_]
    vuln.severity == "CRITICAL"
}