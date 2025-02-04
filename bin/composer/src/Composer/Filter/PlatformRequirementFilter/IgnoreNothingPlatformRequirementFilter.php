<?php declare(strict_types=1);











namespace Composer\Filter\PlatformRequirementFilter;

final class IgnoreNothingPlatformRequirementFilter implements PlatformRequirementFilterInterface
{



public function isIgnored(string $req): bool
{
return false;
}




public function isUpperBoundIgnored(string $req): bool
{
return false;
}
}
