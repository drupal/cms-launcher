<?php

$databases['default']['default'] = array (
  'prefix' => '',
  'database' => 'sites/default/files/.ht.sqlite',
  'driver' => 'sqlite',
  'namespace' => 'Drupal\\sqlite\\Driver\\Database\\sqlite',
  'autoload' => 'core/modules/sqlite/src/Driver/Database/sqlite/',
);
// Make it easier for Project Browser to install things into the local site.
$settings['skip_permissions_hardening'] = TRUE;

// Allow use of the direct-write mode added to Package Manager in Drupal 11.2.
$settings['package_manager_allow_direct_write'] = TRUE;

// Suppress the warning raised by `skip_permissions_hardening`.
// @see drupal_cms_installer_install_tasks()
putenv('IS_DDEV_PROJECT=1');
