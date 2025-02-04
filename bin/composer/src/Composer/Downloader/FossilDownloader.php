<?php declare(strict_types=1);











namespace Composer\Downloader;

use Composer\Util\Platform;
use React\Promise\PromiseInterface;
use Composer\Package\PackageInterface;
use Composer\Pcre\Preg;
use Composer\Util\ProcessExecutor;
use RuntimeException;




class FossilDownloader extends VcsDownloader
{



protected function doDownload(PackageInterface $package, string $path, string $url, ?PackageInterface $prevPackage = null): PromiseInterface
{
return \React\Promise\resolve(null);
}




protected function doInstall(PackageInterface $package, string $path, string $url): PromiseInterface
{

$this->config->prohibitUrlByConfig($url, $this->io);

$repoFile = $path . '.fossil';
$realPath = Platform::realpath($path);

$this->io->writeError("Cloning ".$package->getSourceReference());
$this->execute(['fossil', 'clone', '--', $url, $repoFile]);
$this->execute(['fossil', 'open', '--nested', '--', $repoFile], $realPath);
$this->execute(['fossil', 'update', '--', (string) $package->getSourceReference()], $realPath);

return \React\Promise\resolve(null);
}




protected function doUpdate(PackageInterface $initial, PackageInterface $target, string $path, string $url): PromiseInterface
{

$this->config->prohibitUrlByConfig($url, $this->io);

$this->io->writeError(" Updating to ".$target->getSourceReference());

if (!$this->hasMetadataRepository($path)) {
throw new \RuntimeException('The .fslckout file is missing from '.$path.', see https://getcomposer.org/commit-deps for more information');
}

$realPath = Platform::realpath($path);
$this->execute(['fossil', 'pull'], $realPath);
$this->execute(['fossil', 'up', (string) $target->getSourceReference()], $realPath);

return \React\Promise\resolve(null);
}




public function getLocalChanges(PackageInterface $package, string $path): ?string
{
if (!$this->hasMetadataRepository($path)) {
return null;
}

$this->process->execute(['fossil', 'changes'], $output, Platform::realpath($path));

$output = trim($output);

return strlen($output) > 0 ? $output : null;
}




protected function getCommitLogs(string $fromReference, string $toReference, string $path): string
{
$this->execute(['fossil', 'timeline', '-t', 'ci', '-W', '0', '-n', '0', 'before', $toReference], Platform::realpath($path), $output);

$log = '';
$match = '/\d\d:\d\d:\d\d\s+\[' . $toReference . '\]/';

foreach ($this->process->splitLines($output) as $line) {
if (Preg::isMatch($match, $line)) {
break;
}
$log .= $line;
}

return $log;
}





private function execute(array $command, ?string $cwd = null, ?string &$output = null): void
{
if (0 !== $this->process->execute($command, $output, $cwd)) {
throw new \RuntimeException('Failed to execute ' . implode(' ', $command) . "\n\n" . $this->process->getErrorOutput());
}
}




protected function hasMetadataRepository(string $path): bool
{
return is_file($path . '/.fslckout') || is_file($path . '/_FOSSIL_');
}
}
