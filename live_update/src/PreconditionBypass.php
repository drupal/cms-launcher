<?php

declare(strict_types=1);

namespace Drupal\live_update;

use PhpTuf\ComposerStager\API\Path\Value\PathInterface;
use PhpTuf\ComposerStager\API\Path\Value\PathListInterface;
use PhpTuf\ComposerStager\API\Precondition\Service\ActiveAndStagingDirsAreDifferentInterface;
use PhpTuf\ComposerStager\API\Precondition\Service\PreconditionInterface;
use PhpTuf\ComposerStager\API\Process\Service\ProcessInterface;
use PhpTuf\ComposerStager\API\Translation\Service\TranslatorInterface;
use PhpTuf\ComposerStager\API\Translation\Value\TranslatableInterface;

final class PreconditionBypass implements ActiveAndStagingDirsAreDifferentInterface {

  public function __construct(
    private readonly PreconditionInterface $decorated,
  ) {}

  /**
   * {@inheritdoc}
   */
  public function getName(): TranslatableInterface {
    return $this->decorated->getName();
  }

  /**
   * {@inheritdoc}
   */
  public function getDescription(): TranslatableInterface {
    return $this->decorated->getDescription();
  }

  /**
   * {@inheritdoc}
   */
  public function getStatusMessage(PathInterface $activeDir, PathInterface $stagingDir, ?PathListInterface $exclusions = NULL, int $timeout = ProcessInterface::DEFAULT_TIMEOUT): TranslatableInterface {
    return new class () implements TranslatableInterface {

      /**
       * {@inheritdoc}
       */
      public function trans(?TranslatorInterface $translator = NULL, ?string $locale = NULL): string {
        return (string) $this;
      }

      /**
       * {@inheritdoc}
       */
      public function __toString(): string {
        return 'This condition is fulfilled.';
      }

    };
  }

  /**
   * {@inheritdoc}
   */
  public function isFulfilled(PathInterface $activeDir, PathInterface $stagingDir, ?PathListInterface $exclusions = NULL, int $timeout = ProcessInterface::DEFAULT_TIMEOUT): bool {
    return TRUE;
  }

  /**
   * {@inheritdoc}
   */
  public function assertIsFulfilled(PathInterface $activeDir, PathInterface $stagingDir, ?PathListInterface $exclusions = NULL, int $timeout = ProcessInterface::DEFAULT_TIMEOUT): void {
  }

  /**
   * {@inheritdoc}
   */
  public function getLeaves(): array {
    return [$this];
  }

}
