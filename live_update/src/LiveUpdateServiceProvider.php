<?php

declare(strict_types=1);

namespace Drupal\live_update;

use Drupal\Core\DependencyInjection\ContainerBuilder;
use Drupal\Core\DependencyInjection\ServiceProviderBase;
use Drupal\package_manager\ComposerInspector as BaseComposerInspector;
use Drupal\package_manager\Validator\LockFileValidator;
use Drupal\package_manager\Validator\RsyncValidator;

final class LiveUpdateServiceProvider extends ServiceProviderBase {

  /**
   * {@inheritdoc}
   */
  public function alter(ContainerBuilder $container): void {
    parent::alter($container);

    $container->getDefinition(BaseComposerInspector::class)
      ->setClass(ComposerInspector::class);

    $container->getDefinition(LockFileValidator::class)
      ->setAutoconfigured(FALSE)
      ->clearTag('event_subscriber');

    $container->getDefinition(RsyncValidator::class)
      ->setAutoconfigured(FALSE)
      ->clearTag('event_subscriber');
  }

}
