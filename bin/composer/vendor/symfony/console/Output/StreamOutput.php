<?php










namespace Symfony\Component\Console\Output;

use Symfony\Component\Console\Exception\InvalidArgumentException;
use Symfony\Component\Console\Formatter\OutputFormatterInterface;














class StreamOutput extends Output
{
private $stream;









public function __construct($stream, int $verbosity = self::VERBOSITY_NORMAL, ?bool $decorated = null, ?OutputFormatterInterface $formatter = null)
{
if (!\is_resource($stream) || 'stream' !== get_resource_type($stream)) {
throw new InvalidArgumentException('The StreamOutput class needs a stream as its first argument.');
}

$this->stream = $stream;

if (null === $decorated) {
$decorated = $this->hasColorSupport();
}

parent::__construct($verbosity, $decorated, $formatter);
}






public function getStream()
{
return $this->stream;
}

protected function doWrite(string $message, bool $newline)
{
if ($newline) {
$message .= \PHP_EOL;
}

@fwrite($this->stream, $message);

fflush($this->stream);
}














protected function hasColorSupport()
{

if ('' !== (($_SERVER['NO_COLOR'] ?? getenv('NO_COLOR'))[0] ?? '')) {
return false;
}



if (!@stream_isatty($this->stream) && !\in_array(strtoupper((string) getenv('MSYSTEM')), ['MINGW32', 'MINGW64'], true)) {
return false;
}

if ('\\' === \DIRECTORY_SEPARATOR && @sapi_windows_vt100_support($this->stream)) {
return true;
}

if ('Hyper' === getenv('TERM_PROGRAM')
|| false !== getenv('COLORTERM')
|| false !== getenv('ANSICON')
|| 'ON' === getenv('ConEmuANSI')
) {
return true;
}

if ('dumb' === $term = (string) getenv('TERM')) {
return false;
}


return preg_match('/^((screen|xterm|vt100|vt220|putty|rxvt|ansi|cygwin|linux).*)|(.*-256(color)?(-bce)?)$/', $term);
}
}
