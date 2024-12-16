<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: text/plain; charset=utf-8');

$url = isset($_GET['url']) ? $_GET['url'] : '';
if (empty($url)) {
    die('URL parameter is required');
}

$apiUrl = 'https://api.1xz.icu/api/ping?url=' . urlencode($url);
echo file_get_contents($apiUrl);