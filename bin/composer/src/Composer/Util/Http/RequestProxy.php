<?php declare(strict_types=1);











namespace Composer\Util\Http;

use Composer\Downloader\TransportException;







class RequestProxy
{

private $contextOptions;

private $status;

private $url;

private $auth;







public function __construct(?string $url, ?string $auth, ?array $contextOptions, ?string $status)
{
$this->url = $url;
$this->auth = $auth;
$this->contextOptions = $contextOptions;
$this->status = $status;
}

public static function none(): RequestProxy
{
return new self(null, null, null, null);
}

public static function noProxy(): RequestProxy
{
return new self(null, null, null, 'excluded by no_proxy');
}






public function getContextOptions(): ?array
{
return $this->contextOptions;
}







public function getCurlOptions(array $sslOptions): array
{
if ($this->isSecure() && !$this->supportsSecureProxy()) {
throw new TransportException('Cannot use an HTTPS proxy. PHP >= 7.3 and cUrl >= 7.52.0 are required.');
}



$options = [CURLOPT_PROXY => (string) $this->url];


if ($this->url !== null) {
$options[CURLOPT_NOPROXY] = '';
}


if ($this->auth !== null) {
$options[CURLOPT_PROXYAUTH] = CURLAUTH_BASIC;
$options[CURLOPT_PROXYUSERPWD] = $this->auth;
}

if ($this->isSecure()) {
if (isset($sslOptions['cafile'])) {
$options[CURLOPT_PROXY_CAINFO] = $sslOptions['cafile'];
}
if (isset($sslOptions['capath'])) {
$options[CURLOPT_PROXY_CAPATH] = $sslOptions['capath'];
}
}

return $options;
}











public function getStatus(?string $format = null): string
{
if ($this->status === null) {
return '';
}

$format = $format ?? '%s';
if (strpos($format, '%s') !== false) {
return sprintf($format, $this->status);
}

throw new \InvalidArgumentException('String format specifier is missing');
}






public function isExcludedByNoProxy(): bool
{
return $this->status !== null && $this->url === null;
}







public function isSecure(): bool
{
return 0 === strpos((string) $this->url, 'https://');
}







public function supportsSecureProxy(): bool
{
if (false === ($version = curl_version()) || !defined('CURL_VERSION_HTTPS_PROXY')) {
return false;
}

$features = $version['features'];

return (bool) ($features & CURL_VERSION_HTTPS_PROXY);
}
}
