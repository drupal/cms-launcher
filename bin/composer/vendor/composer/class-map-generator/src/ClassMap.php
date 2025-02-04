<?php declare(strict_types=1);











namespace Composer\ClassMapGenerator;

use Composer\Pcre\Preg;




class ClassMap implements \Countable
{



public $map = [];




private $ambiguousClasses = [];




private $psrViolations = [];






public function getMap(): array
{
return $this->map;
}












public function getPsrViolations(): array
{
if (\count($this->psrViolations) === 0) {
return [];
}

return array_map(static function (array $violation): string {
return $violation['warning'];
}, array_merge(...array_values($this->psrViolations)));
}

















public function getAmbiguousClasses($duplicatesFilter = '{/(test|fixture|example|stub)s?/}i'): array
{
if (false === $duplicatesFilter) {
return $this->ambiguousClasses;
}

if (true === $duplicatesFilter) {
throw new \InvalidArgumentException('$duplicatesFilter should be false or a string with a valid regex, got true.');
}

$ambiguousClasses = [];
foreach ($this->ambiguousClasses as $class => $paths) {
$paths = array_filter($paths, function ($path) use ($duplicatesFilter) {
return !Preg::isMatch($duplicatesFilter, strtr($path, '\\', '/'));
});
if (\count($paths) > 0) {
$ambiguousClasses[$class] = array_values($paths);
}
}

return $ambiguousClasses;
}




public function sort(): void
{
ksort($this->map);
}





public function addClass(string $className, string $path): void
{
unset($this->psrViolations[strtr($path, '\\', '/')]);

$this->map[$className] = $path;
}





public function getClassPath(string $className): string
{
if (!isset($this->map[$className])) {
throw new \OutOfBoundsException('Class '.$className.' is not present in the map');
}

return $this->map[$className];
}




public function hasClass(string $className): bool
{
return isset($this->map[$className]);
}

public function addPsrViolation(string $warning, string $className, string $path): void
{
$path = rtrim(strtr($path, '\\', '/'), '/');

$this->psrViolations[$path][] = ['warning' => $warning, 'className' => $className];
}

public function clearPsrViolationsByPath(string $pathPrefix): void
{
$pathPrefix = rtrim(strtr($pathPrefix, '\\', '/'), '/');

foreach ($this->psrViolations as $path => $violations) {
if ($path === $pathPrefix || 0 === \strpos($path, $pathPrefix.'/')) {
unset($this->psrViolations[$path]);
}
}
}





public function addAmbiguousClass(string $className, string $path): void
{
$this->ambiguousClasses[$className][] = $path;
}

public function count(): int
{
return \count($this->map);
}








public function getRawPsrViolations(): array
{
return $this->psrViolations;
}
}
