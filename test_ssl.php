
<?php

$url = "https://partnersv1.pinbot.ai";

$ch = curl_init($url);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

$response = curl_exec($ch);

$error = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

echo "HTTP Status: " . $httpCode . PHP_EOL;

if ($error) {
    echo "SSL/CURL Error: " . $error . PHP_EOL;
} else {
    echo "SSL/CURL: OK" . PHP_EOL;
}

curl_close($ch);
