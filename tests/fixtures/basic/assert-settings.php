<?php

declare(strict_types=1);

// Confirms that launcher-specific settings are loaded correctly. This should
// be run with `php -f confirm-settings.php`.

namespace Composer {

  class InstalledVersions {

    public static function getInstallPath(string $name): string {
      return "/path/to/$name";
    }

  }

}

namespace {

  assert(PHP_SAPI === 'cli');
  require __DIR__ . '/web/sites/default/default.settings.php';

  assert(isset($settings, $config));
  assert($settings['skip_permissions_hardening'] === true);
  assert($settings['package_manager_allow_direct_write'] === true);
  assert($settings['testing_package_manager'] === true);
  assert($config['package_manager.settings']['executables']['composer'] === '/path/to/composer/composer/bin/composer');
  assert(in_array('^localhost$', $settings['trusted_host_patterns'], true));
  assert(getenv('IS_DDEV_PROJECT') === '1');

}
