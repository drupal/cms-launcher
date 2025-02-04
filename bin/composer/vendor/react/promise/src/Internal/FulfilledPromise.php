<?php

namespace React\Promise\Internal;

use React\Promise\PromiseInterface;
use function React\Promise\resolve;







final class FulfilledPromise implements PromiseInterface
{

private $value;





public function __construct($value = null)
{
if ($value instanceof PromiseInterface) {
throw new \InvalidArgumentException('You cannot create React\Promise\FulfilledPromise with a promise. Use React\Promise\resolve($promiseOrValue) instead.');
}

$this->value = $value;
}






public function then(?callable $onFulfilled = null, ?callable $onRejected = null): PromiseInterface
{
if (null === $onFulfilled) {
return $this;
}

try {



$result = $onFulfilled($this->value);
return resolve($result);
} catch (\Throwable $exception) {
return new RejectedPromise($exception);
}
}

public function catch(callable $onRejected): PromiseInterface
{
return $this;
}

public function finally(callable $onFulfilledOrRejected): PromiseInterface
{
return $this->then(function ($value) use ($onFulfilledOrRejected): PromiseInterface {
return resolve($onFulfilledOrRejected())->then(function () use ($value) {
return $value;
});
});
}

public function cancel(): void
{
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
