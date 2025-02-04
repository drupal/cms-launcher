<?php

declare(strict_types=1);

namespace Drupal\live_update;

use PhpTuf\ComposerStager\API\Core\BeginnerInterface;
use PhpTuf\ComposerStager\API\Path\Value\PathInterface;
use PhpTuf\ComposerStager\API\Path\Value\PathListInterface;
use PhpTuf\ComposerStager\API\Process\Service\OutputCallbackInterface;
use PhpTuf\ComposerStager\API\Process\Service\ProcessInterface;

final class Beginner implements BeginnerInterface {

  /**
   * {@inheritdoc}
   */
  public function begin(PathInterface $activeDir, PathInterface $stagingDir, ?PathListInterface $exclusions = NULL, ?OutputCallbackInterface $callback = NULL, int $timeout = ProcessInterface::DEFAULT_TIMEOUT): void {
  }

}
