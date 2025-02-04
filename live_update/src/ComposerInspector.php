<?php

declare(strict_types=1);

namespace Drupal\live_update;

use Drupal\package_manager\ComposerInspector as BaseComposerInspector;
use Drupal\package_manager\InstalledPackagesList;
use Drupal\package_manager\PathLocator;
use PhpTuf\ComposerStager\API\Path\Factory\PathFactoryInterface;
use PhpTuf\ComposerStager\API\Precondition\Service\ComposerIsAvailableInterface;
use PhpTuf\ComposerStager\API\Process\Service\ComposerProcessRunnerInterface;

final class ComposerInspector extends BaseComposerInspector {

  public function __construct(
    private readonly PathLocator $pathLocator,
    ComposerProcessRunnerInterface $runner,
    ComposerIsAvailableInterface $composerIsAvailable,
    PathFactoryInterface $pathFactory,
  ) {
    parent::__construct($runner, $composerIsAvailable, $pathFactory);
  }

  /**
   * {@inheritdoc}
   */
  public function validate(string $working_dir): void {
    $working_dir = $this->pathLocator->getProjectRoot();
    parent::validate($working_dir);
  }

  /**
   * {@inheritdoc}
   */
  public function getConfig(string $key, string $context): ?string {
    if (!is_file($context)) {
      $context = $this->pathLocator->getProjectRoot();
    }
    return parent::getConfig($key, $context);
  }

  /**
   * {@inheritdoc}
   */
  public function getInstalledPackagesList(string $working_dir): InstalledPackagesList {
    $working_dir = $this->pathLocator->getProjectRoot();
    return parent::getInstalledPackagesList($working_dir);
  }

}
