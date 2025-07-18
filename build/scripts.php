<?php

class Scripts {

  /**
   * Extracts the currently running Composer binary to ../bin.
   */
  public static function extract(): void {
    $phar = new Phar($_ENV['COMPOSER_BINARY']);
    $phar->extractTo(__DIR__ . '/../bin/composer');
  }

}
