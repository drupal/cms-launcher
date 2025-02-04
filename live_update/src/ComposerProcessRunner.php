<?php

declare(strict_types=1);

namespace Drupal\live_update;

use Drupal\package_manager\PathLocator;
use PhpTuf\ComposerStager\API\Path\Value\PathInterface;
use PhpTuf\ComposerStager\API\Process\Service\ComposerProcessRunnerInterface;
use PhpTuf\ComposerStager\API\Process\Service\OutputCallbackInterface;
use PhpTuf\ComposerStager\API\Process\Service\ProcessInterface;

final class ComposerProcessRunner implements ComposerProcessRunnerInterface {

  public function __construct(
    private readonly PathLocator $pathLocator,
    private readonly ComposerProcessRunnerInterface $decorated,
  ) {}

  /**
   * {@inheritdoc}
   */
  public function run(array $command, ?PathInterface $cwd = NULL, array $env = [], ?OutputCallbackInterface $callback = NULL, int $timeout = ProcessInterface::DEFAULT_TIMEOUT): void {
    $command = array_map('trim', array_values($command));

    $i = array_search('-d', $command, TRUE);
    if ($i === FALSE) {
      $i = array_search('--working-dir', $command, TRUE);
    }
    if (is_int($i)) {
      array_splice($command, $i, 2);
    }
    $command = array_filter($command, function (string $argument): bool {
      return !str_starts_with($argument, '--working-dir=');
    });
    array_push($command, '--working-dir=' . $this->pathLocator->getProjectRoot());

    $this->decorated->run($command, NULL, $env, $callback, $timeout);
  }

}
