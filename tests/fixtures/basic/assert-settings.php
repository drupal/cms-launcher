<?php

declare(strict_types=1);

// Confirms that launcher-specific settings are loaded correctly. This should
// be run with `php -f assert-settings.php`.

assert(PHP_SAPI === 'cli');
$app_root = __DIR__ . '/web';
$site_path = 'sites/default';
require $app_root . '/' . $site_path . '/settings.php';

assert(isset($settings, $databases));
assert($settings['skip_permissions_hardening'] === true);
assert($settings['package_manager_allow_direct_write'] === true);
assert($settings['testing_package_manager'] === true);
assert(in_array('^localhost$', $settings['trusted_host_patterns'], true));
assert($settings['config_sync_directory'] === '../config');
assert($databases['default']['default']['driver'] === 'sqlite');
assert(getenv('IS_DDEV_PROJECT') === '1');
assert(strlen($settings['hash_salt']) > 0);
