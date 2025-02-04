<?php










namespace Composer\CaBundle;

use Psr\Log\LoggerInterface;
use Symfony\Component\Process\PhpProcess;





class CaBundle
{

private static $caPath;

private static $caFileValidity = array();






































public static function getSystemCaRootBundlePath(?LoggerInterface $logger = null)
{
if (self::$caPath !== null) {
return self::$caPath;
}
$caBundlePaths = array();



$caBundlePaths[] = self::getEnvVariable('SSL_CERT_FILE');



$caBundlePaths[] = self::getEnvVariable('SSL_CERT_DIR');

$caBundlePaths[] = ini_get('openssl.cafile');
$caBundlePaths[] = ini_get('openssl.capath');

$otherLocations = array(
'/etc/pki/tls/certs/ca-bundle.crt', 
'/etc/ssl/certs/ca-certificates.crt', 
'/etc/ssl/ca-bundle.pem', 
'/usr/ssl/certs/ca-bundle.crt', 
'/opt/local/share/curl/curl-ca-bundle.crt', 
'/usr/local/share/curl/curl-ca-bundle.crt', 
'/usr/share/ssl/certs/ca-bundle.crt', 
'/etc/ssl/cert.pem', 
'/usr/local/etc/openssl/cert.pem', 
'/usr/local/etc/openssl@1.1/cert.pem', 
'/opt/homebrew/etc/openssl@3/cert.pem', 
'/opt/homebrew/etc/openssl@1.1/cert.pem', 
'/etc/pki/tls/certs',
'/etc/ssl/certs', 
);

$caBundlePaths = array_merge($caBundlePaths, $otherLocations);

foreach ($caBundlePaths as $caBundle) {
if ($caBundle && self::caFileUsable($caBundle, $logger)) {
return self::$caPath = $caBundle;
}

if ($caBundle && self::caDirUsable($caBundle, $logger)) {
return self::$caPath = $caBundle;
}
}

return self::$caPath = static::getBundledCaBundlePath(); 
}








public static function getBundledCaBundlePath()
{
$caBundleFile = __DIR__.'/../res/cacert.pem';



if (0 === strpos($caBundleFile, 'phar://')) {
$tempCaBundleFile = tempnam(sys_get_temp_dir(), 'openssl-ca-bundle-');
if (false === $tempCaBundleFile) {
throw new \RuntimeException('Could not create a temporary file to store the bundled CA file');
}

file_put_contents(
$tempCaBundleFile,
file_get_contents($caBundleFile)
);

register_shutdown_function(function() use ($tempCaBundleFile) {
@unlink($tempCaBundleFile);
});

$caBundleFile = $tempCaBundleFile;
}

return $caBundleFile;
}









public static function validateCaFile($filename, ?LoggerInterface $logger = null)
{
static $warned = false;

if (isset(self::$caFileValidity[$filename])) {
return self::$caFileValidity[$filename];
}

$contents = file_get_contents($filename);

if (is_string($contents) && strlen($contents) > 0) {
$contents = preg_replace("/^(\\-+(?:BEGIN|END))\\s+TRUSTED\\s+(CERTIFICATE\\-+)\$/m", '$1 $2', $contents);
if (null === $contents) {

$isValid = false;
} else {
$isValid = (bool) openssl_x509_parse($contents);
}
} else {
$isValid = false;
}

if ($logger) {
$logger->debug('Checked CA file '.realpath($filename).': '.($isValid ? 'valid' : 'invalid'));
}

return self::$caFileValidity[$filename] = $isValid;
}









public static function isOpensslParseSafe()
{
return true;
}





public static function reset()
{
self::$caFileValidity = array();
self::$caPath = null;
}





private static function getEnvVariable($name)
{
if (isset($_SERVER[$name])) {
return (string) $_SERVER[$name];
}

if (PHP_SAPI === 'cli' && ($value = getenv($name)) !== false && $value !== null) {
return (string) $value;
}

return false;
}






private static function caFileUsable($certFile, ?LoggerInterface $logger = null)
{
return $certFile
&& self::isFile($certFile, $logger)
&& self::isReadable($certFile, $logger)
&& self::validateCaFile($certFile, $logger);
}






private static function caDirUsable($certDir, ?LoggerInterface $logger = null)
{
return $certDir
&& self::isDir($certDir, $logger)
&& self::isReadable($certDir, $logger)
&& self::glob($certDir . '/*', $logger);
}






private static function isFile($certFile, ?LoggerInterface $logger = null)
{
$isFile = @is_file($certFile);
if (!$isFile && $logger) {
$logger->debug(sprintf('Checked CA file %s does not exist or it is not a file.', $certFile));
}

return $isFile;
}






private static function isDir($certDir, ?LoggerInterface $logger = null)
{
$isDir = @is_dir($certDir);
if (!$isDir && $logger) {
$logger->debug(sprintf('Checked directory %s does not exist or it is not a directory.', $certDir));
}

return $isDir;
}






private static function isReadable($certFileOrDir, ?LoggerInterface $logger = null)
{
$isReadable = @is_readable($certFileOrDir);
if (!$isReadable && $logger) {
$logger->debug(sprintf('Checked file or directory %s is not readable.', $certFileOrDir));
}

return $isReadable;
}






private static function glob($pattern, ?LoggerInterface $logger = null)
{
$certs = glob($pattern);
if ($certs === false) {
if ($logger) {
$logger->debug(sprintf("An error occurred while trying to find certificates for pattern: %s", $pattern));
}
return false;
}

if (count($certs) === 0) {
if ($logger) {
$logger->debug(sprintf("No CA files found for pattern: %s", $pattern));
}
return false;
}

return true;
}
}
