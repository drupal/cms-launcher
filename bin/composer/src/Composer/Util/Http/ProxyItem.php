<?php declare(strict_types=1);











namespace Composer\Util\Http;





class ProxyItem
{

private $url;

private $safeUrl;

private $curlAuth;

private $optionsProxy;

private $optionsAuth;






public function __construct(string $proxyUrl, string $envName)
{
$syntaxError = sprintf('unsupported `%s` syntax', $envName);

if (strpbrk($proxyUrl, "\r\n\t") !== false) {
throw new \RuntimeException($syntaxError);
}
if (false === ($proxy = parse_url($proxyUrl))) {
throw new \RuntimeException($syntaxError);
}
if (!isset($proxy['host'])) {
throw new \RuntimeException('unable to find proxy host in ' . $envName);
}

$scheme = isset($proxy['scheme']) ? strtolower($proxy['scheme']) . '://' : 'http://';
$safe = '';

if (isset($proxy['user'])) {
$safe = '***';
$user = $proxy['user'];
$auth = rawurldecode($proxy['user']);

if (isset($proxy['pass'])) {
$safe .= ':***';
$user .= ':' . $proxy['pass'];
$auth .= ':' . rawurldecode($proxy['pass']);
}

$safe .= '@';

if (strlen($user) > 0) {
$this->curlAuth = $user;
$this->optionsAuth = 'Proxy-Authorization: Basic ' . base64_encode($auth);
}
}

$host = $proxy['host'];
$port = null;

if (isset($proxy['port'])) {
$port = $proxy['port'];
} elseif ($scheme === 'http://') {
$port = 80;
} elseif ($scheme === 'https://') {
$port = 443;
}



if ($port === null) {
throw new \RuntimeException('unable to find proxy port in ' . $envName);
}
if ($port === 0) {
throw new \RuntimeException('port 0 is reserved in ' . $envName);
}

$this->url = sprintf('%s%s:%d', $scheme, $host, $port);
$this->safeUrl = sprintf('%s%s%s:%d', $scheme, $safe, $host, $port);

$scheme = str_replace(['http://', 'https://'], ['tcp://', 'ssl://'], $scheme);
$this->optionsProxy = sprintf('%s%s:%d', $scheme, $host, $port);
}






public function toRequestProxy(string $scheme): RequestProxy
{
$options = ['http' => ['proxy' => $this->optionsProxy]];

if ($this->optionsAuth !== null) {
$options['http']['header'] = $this->optionsAuth;
}

if ($scheme === 'http') {
$options['http']['request_fulluri'] = true;
}

return new RequestProxy($this->url, $this->curlAuth, $options, $this->safeUrl);
}
}
