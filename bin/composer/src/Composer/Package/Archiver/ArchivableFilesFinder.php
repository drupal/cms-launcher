<?php declare(strict_types=1);











namespace Composer\Package\Archiver;

use Composer\Pcre\Preg;
use Composer\Util\Filesystem;
use FilesystemIterator;
use FilterIterator;
use Iterator;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Finder\SplFileInfo;










class ArchivableFilesFinder extends FilterIterator
{



protected $finder;








public function __construct(string $sources, array $excludes, bool $ignoreFilters = false)
{
$fs = new Filesystem();

$sourcesRealPath = realpath($sources);
if ($sourcesRealPath === false) {
throw new \RuntimeException('Could not realpath() the source directory "'.$sources.'"');
}
$sources = $fs->normalizePath($sourcesRealPath);

if ($ignoreFilters) {
$filters = [];
} else {
$filters = [
new GitExcludeFilter($sources),
new ComposerExcludeFilter($sources, $excludes),
];
}

$this->finder = new Finder();

$filter = static function (\SplFileInfo $file) use ($sources, $filters, $fs): bool {
$realpath = $file->getRealPath();
if ($realpath === false) {
return false;
}
if ($file->isLink() && strpos($realpath, $sources) !== 0) {
return false;
}

$relativePath = Preg::replace(
'#^'.preg_quote($sources, '#').'#',
'',
$fs->normalizePath($realpath)
);

$exclude = false;
foreach ($filters as $filter) {
$exclude = $filter->filter($relativePath, $exclude);
}

return !$exclude;
};

$this->finder
->in($sources)
->filter($filter)
->ignoreVCS(true)
->ignoreDotFiles(false)
->sortByName();

parent::__construct($this->finder->getIterator());
}

public function accept(): bool
{

$current = $this->getInnerIterator()->current();

if (!$current->isDir()) {
return true;
}

$iterator = new FilesystemIterator((string) $current, FilesystemIterator::SKIP_DOTS);

return !$iterator->valid();
}
}
