<?php

declare(strict_types=1);

namespace Drupal\live_update;

use PhpTuf\ComposerStager\API\Core\CommitterInterface;
use PhpTuf\ComposerStager\API\Path\Value\PathInterface;
use PhpTuf\ComposerStager\API\Path\Value\PathListInterface;
use PhpTuf\ComposerStager\API\Process\Service\OutputCallbackInterface;
use PhpTuf\ComposerStager\API\Process\Service\ProcessInterface;

final class Committer implements CommitterInterface {

  /**
   * {@inheritdoc}
   */
  public function commit(PathInterface $stagingDir, PathInterface $activeDir, ?PathListInterface $exclusions = NULL, ?OutputCallbackInterface $callback = NULL, int $timeout = ProcessInterface::DEFAULT_TIMEOUT): void {
  }

}
