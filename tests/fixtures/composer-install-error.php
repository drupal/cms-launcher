<?php

declare(strict_types=1);

// Simulates an error when `composer install` is run.

if (in_array('install', $_SERVER['argv'], true)) {
  throw new \Exception('An imaginary error occurred!');
}
