$f = 'c:\Users\chris\5PennyAI\Antigravity\EtsyPenny\src\pages\ProductStudio.jsx'
$c = [System.IO.File]::ReadAllText($f)
$old = "                 onRelaunchSEO={handleRelaunchSEO}`r`n              />"
$new = "                 onRelaunchSEO={handleRelaunchSEO}`r`n                onSEOSniper={handleSEOSniper}`r`n                isSniperLoading={isSniperLoading}`r`n              />"
$c = $c.Replace($old, $new)
[System.IO.File]::WriteAllText($f, $c)
Write-Host "Done - replacement applied"
