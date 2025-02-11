# Drupal CMS Launcher
Drupal CMS as an app.

When you run this, it will install Drupal CMS on your local machine and open it in a browser. The idea is a local Drupal environment that just works: no set-up process, no Docker, no Composer, no external dependencies. Just double-click and go.

👉 **Note**: This is still a proof of concept. It's neither polished nor finished, and it's not yet clear if development will continue, and what that will entail. We're not adding features right now. Feel free to try this out and file issues, but for the time being, consider it an unofficial add-on for Drupal CMS.

## How it works
This project uses [static-php-cli](https://static-php.dev/) to create a statically compiled copy of the PHP 8.3 interpreter that includes everything you need to run Drupal CMS. It bundles that with a copy of the [Composer](https://getcomposer.org/) dependency manager, and uses those two tools to install and serve Drupal CMS (using the basic web server built into the PHP interpreter). The app itself is a very simple front-end to PHP and Composer, written in JavaScript for the [Electron](https://www.electronjs.org/) framework.

## How to try it
Go to the latest release and download the appropriate file for your system. Extract the app and run it. If you're on Windows, you'll probably get some kind of security warning (that will go away when this app has the appropriate code signing, which is in progress).

## How to test

### Prerequisites
* Node (the JavaScript runtime, not the Drupal module 😉)
* PHP 8.3 or later, globally installed
* Composer, globally installed

Clone this repository, then `cd` into it and run:
```shell
mkdir bin
ln -s -f $(which php) bin
ln -s -f $(which composer) bin/composer.phar
npm install
npm run start
```
To test the full app bundle, `npm run make` and then look for the final binary in the `out` directory.

## Limitations & Alternatives
This launcher is meant to get Drupal CMS up and running with no fuss, but it's not a replacement for full-featured development environment. Specifically, this launcher:
* Only supports SQLite databases, since SQLite is compiled into the PHP interpreter and and has no additional dependencies.
* Uses [the web server built into the PHP interpreter](https://www.php.net/manual/en/features.commandline.webserver.php), which is meant for testing and is nowhere near as powerful as Apache or nginx.
* Might not be able to send e-mail, since it would need to rely on whatever mail transfer program is present on your system.

If those are dealbreakers for you:
* [DDEV](https://ddev.com) is Drupal's Docker-based local development platform of choice and gives you everything you need. There is even [a quick-start for Drupal CMS](https://ddev.readthedocs.io/en/stable/users/quickstart/#drupal-drupal-cms).
* If you'd rather not use Docker, [Laravel Herd](https://herd.laravel.com/) (or [Valet](https://laravel.com/docs/11.x/valet) for macOS, if you're comfortable with the command line) are good choices.
* [MAMP](http://mamp.info/) is a long-standing favorite of many web developers, and is worth a look.
