<?php

namespace React\Promise;

use React\Promise\Internal\RejectedPromise;





final class Promise implements PromiseInterface
{

private $canceller;


private $result;


private $handlers = [];


private $requiredCancelRequests = 0;


private $cancelled = false;





public function __construct(callable $resolver, ?callable $canceller = null)
{
$this->canceller = $canceller;




$cb = $resolver;
$resolver = $canceller = null;
$this->call($cb);
}

public function then(?callable $onFulfilled = null, ?callable $onRejected = null): PromiseInterface
{
if (null !== $this->result) {
return $this->result->then($onFulfilled, $onRejected);
}

if (null === $this->canceller) {
return new static($this->resolver($onFulfilled, $onRejected));
}






$parent = $this;
++$parent->requiredCancelRequests;

return new static(
$this->resolver($onFulfilled, $onRejected),
static function () use (&$parent): void {
assert($parent instanceof self);
--$parent->requiredCancelRequests;

if ($parent->requiredCancelRequests <= 0) {
$parent->cancel();
}

$parent = null;
}
);
}







public function catch(callable $onRejected): PromiseInterface
{
return $this->then(null, static function (\Throwable $reason) use ($onRejected) {
if (!_checkTypehint($onRejected, $reason)) {
return new RejectedPromise($reason);
}




return $onRejected($reason);
});
}

public function finally(callable $onFulfilledOrRejected): PromiseInterface
{
return $this->then(static function ($value) use ($onFulfilledOrRejected): PromiseInterface {
return resolve($onFulfilledOrRejected())->then(function () use ($value) {
return $value;
});
}, static function (\Throwable $reason) use ($onFulfilledOrRejected): PromiseInterface {
return resolve($onFulfilledOrRejected())->then(function () use ($reason): RejectedPromise {
return new RejectedPromise($reason);
});
});
}

public function cancel(): void
{
$this->cancelled = true;
$canceller = $this->canceller;
$this->canceller = null;

$parentCanceller = null;

if (null !== $this->result) {

if ($this->result instanceof RejectedPromise) {
$this->result->cancel();
}



$root = $this->unwrap($this->result);



if (!$root instanceof self || null !== $root->result) {
return;
}

$root->requiredCancelRequests--;

if ($root->requiredCancelRequests <= 0) {
$parentCanceller = [$root, 'cancel'];
}
}

if (null !== $canceller) {
$this->call($canceller);
}


if ($parentCanceller) {
$parentCanceller();
}
}





public function otherwise(callable $onRejected): PromiseInterface
{
return $this->catch($onRejected);
}





public function always(callable $onFulfilledOrRejected): PromiseInterface
{
return $this->finally($onFulfilledOrRejected);
}

private function resolver(?callable $onFulfilled = null, ?callable $onRejected = null): callable
{
return function (callable $resolve, callable $reject) use ($onFulfilled, $onRejected): void {
$this->handlers[] = static function (PromiseInterface $promise) use ($onFulfilled, $onRejected, $resolve, $reject): void {
$promise = $promise->then($onFulfilled, $onRejected);

if ($promise instanceof self && $promise->result === null) {
$promise->handlers[] = static function (PromiseInterface $promise) use ($resolve, $reject): void {
$promise->then($resolve, $reject);
};
} else {
$promise->then($resolve, $reject);
}
};
};
}

private function reject(\Throwable $reason): void
{
if (null !== $this->result) {
return;
}

$this->settle(reject($reason));
}




private function settle(PromiseInterface $result): void
{
$result = $this->unwrap($result);

if ($result === $this) {
$result = new RejectedPromise(
new \LogicException('Cannot resolve a promise with itself.')
);
}

if ($result instanceof self) {
$result->requiredCancelRequests++;
} else {

$this->canceller = null;
}

$handlers = $this->handlers;

$this->handlers = [];
$this->result = $result;

foreach ($handlers as $handler) {
$handler($result);
}


if ($this->cancelled && $result instanceof RejectedPromise) {
$result->cancel();
}
}





private function unwrap(PromiseInterface $promise): PromiseInterface
{
while ($promise instanceof self && null !== $promise->result) {

$promise = $promise->result;
}

return $promise;
}




private function call(callable $cb): void
{


$callback = $cb;
$cb = null;






if (\is_array($callback)) {
$ref = new \ReflectionMethod($callback[0], $callback[1]);
} elseif (\is_object($callback) && !$callback instanceof \Closure) {
$ref = new \ReflectionMethod($callback, '__invoke');
} else {
assert($callback instanceof \Closure || \is_string($callback));
$ref = new \ReflectionFunction($callback);
}
$args = $ref->getNumberOfParameters();

try {
if ($args === 0) {
$callback();
} else {








$target =& $this;

$callback(
static function ($value) use (&$target): void {
if ($target !== null) {
$target->settle(resolve($value));
$target = null;
}
},
static function (\Throwable $reason) use (&$target): void {
if ($target !== null) {
$target->reject($reason);
$target = null;
}
}
);
}
} catch (\Throwable $e) {
$target = null;
$this->reject($e);
}
}
}
