# Drupal CMS Launcher
Drupal CMS as an app.

When you run this, it will install Drupal CMS on your local machine and open it in a browser. The idea is a local Drupal environment that just works: no set-up process, no Docker, no Composer, no external dependencies. Just double-click and go.

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
