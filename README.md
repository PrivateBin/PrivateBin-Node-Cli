# PrivateBin CLI

**PrivateBin** is a minimalist, open source online pastebin where the server has
zero knowledge of pasted data.

Data is encrypted/decrypted in the browser using 256bit AES in [Galois Counter mode](https://en.wikipedia.org/wiki/Galois/Counter_Mode).

This is a proof-of-concept CLI client for [PrivateBin](https://privatebin.info/).
It will create a burn-after-reading, plain text paste at https://privatebin.net/
by default, with the contents of the given file.

There is no check if the content is a text file (try sending a PNG). The server
side will complain if the file is too large.

## Usage

    ./privatebin.js <path to text file> [optional password] [optional PrivateBin FQDN]

## Installation

This script works on Unix/Linux systems that have the `node` binary in their path.
Execute `which node` on the shell, to check if you have node JS installed. If it
is found, you can clone this git repository and execute the PrivateBin CLI client
as described above under "Usage".

## Examples

Create a paste with the contents of `~/example.txt`:

    ./privatebin.js ~/example.txt

Create a password protected paste (this logs the password in your shell history):

    ./privatebin.js ~/example.txt 'please use a much more secure password'

Create a paste (no password) on a the PrivateBin server at `example.com`:

    ./privatebin.js ~/example.txt '' example.com

## Configuration

There are currently quite a few hardcoded values you might want to change, you
find these at lines 28 and following:

    privatebinProtocol = 'https',   // protocol used, may be 'https' or 'http'
    privatebinPort = 443,           // port on the server side, typically 443 for https and 80 for http
    privatebinPath = '/',           // path of the PrivateBin installation
    expiration = 'never',           // any valid expiration time as configured on the PrivateBin instance in question
    format = 'plaintext',           // may be 'plaintext', 'syntaxhighlighting' or 'markdown', changes the display of the resulting paste
    burnafterreading = 1,           // if set to 1, expiration is ignored, 0 to use a fixed paste expiration timer
    opendiscussion = 0,             // if a comments should be allowed (if enabled on the server), ignored if burnafterreading is set to 1

