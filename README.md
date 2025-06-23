# Drupal CMS Launcher

A simple, standalone app to run Drupal CMS locally with zero setup.

[![License](https://img.shields.io/github/license/drupal/cms-launcher)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/tag/drupal/cms-launcher
)](https://github.com/drupal/cms-launcher/releases)

This installs [Drupal CMS](https://new.drupal.org/drupal-cms) on your machine and opens it in your default browser. The idea is a basic Drupal environment that just works: no fiddly setup process, no Docker, no external dependencies. Simply double-click the app to get started.

This product includes PHP software, freely available from <http://www.php.net/software/>.

## Table of contents

- [How to try it](#how-to-try-it)
- [What this app is for](#what-this-app-is-for)
- [How it works](#how-it-works)
- [Where are the Drupal files and database?](#where-are-the-drupal-files-and-database)
- [How to uninstall](#how-to-uninstall)
- [Select correct version](#select-correct-version)
- [Sponsorship](#sponsorship)
- [Contributing](#contributing)
- [Limitations and alternatives](#limitations-and-alternatives)

## How to try it

[Download the latest release](https://github.com/drupal/cms-launcher/releases) for your operating system, under "Assets". For Linux and macOS users not sure which version to download, see [Select correct version](#select-correct-version) below. On Linux, right-click file and select "Executable as Program".

This app is under development and should not be considered stable. If you encounter buggy behavior, [please report it](https://github.com/drupal/cms-launcher/issues)!

## What this app is for

This launcher is designed to help you **test out and build a site with Drupal CMS**. It's ideal for site builders, themers, and evaluators who want to explore Drupal CMS quickly. 

It is **not intended for contributing to or developing Drupal CMS itself**. If your goal is to work on Drupal CMS core or the upstream project, you should use the [Drupal CMS project on Drupal.org](https://www.drupal.org/project/drupal_cms).

## How it works

We use [static-php-cli](https://static-php.dev/) to compile a copy of PHP 8.3 that includes everything needed to run Drupal CMS. We bundle that with the [Composer](https://getcomposer.org/) dependency manager, and use those two tools to install and serve Drupal CMS. The app itself is a very simple front-end to PHP and Composer, written in TypeScript using the [Electron](https://www.electronjs.org/) framework.

## Where are the Drupal files and database?

The Drupal files and database are stored outside of the application, in the _drupal_ directory under the user's _Documents_ directory. The site uses a lightweight SQLite database, located at `web/sites/default/files/.ht.sqlite`.

To reset your Drupal CMS instance, close the application, delete the _drupal_ directory from your _Documents_ directory, and launch the application again. It will reinstall Drupal CMS from scratch.

## How to uninstall

To completely uninstall the Drupal CMS Launcher and remove all associated files:

1. **Delete the application:**
   - On macOS: Move the app from your _Applications_ directory to the Trash.
   - On Windows: Delete the application directory you extracted from the ZIP file.

2. **Remove the Drupal files:**
   - Navigate to your _Documents_ directory.
   - Delete the _drupal_ directory to remove the site files and SQLite database.

After these steps, the application and all its data will be fully removed from your system.

## Select correct version

**Q**: As a macOS user, should I download `silicon` or `Intel` version?

**A**: TO DO: Add a method, as for Linux below .

**Q**: As a Linux user, should I download `x64` or `arm64`?

**A**: Most likely `x64`. `arm64` is for Rapberry Pi, embedded systems, and laptops such as Chromebooks, which use ARM processors. Use the `arch` or `dpkg --print-architecture` command to check, resulting in feedback such as `x86_64` and `amd64`, which work with `x64`. See [ARM or AMD](https://www.reddit.com/r/linux4noobs/comments/m6aywk/arm_or_amd/).

## Sponsorship

This launcher is maintained by the [Drupal Association](https://www.drupal.org/association) and community contributors, but it depends on the amazing `static-php-cli` project, which is used to build the PHP interpreter bundled with the launcher. We heartily encourage you to [sponsor that project's maintainer](https://github.com/sponsors/crazywhalecc) and/or become a Drupal Association member.

## Contributing

Found a bug or want to suggest a feature? [Open an issue](https://github.com/drupal/cms-launcher/issues) or submit a pull request. All contributions welcome!

### Prerequisites

* Node.js (the JavaScript runtime—not the Drupal module 😉) and Yarn 2 or later
* PHP 8.3 or later, globally installed
* Composer, globally installed

Clone this repository, then `cd` into it and run:

```shell
mkdir bin
ln -s -f $(which php) bin
cd bin
cp $(which composer) composer.phar
phar extract -f composer.phar ./composer
cd ..
yarn install
yarn run start
```

To test the full app bundle, run `yarn run make` and look for the final binary in the `dist` directory.

## Limitations and alternatives

This launcher is meant to get Drupal CMS up and running with no fuss, but it can't replace a full-featured development environment. Specifically, this launcher:

* Does not support deploying to hosting services (yet).
* Only supports SQLite databases, since SQLite is compiled into the PHP interpreter and has no additional dependencies.
* Uses [the web server built into the PHP interpreter](https://www.php.net/manual/en/features.commandline.webserver.php), which is meant for testing and is not as powerful as Apache or nginx.
* Might not be able to send email, since it relies on whatever mail transfer program is (or isn't) on your system.
* Uses PHP 8.3—the minimum required by Drupal 11—for maximum compatibility and performance.

If these limitations don’t meet your needs, consider the following alternatives:

* [DDEV](https://ddev.com) is Drupal's Docker-based local development platform of choice and gives you everything you need. It even has [a quick-start for Drupal CMS](https://ddev.readthedocs.io/en/stable/users/quickstart/#drupal-drupal-cms).
* [Lando](https://lando.dev/) and [Docksal](https://docksal.io/) are also widely used, Docker-based options.
* If you'd rather avoid Docker, [Laravel Herd](https://herd.laravel.com/) is a fine choice.
* [MAMP](http://mamp.info/) is a long-standing favorite among web developers and is worth exploring.
* For Mac users, [Laravel Valet](https://laravel.com/docs/11.x/valet) is great if you're comfortable at the command line.
