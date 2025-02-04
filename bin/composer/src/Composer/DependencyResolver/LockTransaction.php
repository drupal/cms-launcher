<?php declare(strict_types=1);











namespace Composer\DependencyResolver;

use Composer\Package\AliasPackage;
use Composer\Package\BasePackage;
use Composer\Package\Package;
use Composer\Pcre\Preg;





class LockTransaction extends Transaction
{







protected $presentMap;








protected $unlockableMap;




protected $resultPackages;





public function __construct(Pool $pool, array $presentMap, array $unlockableMap, Decisions $decisions)
{
$this->presentMap = $presentMap;
$this->unlockableMap = $unlockableMap;

$this->setResultPackages($pool, $decisions);
parent::__construct($this->presentMap, $this->resultPackages['all']);
}



public function setResultPackages(Pool $pool, Decisions $decisions): void
{
$this->resultPackages = ['all' => [], 'non-dev' => [], 'dev' => []];
foreach ($decisions as $i => $decision) {
$literal = $decision[Decisions::DECISION_LITERAL];

if ($literal > 0) {
$package = $pool->literalToPackage($literal);

$this->resultPackages['all'][] = $package;
if (!isset($this->unlockableMap[$package->id])) {
$this->resultPackages['non-dev'][] = $package;
}
}
}
}

public function setNonDevPackages(LockTransaction $extractionResult): void
{
$packages = $extractionResult->getNewLockPackages(false);

$this->resultPackages['dev'] = $this->resultPackages['non-dev'];
$this->resultPackages['non-dev'] = [];

foreach ($packages as $package) {
foreach ($this->resultPackages['dev'] as $i => $resultPackage) {

if ($package->getName() === $resultPackage->getName()) {
$this->resultPackages['non-dev'][] = $resultPackage;
unset($this->resultPackages['dev'][$i]);
}
}
}
}





public function getNewLockPackages(bool $devMode, bool $updateMirrors = false): array
{
$packages = [];
foreach ($this->resultPackages[$devMode ? 'dev' : 'non-dev'] as $package) {
if ($package instanceof AliasPackage) {
continue;
}


if ($updateMirrors === true && !array_key_exists(spl_object_hash($package), $this->presentMap)) {
$package = $this->updateMirrorAndUrls($package);
}

$packages[] = $package;
}

return $packages;
}






private function updateMirrorAndUrls(BasePackage $package): BasePackage
{
foreach ($this->presentMap as $presentPackage) {
if ($package->getName() !== $presentPackage->getName()) {
continue;
}

if ($package->getVersion() !== $presentPackage->getVersion()) {
continue;
}

if ($presentPackage->getSourceReference() === null) {
continue;
}

if ($presentPackage->getSourceType() !== $package->getSourceType()) {
continue;
}

if ($presentPackage instanceof Package) {
$presentPackage->setSourceUrl($package->getSourceUrl());
$presentPackage->setSourceMirrors($package->getSourceMirrors());
}


if ($presentPackage->getDistType() !== $package->getDistType()) {
return $presentPackage;
}


if (
$package->getDistUrl() !== null
&& $presentPackage->getDistReference() !== null
&& Preg::isMatch('{^https?://(?:(?:www\.)?bitbucket\.org|(api\.)?github\.com|(?:www\.)?gitlab\.com)/}i', $package->getDistUrl())
) {
$presentPackage->setDistUrl(Preg::replace('{(?<=/|sha=)[a-f0-9]{40}(?=/|$)}i', $presentPackage->getDistReference(), $package->getDistUrl()));
}
$presentPackage->setDistMirrors($package->getDistMirrors());

return $presentPackage;
}

return $package;
}






public function getAliases(array $aliases): array
{
$usedAliases = [];

foreach ($this->resultPackages['all'] as $package) {
if ($package instanceof AliasPackage) {
foreach ($aliases as $index => $alias) {
if ($alias['package'] === $package->getName()) {
$usedAliases[] = $alias;
unset($aliases[$index]);
}
}
}
}

usort($usedAliases, static function ($a, $b): int {
return strcmp($a['package'], $b['package']);
});

return $usedAliases;
}
}
