/**
 * Commands that can be sent to the main process.
 */
export enum Commands
{
    // Create the Drupal code base, if needed, and start serving it.
    Start = 'drupal-start',

    // Open the Drupal site in the default browser.
    Open = 'drupal-open',
}
