# Drupal CMS Launcher

Drupal CMS as a desktop application!

This will install Drupal CMS on your machine and open it in a browser. The idea is a basic Drupal environment that just works: no fiddly set-up process, no Docker, no external dependencies. Just double-click and go.

👉 **Note**: This is still a proof of concept. It's neither polished nor finished, and it's not yet clear if development will continue, and what that will entail. We're not adding features right now. Feel free to try this out and file issues, but for the time being, consider it an unofficial add-on for Drupal CMS.

This product includes PHP software, freely available from <http://www.php.net/software/>.

## How to try it
Go to the latest release and download the appropriate file for your system. Extract the app and run it. 

The Mac application is properly signed. If you're on Windows, you'll probably get some kind of security warning (that will go away when this app has the appropriate code signing, which is in progress).

## How it works
We use [static-php-cli](https://static-php.dev/) to compile a copy of PHP 8.3 that includes everything you need to run Drupal CMS. We bundle that with the [Composer](https://getcomposer.org/) dependency manager, and use those two tools to install and serve Drupal CMS. The app itself is a very simple front-end to PHP and Composer, written in JavaScript using the [Electron](https://www.electronjs.org/) framework.

## Where are the Drupal files and database
The Drupal files and database are stored outside of the application in the `drupal` directory under the `Documents` folder of the user. The site database is under there in `sites/default/files/.ht.sqlite`. 

If you want to reset your Drupal CMS, close the application, delete the `drupal` directory from your `Documents` folder and launch the application again. It will reinstall Drupal CMS from scratch.

## How to develop this application

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
This launcher is meant to get Drupal CMS up and running with no fuss, but it can't replace a full-featured development environment. Specifically, this launcher:
* Does not support deploying to hosting services (yet?).
* Only supports SQLite databases, since SQLite is compiled into the PHP interpreter and has no additional dependencies.
* Uses [the web server built into the PHP interpreter](https://www.php.net/manual/en/features.commandline.webserver.php), which is meant for testing and is nowhere near as powerful as Apache or nginx.
* Might not be able to send e-mail, since it has to rely on whatever mail transfer program is (or isn't) on your system.
* Uses PHP 8.3, the minimum version required by Drupal 11.

If those are dealbreakers for you, a few alternatives:
* [DDEV](https://ddev.com) is Drupal's Docker-based local development platform of choice and gives you everything you need. It even has [a quick-start for Drupal CMS](https://ddev.readthedocs.io/en/stable/users/quickstart/#drupal-drupal-cms).
* If you'd rather avoid Docker, [Laravel Herd](https://herd.laravel.com/) is a fine choice.
* [MAMP](http://mamp.info/) is a venerable favorite of many web developers, and is worth a look.
* For Mac folks, [Laravel Valet](https://laravel.com/docs/11.x/valet) is great if you're comfortable at the command line.
