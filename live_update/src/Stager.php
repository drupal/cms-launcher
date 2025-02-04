<?php

declare(strict_types=1);

namespace Drupal\live_update;

use PhpTuf\ComposerStager\API\Core\StagerInterface;
use PhpTuf\ComposerStager\API\Path\Value\PathInterface;
use PhpTuf\ComposerStager\API\Process\Service\OutputCallbackInterface;
use PhpTuf\ComposerStager\API\Process\Service\ProcessInterface;

final class Stager implements StagerInterface {

  public function __construct(
    private readonly StagerInterface $decorated,
  ) {}

  /**
   * {@inheritdoc}
   */
  public function stage(array $composerCommand, PathInterface $activeDir, PathInterface $stagingDir, ?OutputCallbackInterface $callback = NULL, int $timeout = ProcessInterface::DEFAULT_TIMEOUT): void {
    $stagingDir = $activeDir;
    $this->decorated->stage($composerCommand, $activeDir, $stagingDir, $callback, $timeout);
  }

}
