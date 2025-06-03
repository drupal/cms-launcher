<?php

use Composer\InstalledVersions;

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

// Use a copy of Composer that is locally installed in the project.
try {
  $config['package_manager.settings']['executables']['composer'] = InstalledVersions::getInstallPath('composer/composer') . '/bin/composer';
}
catch (OutOfBoundsException) {
  // Can't figure out where Composer is, so don't try to configure it here.
}

// Allow `localhost` as a trusted host pattern to prevent an error on the status
// report.
$settings['trusted_host_patterns'][] = '^localhost$';

// Suppress the warning raised by `skip_permissions_hardening`.
// @see drupal_cms_installer_install_tasks()
putenv('IS_DDEV_PROJECT=1');
