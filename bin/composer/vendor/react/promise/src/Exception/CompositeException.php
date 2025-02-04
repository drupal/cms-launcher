<?php

namespace React\Promise\Exception;








class CompositeException extends \Exception
{

private $throwables;


public function __construct(array $throwables, string $message = '', int $code = 0, ?\Throwable $previous = null)
{
parent::__construct($message, $code, $previous);

$this->throwables = $throwables;
}




public function getThrowables(): array
{
return $this->throwables;
}
}
