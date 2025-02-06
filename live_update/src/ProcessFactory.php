<?php

declare(strict_types=1);

namespace Drupal\live_update;

use PhpTuf\ComposerStager\API\Path\Value\PathInterface;
use PhpTuf\ComposerStager\API\Process\Factory\ProcessFactoryInterface;
use PhpTuf\ComposerStager\API\Process\Service\ProcessInterface;

final class ProcessFactory implements ProcessFactoryInterface {

  public function __construct(
    private readonly ProcessFactoryInterface $decorated,
  ) {}

  /**
   * {@inheritdoc}
   */
  public function create(array $command, ?PathInterface $cwd = NULL, array $env = []): ProcessInterface {
    $command = array_map('trim', array_values($command));

    if ((PHP_SAPI === 'cli' || PHP_SAPI === 'cli-server') && $command && str_ends_with($command[0], DIRECTORY_SEPARATOR . 'composer')) {
      array_unshift($command, PHP_BINARY);
      $env['COMPOSER_HOME'] = dirname(PHP_BINARY, 2) . DIRECTORY_SEPARATOR . '.composer';
    }
    return $this->decorated->create($command, $cwd, $env);
  }

}
