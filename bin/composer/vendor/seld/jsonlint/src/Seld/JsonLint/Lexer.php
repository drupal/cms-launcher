<?php










namespace Seld\JsonLint;






class Lexer
{

const EOF = 1;

const T_INVALID = -1;
const T_SKIP_WHITESPACE = 0;
const T_ERROR = 2;

const T_BREAK_LINE = 3;

const T_COMMENT = 30;

const T_OPEN_COMMENT = 31;

const T_CLOSE_COMMENT = 32;





private $rules = array(
0 => '/\G\s*\n\r?/',
1 => '/\G\s+/',
2 => '/\G-?([0-9]|[1-9][0-9]+)(\.[0-9]+)?([eE][+-]?[0-9]+)?\b/',
3 => '{\G"(?>\\\\["bfnrt/\\\\]|\\\\u[a-fA-F0-9]{4}|[^\0-\x1f\\\\"]++)*+"}',
4 => '/\G\{/',
5 => '/\G\}/',
6 => '/\G\[/',
7 => '/\G\]/',
8 => '/\G,/',
9 => '/\G:/',
10 => '/\Gtrue\b/',
11 => '/\Gfalse\b/',
12 => '/\Gnull\b/',
13 => '/\G$/',
14 => '/\G\/\//',
15 => '/\G\/\*/',
16 => '/\G\*\//',
17 => '/\G./',
);


private $input;

private $more;

private $done;

private $offset;

private $flags;


public $match;

public $yylineno;

public $yyleng;

public $yytext;

public $yylloc;




public function __construct($flags = 0)
{
$this->flags = $flags;
}




public function lex()
{
while (true) {
$symbol = $this->next();
switch ($symbol) {
case self::T_SKIP_WHITESPACE:
case self::T_BREAK_LINE:
break;
case self::T_COMMENT:
case self::T_OPEN_COMMENT:
if (!($this->flags & JsonParser::ALLOW_COMMENTS)) {
$this->parseError('Lexical error on line ' . ($this->yylineno+1) . ". Comments are not allowed.\n" . $this->showPosition());
}
$this->skipUntil($symbol === self::T_COMMENT ? self::T_BREAK_LINE : self::T_CLOSE_COMMENT);
if ($this->done) {

return 14;
}
break;
case self::T_CLOSE_COMMENT:
$this->parseError('Lexical error on line ' . ($this->yylineno+1) . ". Unexpected token.\n" . $this->showPosition());
default:
return $symbol;
}
}
}





public function setInput($input)
{
$this->input = $input;
$this->more = false;
$this->done = false;
$this->offset = 0;
$this->yylineno = $this->yyleng = 0;
$this->yytext = $this->match = '';
$this->yylloc = array('first_line' => 1, 'first_column' => 0, 'last_line' => 1, 'last_column' => 0);

return $this;
}




public function showPosition()
{
if ($this->yylineno === 0 && $this->offset === 1 && $this->match !== '{') {
return $this->match.'...' . "\n^";
}

$pre = str_replace("\n", '', $this->getPastInput());
$c = str_repeat('-', max(0, \strlen($pre) - 1)); 

return $pre . str_replace("\n", '', $this->getUpcomingInput()) . "\n" . $c . "^";
}




public function getPastInput()
{
$pastLength = $this->offset - \strlen($this->match);

return ($pastLength > 20 ? '...' : '') . substr($this->input, max(0, $pastLength - 20), min(20, $pastLength));
}




public function getUpcomingInput()
{
$next = $this->match;
if (\strlen($next) < 20) {
$next .= substr($this->input, $this->offset, 20 - \strlen($next));
}

return substr($next, 0, 20) . (\strlen($next) > 20 ? '...' : '');
}




public function getFullUpcomingInput()
{
$next = $this->match;
if (substr($next, 0, 1) === '"' && substr_count($next, '"') === 1) {
$len = \strlen($this->input);
if ($len === $this->offset) {
$strEnd = $len;
} else {
$strEnd = min(strpos($this->input, '"', $this->offset + 1) ?: $len, strpos($this->input, "\n", $this->offset + 1) ?: $len);
}
$next .= substr($this->input, $this->offset, $strEnd - $this->offset);
} elseif (\strlen($next) < 20) {
$next .= substr($this->input, $this->offset, 20 - \strlen($next));
}

return $next;
}





protected function parseError($str)
{
throw new ParsingException($str);
}





private function skipUntil($token)
{
$symbol = $this->next();
while ($symbol !== $token && false === $this->done) {
$symbol = $this->next();
}
}




private function next()
{
if ($this->done) {
return self::EOF;
}
if ($this->offset === \strlen($this->input)) {
$this->done = true;
}

$token = null;
$match = null;
$col = null;
$lines = null;

if (!$this->more) {
$this->yytext = '';
$this->match = '';
}

$rulesLen = count($this->rules);

for ($i=0; $i < $rulesLen; $i++) {
if (preg_match($this->rules[$i], $this->input, $match, 0, $this->offset)) {
$lines = explode("\n", $match[0]);
array_shift($lines);
$lineCount = \count($lines);
$this->yylineno += $lineCount;
$this->yylloc = array(
'first_line' => $this->yylloc['last_line'],
'last_line' => $this->yylineno+1,
'first_column' => $this->yylloc['last_column'],
'last_column' => $lineCount > 0 ? \strlen($lines[$lineCount - 1]) : $this->yylloc['last_column'] + \strlen($match[0]),
);
$this->yytext .= $match[0];
$this->match .= $match[0];
$this->yyleng = \strlen($this->yytext);
$this->more = false;
$this->offset += \strlen($match[0]);
return $this->performAction($i);
}
}

if ($this->offset === \strlen($this->input)) {
return self::EOF;
}

$this->parseError(
'Lexical error on line ' . ($this->yylineno+1) . ". Unrecognized text.\n" . $this->showPosition()
);
}





private function performAction($rule)
{
switch ($rule) {
case 0:
return self::T_BREAK_LINE;
case 1:
return self::T_SKIP_WHITESPACE;
case 2:
return 6;
case 3:
$this->yytext = substr($this->yytext, 1, $this->yyleng-2);
return 4;
case 4:
return 17;
case 5:
return 18;
case 6:
return 23;
case 7:
return 24;
case 8:
return 22;
case 9:
return 21;
case 10:
return 10;
case 11:
return 11;
case 12:
return 8;
case 13:
return 14;
case 14:
return self::T_COMMENT;
case 15:
return self::T_OPEN_COMMENT;
case 16:
return self::T_CLOSE_COMMENT;
case 17:
return self::T_INVALID;
default:
throw new \LogicException('Unsupported rule '.$rule);
}
}
}
