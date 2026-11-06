param(
    [int]$FrontendPort = 5197,
    [int]$BackendPort = 8080
)
$ErrorActionPreference = 'Stop'
$frontend = "http://127.0.0.1:$FrontendPort"
$backend = "http://127.0.0.1:$BackendPort"

$page = Invoke-WebRequest "$frontend/" -UseBasicParsing
if ($page.StatusCode -ne 200 -or $page.Content -notmatch '<div id="root"></div>') {
    throw 'Frontend ana sayfasi yuklenemedi.'
}
$health = Invoke-RestMethod "$frontend/actuator/health"
if ($health.status -ne 'UP') { throw 'Frontend uzerinden backend saglik kontrolu basarisiz.' }

$directResponse = Invoke-RestMethod "$backend/api/v1/inspections/failures"
$proxiedResponse = Invoke-RestMethod "$frontend/api/v1/inspections/failures"
$direct = @()
$proxied = @()
if ($null -ne $directResponse) { $direct = @($directResponse) }
if ($null -ne $proxiedResponse) { $proxied = @($proxiedResponse) }
if ($direct.Count -ne $proxied.Count) { throw 'Proxy ve backend kayit sayilari uyusmuyor.' }
for ($i = 0; $i -lt $direct.Count; $i++) {
    foreach ($field in @('id', 'lineCode', 'capOk', 'labelOk', 'liquidLevelOk', 'overallResult', 'inspectedAt', 'imagePath')) {
        if ($direct[$i].$field -cne $proxied[$i].$field) {
            throw "Proxy ve backend kaydi farkli: $field"
        }
    }
}
Write-Host "PASS Frontend sayfasi, backend saglik proxy'si ve $($direct.Count) hata kaydi dogrulandi."
if ($direct.Count -eq 0) {
    Write-Host 'Bos yanit dogrulandi; gercek kayit gelmeden kayit goruntuleme dogrulanamaz.'
}
