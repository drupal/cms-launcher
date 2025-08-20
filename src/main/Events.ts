/**
 * Events that the main process can send to the renderer.
 */
export enum Events
{
    // About to create the Drupal code base.
    InstallStarted = 'will-install',

    // The Drupal code base has been created, or already exists.
    InstallFinished = 'installed',

    // A line of output from Composer while creating the code base.
    Output = 'output',

    // Progress has been made while extracting or building the code base.
    Progress = 'progress',

    // The Drupal site is being served, and is ready to be opened in a browser.
    Started = 'started',

    // An error occurred while creating the code base or starting the server.
    Error = 'error',
}
