<?php declare(strict_types=1);











namespace Composer\Command;

use Composer\Package\Link;
use Composer\Package\Package;
use Composer\Package\PackageInterface;
use Composer\Package\CompletePackageInterface;
use Composer\Package\RootPackage;
use Composer\Repository\InstalledArrayRepository;
use Composer\Repository\CompositeRepository;
use Composer\Repository\RootPackageRepository;
use Composer\Repository\InstalledRepository;
use Composer\Repository\PlatformRepository;
use Composer\Repository\RepositoryFactory;
use Composer\Plugin\CommandEvent;
use Composer\Plugin\PluginEvents;
use Composer\Semver\Constraint\Bound;
use Composer\Util\Platform;
use Symfony\Component\Console\Formatter\OutputFormatter;
use Symfony\Component\Console\Formatter\OutputFormatterStyle;
use Composer\Package\Version\VersionParser;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Composer\Util\PackageInfo;






abstract class BaseDependencyCommand extends BaseCommand
{
protected const ARGUMENT_PACKAGE = 'package';
protected const ARGUMENT_CONSTRAINT = 'version';
protected const OPTION_RECURSIVE = 'recursive';
protected const OPTION_TREE = 'tree';


protected $colors;







protected function doExecute(InputInterface $input, OutputInterface $output, bool $inverted = false): int
{

$composer = $this->requireComposer();
$commandEvent = new CommandEvent(PluginEvents::COMMAND, $this->getName(), $input, $output);
$composer->getEventDispatcher()->dispatch($commandEvent->getName(), $commandEvent);

$repos = [];

$repos[] = new RootPackageRepository(clone $composer->getPackage());

if ($input->getOption('locked')) {
$locker = $composer->getLocker();

if (!$locker->isLocked()) {
throw new \UnexpectedValueException('A valid composer.lock file is required to run this command with --locked');
}

$repos[] = $locker->getLockedRepository(true);
$repos[] = new PlatformRepository([], $locker->getPlatformOverrides());
} else {
$localRepo = $composer->getRepositoryManager()->getLocalRepository();
$rootPkg = $composer->getPackage();

if (count($localRepo->getPackages()) === 0 && (count($rootPkg->getRequires()) > 0 || count($rootPkg->getDevRequires()) > 0)) {
$output->writeln('<warning>No dependencies installed. Try running composer install or update, or use --locked.</warning>');

return 1;
}

$repos[] = $localRepo;

$platformOverrides = $composer->getConfig()->get('platform') ?: [];
$repos[] = new PlatformRepository([], $platformOverrides);
}

$installedRepo = new InstalledRepository($repos);


$needle = $input->getArgument(self::ARGUMENT_PACKAGE);
$textConstraint = $input->hasArgument(self::ARGUMENT_CONSTRAINT) ? $input->getArgument(self::ARGUMENT_CONSTRAINT) : '*';


$packages = $installedRepo->findPackagesWithReplacersAndProviders($needle);
if (empty($packages)) {
throw new \InvalidArgumentException(sprintf('Could not find package "%s" in your project', $needle));
}



$matchedPackage = $installedRepo->findPackage($needle, $textConstraint);
if (!$matchedPackage) {
$defaultRepos = new CompositeRepository(RepositoryFactory::defaultRepos($this->getIO(), $composer->getConfig(), $composer->getRepositoryManager()));
if ($match = $defaultRepos->findPackage($needle, $textConstraint)) {
$installedRepo->addRepository(new InstalledArrayRepository([clone $match]));
} elseif (PlatformRepository::isPlatformPackage($needle)) {
$parser = new VersionParser();
$constraint = $parser->parseConstraints($textConstraint);
if ($constraint->getLowerBound() !== Bound::zero()) {
$tempPlatformPkg = new Package($needle, $constraint->getLowerBound()->getVersion(), $constraint->getLowerBound()->getVersion());
$installedRepo->addRepository(new InstalledArrayRepository([$tempPlatformPkg]));
}
} else {
$this->getIO()->writeError('<error>Package "'.$needle.'" could not be found with constraint "'.$textConstraint.'", results below will most likely be incomplete.</error>');
}
} elseif (PlatformRepository::isPlatformPackage($needle)) {
$extraNotice = '';
if (($matchedPackage->getExtra()['config.platform'] ?? false) === true) {
$extraNotice = ' (version provided by config.platform)';
}
$this->getIO()->writeError('<info>Package "'.$needle.' '.$textConstraint.'" found in version "'.$matchedPackage->getPrettyVersion().'"'.$extraNotice.'.</info>');
}


$needles = [$needle];
if ($inverted) {
foreach ($packages as $package) {
$needles = array_merge($needles, array_map(static function (Link $link): string {
return $link->getTarget();
}, $package->getReplaces()));
}
}


if ('*' !== $textConstraint) {
$versionParser = new VersionParser();
$constraint = $versionParser->parseConstraints($textConstraint);
} else {
$constraint = null;
}


$renderTree = $input->getOption(self::OPTION_TREE);
$recursive = $renderTree || $input->getOption(self::OPTION_RECURSIVE);

$return = $inverted ? 1 : 0;


$results = $installedRepo->getDependents($needles, $constraint, $inverted, $recursive);
if (empty($results)) {
$extra = (null !== $constraint) ? sprintf(' in versions %smatching %s', $inverted ? 'not ' : '', $textConstraint) : '';
$this->getIO()->writeError(sprintf(
'<info>There is no installed package depending on "%s"%s</info>',
$needle,
$extra
));
$return = $inverted ? 0 : 1;
} elseif ($renderTree) {
$this->initStyles($output);
$root = $packages[0];
$this->getIO()->write(sprintf('<info>%s</info> %s %s', $root->getPrettyName(), $root->getPrettyVersion(), $root instanceof CompletePackageInterface ? $root->getDescription() : ''));
$this->printTree($results);
} else {
$this->printTable($output, $results);
}

if ($inverted && $input->hasArgument(self::ARGUMENT_CONSTRAINT) && !PlatformRepository::isPlatformPackage($needle)) {
$composerCommand = 'update';

foreach ($composer->getPackage()->getRequires() as $rootRequirement) {
if ($rootRequirement->getTarget() === $needle) {
$composerCommand = 'require';
break;
}
}

foreach ($composer->getPackage()->getDevRequires() as $rootRequirement) {
if ($rootRequirement->getTarget() === $needle) {
$composerCommand = 'require --dev';
break;
}
}

$this->getIO()->writeError('Not finding what you were looking for? Try calling `composer '.$composerCommand.' "'.$needle.':'.$textConstraint.'" --dry-run` to get another view on the problem.');
}

return $return;
}






protected function printTable(OutputInterface $output, array $results): void
{
$table = [];
$doubles = [];
do {
$queue = [];
$rows = [];
foreach ($results as $result) {




[$package, $link, $children] = $result;
$unique = (string) $link;
if (isset($doubles[$unique])) {
continue;
}
$doubles[$unique] = true;
$version = $package->getPrettyVersion() === RootPackage::DEFAULT_PRETTY_VERSION ? '-' : $package->getPrettyVersion();
$packageUrl = PackageInfo::getViewSourceOrHomepageUrl($package);
$nameWithLink = $packageUrl !== null ? '<href=' . OutputFormatter::escape($packageUrl) . '>' . $package->getPrettyName() . '</>' : $package->getPrettyName();
$rows[] = [$nameWithLink, $version, $link->getDescription(), sprintf('%s (%s)', $link->getTarget(), $link->getPrettyConstraint())];
if (is_array($children)) {
$queue = array_merge($queue, $children);
}
}
$results = $queue;
$table = array_merge($rows, $table);
} while (\count($results) > 0);

$this->renderTable($table, $output);
}




protected function initStyles(OutputInterface $output): void
{
$this->colors = [
'green',
'yellow',
'cyan',
'magenta',
'blue',
];

foreach ($this->colors as $color) {
$style = new OutputFormatterStyle($color);
$output->getFormatter()->setStyle($color, $style);
}
}








protected function printTree(array $results, string $prefix = '', int $level = 1): void
{
$count = count($results);
$idx = 0;
foreach ($results as $result) {
[$package, $link, $children] = $result;

$color = $this->colors[$level % count($this->colors)];
$prevColor = $this->colors[($level - 1) % count($this->colors)];
$isLast = (++$idx === $count);
$versionText = $package->getPrettyVersion() === RootPackage::DEFAULT_PRETTY_VERSION ? '' : $package->getPrettyVersion();
$packageUrl = PackageInfo::getViewSourceOrHomepageUrl($package);
$nameWithLink = $packageUrl !== null ? '<href=' . OutputFormatter::escape($packageUrl) . '>' . $package->getPrettyName() . '</>' : $package->getPrettyName();
$packageText = rtrim(sprintf('<%s>%s</%1$s> %s', $color, $nameWithLink, $versionText));
$linkText = sprintf('%s <%s>%s</%2$s> %s', $link->getDescription(), $prevColor, $link->getTarget(), $link->getPrettyConstraint());
$circularWarn = $children === false ? '(circular dependency aborted here)' : '';
$this->writeTreeLine(rtrim(sprintf("%s%s%s (%s) %s", $prefix, $isLast ? '└──' : '├──', $packageText, $linkText, $circularWarn)));
if (is_array($children)) {
$this->printTree($children, $prefix . ($isLast ? '   ' : '│  '), $level + 1);
}
}
}

private function writeTreeLine(string $line): void
{
$io = $this->getIO();
if (!$io->isDecorated()) {
$line = str_replace(['└', '├', '──', '│'], ['`-', '|-', '-', '|'], $line);
}

$io->write($line);
}
}
