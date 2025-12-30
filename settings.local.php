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

// Allow caches to be cleared without a token.
$settings['rebuild_access'] = TRUE;

// Suppress the warning raised by `skip_permissions_hardening`.
// @see drupal_cms_installer_install_tasks()
putenv('IS_DDEV_PROJECT=1');
