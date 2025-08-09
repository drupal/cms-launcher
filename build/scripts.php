<?php

use Symfony\Component\Filesystem\Filesystem;

class Scripts {

  /**
   * Extracts the Composer binary, and symlinks PHP, into ../bin.
   */
  public static function extract(): void {
    $bin = realpath(__DIR__ . '/../bin');

    (new Phar($_ENV['COMPOSER_BINARY']))->extractTo($bin . '/composer');

    (new Filesystem)
      ->symlink(PHP_BINARY, $bin . '/' . basename(PHP_BINARY));
  }

}
