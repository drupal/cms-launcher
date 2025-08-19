<?php

declare(strict_types=1);

// Simulates an error when `composer install` is run.

$arguments = array_filter(
  $_SERVER['argv'],
  fn (string $a): bool => !str_starts_with($a, '--')
);
$arguments = array_values($arguments);
$arguments = array_slice($arguments, 1);

if ($arguments[0] === 'install') {
  throw new \Exception('An imaginary error occurred!');
}
else {
  fwrite(STDERR, 'Doing step: '. $arguments[0]);

  if ($arguments[0] === 'create-project') {
    mkdir($arguments[2]);
  }
  usleep(300000);
}
