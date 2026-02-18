<?php

// Make it easier for Project Browser to install things into the local site.
$settings['skip_permissions_hardening'] = TRUE;

// Allow use of the direct-write mode added to Package Manager in Drupal 11.2.
$settings['package_manager_allow_direct_write'] = TRUE;

// Don't warn about using Package Manager, despite its being experimental.
$settings['testing_package_manager'] = TRUE;

// Allow `localhost` as a trusted host pattern to prevent an error on the status
// report.
$settings['trusted_host_patterns'][] = '^localhost$';

// Export configuration outside the web root.
$settings['config_sync_directory'] = '../config';

// Set up the SQLite database.
$databases['default']['default'] = [
  'prefix' => '',
  'database' => 'sites/default/files/.ht.sqlite',
  'driver' => 'sqlite',
  'namespace' => 'Drupal\\sqlite\\Driver\\Database\\sqlite',
  'autoload' => 'core/modules/sqlite/src/Driver/Database/sqlite/',
];

// Suppress the warning raised by `skip_permissions_hardening`.
// @see drupal_cms_installer_install_tasks()
putenv('IS_DDEV_PROJECT=1');
