<?php

declare(strict_types=1);

// Confirms that launcher-specific settings are loaded correctly. A failed check
// exits with an error, whatever the zend.assertions setting is.

function check(bool $condition): void {
  if (!$condition) {
    throw new AssertionError('A settings check failed.');
  }
}

check(PHP_SAPI === 'cli');
$app_root = __DIR__ . '/web';
$site_path = 'sites/default';
require $app_root . '/' . $site_path . '/settings.php';

check(isset($settings, $databases));
check($settings['skip_permissions_hardening'] === true);
check($settings['package_manager_allow_direct_write'] === true);
check($settings['testing_package_manager'] === true);
check(in_array('^localhost$', $settings['trusted_host_patterns'], true));
check($settings['config_sync_directory'] === '../config');
check($databases['default']['default']['driver'] === 'sqlite');
check(getenv('IS_DDEV_PROJECT') === '1');
check(strlen($settings['hash_salt']) > 0);
