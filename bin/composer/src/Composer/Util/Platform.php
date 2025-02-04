<?php declare(strict_types=1);











namespace Composer\Util;

use Composer\Pcre\Preg;






class Platform
{

private static $isVirtualBoxGuest = null;

private static $isWindowsSubsystemForLinux = null;

private static $isDocker = null;






public static function getCwd(bool $allowEmpty = false): string
{
$cwd = getcwd();


if (false === $cwd) {
$cwd = realpath('');
}


if (false === $cwd) {
if ($allowEmpty) {
return '';
}

throw new \RuntimeException('Could not determine the current working directory');
}

return $cwd;
}




public static function realpath(string $path): string
{
$realPath = realpath($path);
if ($realPath === false) {
return $path;
}

return $realPath;
}








public static function getEnv(string $name)
{
if (array_key_exists($name, $_SERVER)) {
return (string) $_SERVER[$name];
}
if (array_key_exists($name, $_ENV)) {
return (string) $_ENV[$name];
}

return getenv($name);
}




public static function putEnv(string $name, string $value): void
{
putenv($name . '=' . $value);
$_SERVER[$name] = $_ENV[$name] = $value;
}




public static function clearEnv(string $name): void
{
putenv($name);
unset($_SERVER[$name], $_ENV[$name]);
}




public static function expandPath(string $path): string
{
if (Preg::isMatch('#^~[\\/]#', $path)) {
return self::getUserDirectory() . substr($path, 1);
}

return Preg::replaceCallback('#^(\$|(?P<percent>%))(?P<var>\w++)(?(percent)%)(?P<path>.*)#', static function ($matches): string {

if (Platform::isWindows() && $matches['var'] === 'HOME') {
if ((bool) Platform::getEnv('HOME')) {
return Platform::getEnv('HOME') . $matches['path'];
}
return Platform::getEnv('USERPROFILE') . $matches['path'];
}

return Platform::getEnv($matches['var']) . $matches['path'];
}, $path);
}





public static function getUserDirectory(): string
{
if (false !== ($home = self::getEnv('HOME'))) {
return $home;
}

if (self::isWindows() && false !== ($home = self::getEnv('USERPROFILE'))) {
return $home;
}

if (\function_exists('posix_getuid') && \function_exists('posix_getpwuid')) {
$info = posix_getpwuid(posix_getuid());

if (is_array($info)) {
return $info['dir'];
}
}

throw new \RuntimeException('Could not determine user directory');
}




public static function isWindowsSubsystemForLinux(): bool
{
if (null === self::$isWindowsSubsystemForLinux) {
self::$isWindowsSubsystemForLinux = false;


if (self::isWindows()) {
return self::$isWindowsSubsystemForLinux = false;
}

if (
!(bool) ini_get('open_basedir')
&& is_readable('/proc/version')
&& false !== stripos((string)Silencer::call('file_get_contents', '/proc/version'), 'microsoft')
&& !self::isDocker() 
) {
return self::$isWindowsSubsystemForLinux = true;
}
}

return self::$isWindowsSubsystemForLinux;
}




public static function isWindows(): bool
{
return \defined('PHP_WINDOWS_VERSION_BUILD');
}

public static function isDocker(): bool
{
if (null !== self::$isDocker) {
return self::$isDocker;
}


if ((bool) ini_get('open_basedir')) {
return self::$isDocker = false;
}


if (file_exists('/.dockerenv') || file_exists('/run/.containerenv') || file_exists('/var/run/.containerenv')) {
return self::$isDocker = true;
}


$cgroups = [
'/proc/self/mountinfo', 
'/proc/1/cgroup', 
];
foreach ($cgroups as $cgroup) {
if (!is_readable($cgroup)) {
continue;
}


try {
$data = @file_get_contents($cgroup);
} catch (\Throwable $e) {
break;
}
if (is_string($data) && str_contains($data, '/var/lib/docker/')) {
return self::$isDocker = true;
}
}

return self::$isDocker = false;
}




public static function strlen(string $str): int
{
static $useMbString = null;
if (null === $useMbString) {
$useMbString = \function_exists('mb_strlen') && (bool) ini_get('mbstring.func_overload');
}

if ($useMbString) {
return mb_strlen($str, '8bit');
}

return \strlen($str);
}




public static function isTty($fd = null): bool
{
if ($fd === null) {
$fd = defined('STDOUT') ? STDOUT : fopen('php://stdout', 'w');
if ($fd === false) {
return false;
}
}



if (in_array(strtoupper((string) self::getEnv('MSYSTEM')), ['MINGW32', 'MINGW64'], true)) {
return true;
}



if (function_exists('stream_isatty')) {
return stream_isatty($fd);
}


if (function_exists('posix_isatty') && posix_isatty($fd)) {
return true;
}

$stat = @fstat($fd);
if ($stat === false) {
return false;
}

return 0020000 === ($stat['mode'] & 0170000);
}




public static function isInputCompletionProcess(): bool
{
return '_complete' === ($_SERVER['argv'][1] ?? null);
}

public static function workaroundFilesystemIssues(): void
{
if (self::isVirtualBoxGuest()) {
usleep(200000);
}
}






private static function isVirtualBoxGuest(): bool
{
if (null === self::$isVirtualBoxGuest) {
self::$isVirtualBoxGuest = false;
if (self::isWindows()) {
return self::$isVirtualBoxGuest;
}

if (function_exists('posix_getpwuid') && function_exists('posix_geteuid')) {
$processUser = posix_getpwuid(posix_geteuid());
if (is_array($processUser) && $processUser['name'] === 'vagrant') {
return self::$isVirtualBoxGuest = true;
}
}

if (self::getEnv('COMPOSER_RUNTIME_ENV') === 'virtualbox') {
return self::$isVirtualBoxGuest = true;
}

if (defined('PHP_OS_FAMILY') && PHP_OS_FAMILY === 'Linux') {
$process = new ProcessExecutor();
try {
if (0 === $process->execute(['lsmod'], $output) && str_contains($output, 'vboxguest')) {
return self::$isVirtualBoxGuest = true;
}
} catch (\Exception $e) {

}
}
}

return self::$isVirtualBoxGuest;
}




public static function getDevNull(): string
{
if (self::isWindows()) {
return 'NUL';
}

return '/dev/null';
}
}
