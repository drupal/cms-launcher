# Drupal CMS Launcher

A simple, standalone app to run Drupal CMS locally with zero setup.

[![License](https://img.shields.io/github/license/drupal/cms-launcher)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/tag/drupal/cms-launcher
)](https://github.com/drupal/cms-launcher/releases)
![Windows build status](https://github.com/drupal/cms-launcher/actions/workflows/build-windows.yml/badge.svg)
![macOS build status](https://github.com/drupal/cms-launcher/actions/workflows/build-macos.yml/badge.svg)
![Linux build status](https://github.com/drupal/cms-launcher/actions/workflows/build-linux.yml/badge.svg)

This installs [Drupal CMS](https://new.drupal.org/drupal-cms) on your machine and opens it in your default browser. The idea is a basic Drupal environment that just works: no fiddly setup process, no Docker, no external dependencies. Simply double-click the app to get started.

This product includes PHP software, freely available from <http://www.php.net/software/>.

## Table of contents

- [How to try it](#how-to-try-it)
- [What this app is for](#what-this-app-is-for)
- [How it works](#how-it-works)
- [Where are the Drupal files and database?](#where-are-the-drupal-files-and-database)
- [How to uninstall](#how-to-uninstall)
- [Troubleshooting](#troubleshooting)
- [Sponsorship](#sponsorship)
- [Contributing](#contributing)
- [Limitations and alternatives](#limitations-and-alternatives)

## How to try it

* **Windows**: [Download the latest release](https://github.com/drupal/cms-launcher/releases/latest/download/Drupal_CMS-Windows.exe) and double-click to install and run.
* **macOS**: [Download the latest release](https://github.com/drupal/cms-launcher/releases/latest/download/Drupal_CMS-macOS.zip), unzip it, and move the app to your _Applications_ folder. Then double-click it to run.
* **Linux**: Install [AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher), then [download the latest release](https://github.com/drupal/cms-launcher/releases/latest) of the Drupal CMS Launcher appropriate for your system, right-click file and select "Executable as Program", and double-click it.  
    **Tip**: Use the `arch` or `dpkg --print-architecture` command to check what kind of system you have. If you get `x86_64` or `amd64`, use the `x64` version. If you get `aarch64`, use the `arm64` version.

This app is actively developed, so if you encounter buggy behavior, [please report it](https://github.com/drupal/cms-launcher/issues)!

## What this app is for

This launcher is designed to help you **test out and build a site with Drupal CMS**. It's ideal for site builders, themers, and evaluators who want to explore Drupal CMS quickly.

It does not manage the Drupal CMS codebase after initial setup; updating the launcher will not update Drupal core, modules, or themes. Drupal CMS includes the [Automatic Updates](https://www.drupal.org/project/automatic_updates) module, which provides a built-in way to keep Drupal core, modules, and themes up to date.

It is **not intended for contributing to or developing Drupal CMS itself**. If your goal is to contribute code to Drupal CMS upstream, visit the [Drupal CMS project on Drupal.org](https://www.drupal.org/project/drupal_cms).

## How it works

We use [static-php-cli](https://static-php.dev/) to compile a copy of PHP that includes everything needed to run Drupal CMS. We bundle that with the [Composer](https://getcomposer.org/) dependency manager, and use those two tools to install and serve Drupal CMS. The app itself is a very simple wrapper around PHP and Composer, written in TypeScript using the [Electron](https://www.electronjs.org/) framework.

## Where are the Drupal files and database?

The Drupal files and database are stored outside of the application, in the _drupal_ directory under the system's application data directory. The site uses a lightweight SQLite database, located at `web/sites/default/files/.ht.sqlite`.

To reset your Drupal CMS instance, press the trash icon to delete the _drupal_ directory from your system's application data directory. You will then be able to reinstall Drupal CMS from scratch.

## How to uninstall

To completely uninstall the Drupal CMS Launcher and remove all associated files:

1. **Remove the Drupal files:**
   - Run the app and press the trash icon to delete the Drupal directory.
   - Quit the app.

2. **Delete the application:**
   - On macOS: Move the app from your _Applications_ directory to the Trash.
   - On Windows: Uninstall the app via the control panel, the same way you would uninstall any other app.
   - On Linux: Delete the AppImage file you downloaded.

## Troubleshooting

This section provides solutions to common problems.

### Windows Defender Firewall is blocking the application

On Windows, the built-in firewall may block the launcher because it needs to start a local web server. If the application fails to start or gives a connection error, you may need to manually allow it through the firewall.

**Solution:**

1.  Press the Windows Key, type `Allow an app through Windows Firewall`, and open it.
2.  Click the **"Change settings"** button. You may need administrator permission.
3.  Click the **"Allow another app..."** button at the bottom.
4. In the new window, click **"Browse..."** and navigate to where you installed the launcher (usually at `C:\Users\YOUR_USERNAME\AppData\Local\Programs\cms-launcher`). Select `Launch Drupal CMS.exe` and click **"Open"**.
5.  Click the **"Add"** button to add the application to the firewall list.
6.  You will now see the launcher in the list. Ensure that the checkboxes for **"Private"** and **"Public"** are checked.
7.  Click **"OK"** to save your changes. The launcher should now be able to connect properly.

## Sponsorship

This launcher is maintained by the [Drupal Association](https://www.drupal.org/association) and community contributors, but it depends on the amazing `static-php-cli` project, which is used to build the PHP interpreter bundled with the launcher. We heartily encourage you to [sponsor that project's maintainer](https://github.com/sponsors/crazywhalecc) and/or become a Drupal Association member.

## Contributing

Found a bug or want to suggest a feature? [Open an issue](https://github.com/drupal/cms-launcher/issues) or submit a pull request. All contributions welcome!

### Prerequisites

* [Node Version Manager (NVM)](https://github.com/nvm-sh/nvm)
* PHP 8.4 or later, globally installed
* Composer, globally installed

Clone this repository, then `cd` into it and run:

```shell
nvm use
composer run assets --working-dir=build
npm install
npm start
```

To run tests, run `npm test`. To test the full app bundle, run `npx electron-builder` and look for the final binary in the `dist` directory.

## Limitations and alternatives

This launcher is meant to get Drupal CMS up and running with no fuss, but it can't replace a full-featured development environment. Specifically, this launcher:

* Does not support deploying to hosting services (yet).
* Only supports one Drupal CMS site at a time.
* Only supports SQLite databases, since SQLite is compiled into the PHP interpreter and has no additional dependencies.
* Uses [the web server built into the PHP interpreter](https://www.php.net/manual/en/features.commandline.webserver.php), which is meant for testing, does _not_ support HTTPS, and generally isn't as powerful as Apache or nginx.
* Might not be able to send email, since it relies on whatever mail transfer program is (or isn't) on your system.
* Uses PHP 8.4—the minimum recommended for Drupal 11—for maximum compatibility and performance.

If these limitations don’t meet your needs, consider the following alternatives:

* [DDEV](https://ddev.com) is Drupal's Docker-based local development platform of choice and gives you everything you need. It even has [a quick-start for Drupal CMS](https://ddev.readthedocs.io/en/stable/users/quickstart/#drupal-drupal-cms).
* [Lando](https://lando.dev/) ([instructions for Drupal CMS](https://docs.lando.dev/plugins/drupal/guides/drupal-cms.html)) and [Docksal](https://docksal.io/) are also widely used, Docker-based options.
* If you'd rather avoid Docker, [Laravel Herd](https://herd.laravel.com/) is a fine choice.
* [MAMP](http://mamp.info/) and [XAMPP](https://www.apachefriends.org) are long-standing favorites among web developers and worth exploring.
* For Mac users, [Laravel Valet](https://laravel.com/docs/11.x/valet) is great if you're comfortable at the command line.
