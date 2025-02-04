<?php declare(strict_types=1);











namespace Composer\Advisory;

use Composer\Semver\Constraint\ConstraintInterface;
use DateTimeImmutable;

class IgnoredSecurityAdvisory extends SecurityAdvisory
{




public $ignoreReason;




public function __construct(string $packageName, string $advisoryId, ConstraintInterface $affectedVersions, string $title, array $sources, DateTimeImmutable $reportedAt, ?string $cve = null, ?string $link = null, ?string $ignoreReason = null, ?string $severity = null)
{
parent::__construct($packageName, $advisoryId, $affectedVersions, $title, $sources, $reportedAt, $cve, $link, $severity);

$this->ignoreReason = $ignoreReason;
}




#[\ReturnTypeWillChange]
public function jsonSerialize()
{
$data = parent::jsonSerialize();
if ($this->ignoreReason === NULL) {
unset($data['ignoreReason']);
}

return $data;
}

}
