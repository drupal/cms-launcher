<?php

class Scripts {

  /**
   * Extracts the Composer binary into ../bin.
   */
  public static function extract(): void {
    $bin = realpath(__DIR__ . '/../bin');

    (new Phar($_ENV['COMPOSER_BINARY']))->extractTo($bin . '/composer');
  }

}
