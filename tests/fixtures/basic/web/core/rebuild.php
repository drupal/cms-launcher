<?php

declare(strict_types=1);

// Simulates an error occurring during a cache clear.
sleep(1);
throw new \Exception('A fake error while clearing the cache.');
