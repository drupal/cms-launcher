<?php declare(strict_types=1);











namespace Composer\Util\Http;

use Composer\Downloader\TransportException;
use Composer\Util\NoProxyPattern;





class ProxyManager
{

private $error = null;

private $httpProxy = null;

private $httpsProxy = null;

private $noProxyHandler = null;


private static $instance = null;

private function __construct()
{
try {
$this->getProxyData();
} catch (\RuntimeException $e) {
$this->error = $e->getMessage();
}
}

public static function getInstance(): ProxyManager
{
if (self::$instance === null) {
self::$instance = new self();
}

return self::$instance;
}




public static function reset(): void
{
self::$instance = null;
}

public function hasProxy(): bool
{
return $this->httpProxy !== null || $this->httpsProxy !== null;
}






public function getProxyForRequest(string $requestUrl): RequestProxy
{
if ($this->error !== null) {
throw new TransportException('Unable to use a proxy: '.$this->error);
}

$scheme = (string) parse_url($requestUrl, PHP_URL_SCHEME);
$proxy = $this->getProxyForScheme($scheme);

if ($proxy === null) {
return RequestProxy::none();
}

if ($this->noProxy($requestUrl)) {
return RequestProxy::noProxy();
}

return $proxy->toRequestProxy($scheme);
}




private function getProxyForScheme(string $scheme): ?ProxyItem
{
if ($scheme === 'http') {
return $this->httpProxy;
}

if ($scheme === 'https') {
return $this->httpsProxy;
}

return null;
}




private function getProxyData(): void
{

if (PHP_SAPI === 'cli' || PHP_SAPI === 'phpdbg') {
[$env, $name] = $this->getProxyEnv('http_proxy');
if ($env !== null) {
$this->httpProxy = new ProxyItem($env, $name);
}
}


if ($this->httpProxy === null) {
[$env, $name] = $this->getProxyEnv('cgi_http_proxy');
if ($env !== null) {
$this->httpProxy = new ProxyItem($env, $name);
}
}


[$env, $name] = $this->getProxyEnv('https_proxy');
if ($env !== null) {
$this->httpsProxy = new ProxyItem($env, $name);
}


[$env, $name] = $this->getProxyEnv('no_proxy');
if ($env !== null) {
$this->noProxyHandler = new NoProxyPattern($env);
}
}






private function getProxyEnv(string $envName): array
{
$names = [strtolower($envName), strtoupper($envName)];

foreach ($names as $name) {
if (is_string($_SERVER[$name] ?? null)) {
if ($_SERVER[$name] !== '') {
return [$_SERVER[$name], $name];
}
}
}

return [null, ''];
}




private function noProxy(string $requestUrl): bool
{
if ($this->noProxyHandler === null) {
return false;
}

return $this->noProxyHandler->test($requestUrl);
}
}
