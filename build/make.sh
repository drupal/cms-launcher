chmod +x ./bin/php*

# Extract the Composer phar file into the binaries directory.
composer run extract --working-dir=build

# Download the current CA certificate bundle for cURL.
curl https://curl.haxx.se/ca/cacert.pem --fail --location --output cacert.pem

# Compile code and assets.
npx electron-vite build
