/**
 * Events that the main process can send to the renderer.
 */
export enum Events
{
    // A line of output from Composer while creating the code base.
    Output = 'output',

    // Progress has been made while extracting or building the code base.
    Progress = 'progress',
}
