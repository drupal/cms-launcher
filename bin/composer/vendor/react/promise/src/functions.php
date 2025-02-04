<?php

namespace React\Promise;

use React\Promise\Exception\CompositeException;
use React\Promise\Internal\FulfilledPromise;
use React\Promise\Internal\RejectedPromise;
















function resolve($promiseOrValue): PromiseInterface
{
if ($promiseOrValue instanceof PromiseInterface) {
return $promiseOrValue;
}

if (\is_object($promiseOrValue) && \method_exists($promiseOrValue, 'then')) {
$canceller = null;

if (\method_exists($promiseOrValue, 'cancel')) {
$canceller = [$promiseOrValue, 'cancel'];
assert(\is_callable($canceller));
}


return new Promise(function (callable $resolve, callable $reject) use ($promiseOrValue): void {
$promiseOrValue->then($resolve, $reject);
}, $canceller);
}

return new FulfilledPromise($promiseOrValue);
}
















function reject(\Throwable $reason): PromiseInterface
{
return new RejectedPromise($reason);
}











function all(iterable $promisesOrValues): PromiseInterface
{
$cancellationQueue = new Internal\CancellationQueue();


return new Promise(function (callable $resolve, callable $reject) use ($promisesOrValues, $cancellationQueue): void {
$toResolve = 0;

$continue = true;
$values = [];

foreach ($promisesOrValues as $i => $promiseOrValue) {
$cancellationQueue->enqueue($promiseOrValue);
$values[$i] = null;
++$toResolve;

resolve($promiseOrValue)->then(
function ($value) use ($i, &$values, &$toResolve, &$continue, $resolve): void {
$values[$i] = $value;

if (0 === --$toResolve && !$continue) {
$resolve($values);
}
},
function (\Throwable $reason) use (&$continue, $reject): void {
$continue = false;
$reject($reason);
}
);

if (!$continue && !\is_array($promisesOrValues)) {
break;
}
}

$continue = false;
if ($toResolve === 0) {
$resolve($values);
}
}, $cancellationQueue);
}












function race(iterable $promisesOrValues): PromiseInterface
{
$cancellationQueue = new Internal\CancellationQueue();


return new Promise(function (callable $resolve, callable $reject) use ($promisesOrValues, $cancellationQueue): void {
$continue = true;

foreach ($promisesOrValues as $promiseOrValue) {
$cancellationQueue->enqueue($promiseOrValue);

resolve($promiseOrValue)->then($resolve, $reject)->finally(function () use (&$continue): void {
$continue = false;
});

if (!$continue && !\is_array($promisesOrValues)) {
break;
}
}
}, $cancellationQueue);
}
















function any(iterable $promisesOrValues): PromiseInterface
{
$cancellationQueue = new Internal\CancellationQueue();


return new Promise(function (callable $resolve, callable $reject) use ($promisesOrValues, $cancellationQueue): void {
$toReject = 0;
$continue = true;
$reasons = [];

foreach ($promisesOrValues as $i => $promiseOrValue) {
$cancellationQueue->enqueue($promiseOrValue);
++$toReject;

resolve($promiseOrValue)->then(
function ($value) use ($resolve, &$continue): void {
$continue = false;
$resolve($value);
},
function (\Throwable $reason) use ($i, &$reasons, &$toReject, $reject, &$continue): void {
$reasons[$i] = $reason;

if (0 === --$toReject && !$continue) {
$reject(new CompositeException(
$reasons,
'All promises rejected.'
));
}
}
);

if (!$continue && !\is_array($promisesOrValues)) {
break;
}
}

$continue = false;
if ($toReject === 0 && !$reasons) {
$reject(new Exception\LengthException(
'Must contain at least 1 item but contains only 0 items.'
));
} elseif ($toReject === 0) {
$reject(new CompositeException(
$reasons,
'All promises rejected.'
));
}
}, $cancellationQueue);
}







































function set_rejection_handler(?callable $callback): ?callable
{
static $current = null;
$previous = $current;
$current = $callback;

return $previous;
}




function _checkTypehint(callable $callback, \Throwable $reason): bool
{
if (\is_array($callback)) {
$callbackReflection = new \ReflectionMethod($callback[0], $callback[1]);
} elseif (\is_object($callback) && !$callback instanceof \Closure) {
$callbackReflection = new \ReflectionMethod($callback, '__invoke');
} else {
assert($callback instanceof \Closure || \is_string($callback));
$callbackReflection = new \ReflectionFunction($callback);
}

$parameters = $callbackReflection->getParameters();

if (!isset($parameters[0])) {
return true;
}

$expectedException = $parameters[0];


$type = $expectedException->getType();

$isTypeUnion = true;
$types = [];

switch (true) {
case $type === null:
break;
case $type instanceof \ReflectionNamedType:
$types = [$type];
break;
case $type instanceof \ReflectionIntersectionType:
$isTypeUnion = false;
case $type instanceof \ReflectionUnionType;
$types = $type->getTypes();
break;
default:
throw new \LogicException('Unexpected return value of ReflectionParameter::getType');
}


if (empty($types)) {
return true;
}

foreach ($types as $type) {

if ($type instanceof \ReflectionIntersectionType) {
foreach ($type->getTypes() as $typeToMatch) {
assert($typeToMatch instanceof \ReflectionNamedType);
$name = $typeToMatch->getName();
if (!($matches = (!$typeToMatch->isBuiltin() && $reason instanceof $name))) {
break;
}
}
assert(isset($matches));
} else {
assert($type instanceof \ReflectionNamedType);
$name = $type->getName();
$matches = !$type->isBuiltin() && $reason instanceof $name;
}



if ($matches) {
if ($isTypeUnion) {
return true;
}
} else {
if (!$isTypeUnion) {
return false;
}
}
}



return $isTypeUnion ? false : true;
}
