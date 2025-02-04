<?php

namespace React\Promise\Internal;

use React\Promise\PromiseInterface;
use function React\Promise\_checkTypehint;
use function React\Promise\resolve;
use function React\Promise\set_rejection_handler;






final class RejectedPromise implements PromiseInterface
{

private $reason;


private $handled = false;




public function __construct(\Throwable $reason)
{
$this->reason = $reason;
}


public function __destruct()
{
if ($this->handled) {
return;
}

$handler = set_rejection_handler(null);
if ($handler === null) {
$message = 'Unhandled promise rejection with ' . $this->reason;

\error_log($message);
return;
}

try {
$handler($this->reason);
} catch (\Throwable $e) {
\preg_match('/^([^:\s]++)(.*+)$/sm', (string) $e, $match);
\assert(isset($match[1], $match[2]));
$message = 'Fatal error: Uncaught ' . $match[1] . ' from unhandled promise rejection handler' . $match[2];

\error_log($message);
exit(255);
}
}







public function then(?callable $onFulfilled = null, ?callable $onRejected = null): PromiseInterface
{
if (null === $onRejected) {
return $this;
}

$this->handled = true;

try {
return resolve($onRejected($this->reason));
} catch (\Throwable $exception) {
return new RejectedPromise($exception);
}
}







public function catch(callable $onRejected): PromiseInterface
{
if (!_checkTypehint($onRejected, $this->reason)) {
return $this;
}




return $this->then(null, $onRejected);
}

public function finally(callable $onFulfilledOrRejected): PromiseInterface
{
return $this->then(null, function (\Throwable $reason) use ($onFulfilledOrRejected): PromiseInterface {
return resolve($onFulfilledOrRejected())->then(function () use ($reason): PromiseInterface {
return new RejectedPromise($reason);
});
});
}

public function cancel(): void
{
$this->handled = true;
}





public function otherwise(callable $onRejected): PromiseInterface
{
return $this->catch($onRejected);
}





public function always(callable $onFulfilledOrRejected): PromiseInterface
{
return $this->finally($onFulfilledOrRejected);
}
}
