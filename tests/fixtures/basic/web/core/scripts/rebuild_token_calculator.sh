<?php

/**
 * @file
 * Simulates an error during a cache clear.
 */

sleep(1);
throw new Exception('A fake error during cache clear.');
