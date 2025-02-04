<?php










namespace Symfony\Component\Process;







class ExecutableFinder
{
private const CMD_BUILTINS = [
'assoc', 'break', 'call', 'cd', 'chdir', 'cls', 'color', 'copy', 'date',
'del', 'dir', 'echo', 'endlocal', 'erase', 'exit', 'for', 'ftype', 'goto',
'help', 'if', 'label', 'md', 'mkdir', 'mklink', 'move', 'path', 'pause',
'popd', 'prompt', 'pushd', 'rd', 'rem', 'ren', 'rename', 'rmdir', 'set',
'setlocal', 'shift', 'start', 'time', 'title', 'type', 'ver', 'vol',
];

private $suffixes = [];




public function setSuffixes(array $suffixes)
{
$this->suffixes = $suffixes;
}




public function addSuffix(string $suffix)
{
$this->suffixes[] = $suffix;
}










public function find(string $name, ?string $default = null, array $extraDirs = [])
{

if ('\\' === \DIRECTORY_SEPARATOR && \in_array(strtolower($name), self::CMD_BUILTINS, true)) {
return $name;
}

$dirs = array_merge(
explode(\PATH_SEPARATOR, getenv('PATH') ?: getenv('Path')),
$extraDirs
);

$suffixes = [];
if ('\\' === \DIRECTORY_SEPARATOR) {
$pathExt = getenv('PATHEXT');
$suffixes = $this->suffixes;
$suffixes = array_merge($suffixes, $pathExt ? explode(\PATH_SEPARATOR, $pathExt) : ['.exe', '.bat', '.cmd', '.com']);
}
$suffixes = '' !== pathinfo($name, PATHINFO_EXTENSION) ? array_merge([''], $suffixes) : array_merge($suffixes, ['']);
foreach ($suffixes as $suffix) {
foreach ($dirs as $dir) {
if ('' === $dir) {
$dir = '.';
}
if (@is_file($file = $dir.\DIRECTORY_SEPARATOR.$name.$suffix) && ('\\' === \DIRECTORY_SEPARATOR || @is_executable($file))) {
return $file;
}

if (!@is_dir($dir) && basename($dir) === $name.$suffix && @is_executable($dir)) {
return $dir;
}
}
}

if ('\\' === \DIRECTORY_SEPARATOR || !\function_exists('exec') || \strlen($name) !== strcspn($name, '/'.\DIRECTORY_SEPARATOR)) {
return $default;
}

$execResult = exec('command -v -- '.escapeshellarg($name));

if (($executablePath = substr($execResult, 0, strpos($execResult, \PHP_EOL) ?: null)) && @is_executable($executablePath)) {
return $executablePath;
}

return $default;
}
}
