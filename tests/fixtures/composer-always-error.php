<?php

declare(strict_types=1);

// Simulates a Composer that will always throw an exception, to prove that
// Composer is bypassed when using a prebuilt archive.

throw new \Exception('You should not have come here.');
