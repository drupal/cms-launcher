// Prepares Electron Builder for Azure Trusted Signing.
// @see .github/workflows/launcher-windows.yml
const env = { process };
const { readFileSync, writeFileSync } = require( 'node:fs' );
const path = require( 'path' );
const yaml = require( 'yaml' );

if ( 'CI' in env ) {
    const configFile = path.join( process.cwd(), 'electron-builder.yml' );

    let conf = readFileSync( configFile ).toString();
    conf = yaml.parse( conf );

    conf.win.azureSignOptions = {
        certificateProfileName: env.AZURE_CERT_PROFILE_NAME,
        codeSigningAccountName: env.AZURE_CODE_SIGNING_NAME,
        endpoint: env.AZURE_ENDPOINT,
    };
    writeFileSync( configFile, yaml.stringify( conf ) );
}
