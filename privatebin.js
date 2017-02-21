#!/usr/bin/env node

/**
 * PrivateBin-Cli
 *
 * a zero-knowledge paste bin
 *
 * @see       {@link https://github.com/PrivateBin/PrivateBin-Cli}
 * @copyright 2017 Simon Rupf ({@link http://privatebin.info})
 * @license   {@link https://www.opensource.org/licenses/zlib-license.php The zlib/libpng License}
 * @version   0.1
 * @name      PrivateBin-Cli
 * @namespace
 */

'use strict';

// enforce presence of one argument
if (!process.argv[2])
{
    console.error('Usage: ./privatebin.js <path to text file> [optional password] [optional PrivateBin FQDN]');
    process.exit(1);
}

global.sjcl = require('./sjcl-1.0.6');
var password = process.argv[3] || '',
    privatebinHost = process.argv[4] || 'privatebin.net',
    privatebinProtocol = 'https',
    privatebinPort = 443,
    privatebinPath = '/',
    expiration = 'never',
    format = 'plaintext',
    burnafterreading = 1,
    opendiscussion = 0,
    fs = require('fs'),
    querystring = require('querystring'),
    http = require(privatebinProtocol),
    base64env = require('./base64-2.1.9'),
    rawenv = require('./rawdeflate-0.5'),
    Base64 = base64env.Base64,
    RawDeflate = rawenv.RawDeflate;

/**
 * filter methods
 *
 * @name filter
 * @class
 */
var filter = {
    /**
     * compress a message (deflate compression), returns base64 encoded data
     *
     * @name   filter.compress
     * @function
     * @param  {string} message
     * @return {string} base64 data
     */
    compress: function(message)
    {
        return Base64.toBase64( RawDeflate.deflate( Base64.utob(message) ) );
    },

    /**
     * compress, then encrypt message with given key and password
     *
     * @name   filter.cipher
     * @function
     * @param  {string} key
     * @param  {string} password
     * @param  {string} message
     * @return {string} data - JSON with encrypted data
     */
    cipher: function(key, password, message)
    {
        // Galois Counter Mode, keysize 256 bit, authentication tag 128 bit
        var options = {mode: 'gcm', ks: 256, ts: 128};
        if ((password || '').trim().length === 0)
        {
            return sjcl.encrypt(key, this.compress(message), options);
        }
        return sjcl.encrypt(key + sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(password)), this.compress(message), options);
    }
};

/**
 * PrivateBin logic
 *
 * @name controller
 * @class
 */
var controller = {
    /**
     * send a new paste to server
     *
     * @name   controller.sendData
     * @function
     * @param  {String} data
     */
    sendData: function(data)
    {
        // do not send if no data.
        if (data.length === 0)
        {
            return;
        }

        var randomkey = sjcl.codec.base64.fromBits(sjcl.random.randomWords(8, 0), 0),
            cipherdata = filter.cipher(randomkey, password, data),
            data_to_send = querystring.stringify({
                data:             cipherdata,
                expire:           expiration,
                formatter:        format,
                burnafterreading: burnafterreading,
                opendiscussion:   opendiscussion
            }),
            options = {
                host: privatebinHost,
                port: privatebinPort,
                path: privatebinPath,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(data_to_send),
                    'X-Requested-With': 'JSONHttpRequest'
                }
            },
            request = http.request(options, function(res) {
                var responseString = '';
                res.setEncoding('utf8');
                res.on('data', function (data) {
                    responseString += data;
                });
                res.on('end', function () {
                    var response = JSON.parse(responseString);
                    if (response.status === 0) {
                        var privatebinUrl = privatebinProtocol + '://' + privatebinHost + privatebinPath,
                            url = privatebinUrl + '?' + response.id + '#' + randomkey,
                            deleteUrl = privatebinUrl + '?pasteid=' + response.id + '&deletetoken=' + response.deletetoken;

                        console.log('Your private paste URL is: ' + url);
                        if (burnafterreading == 0)
                        {
                            console.log('Your delete URL is: ' + deleteUrl);
                        }
                        process.exit(0);
                    }
                    else if (response.status === 1)
                    {
                        console.error('Could not create paste: ' + response.message);
                        process.exit(3);
                    }
                    else
                    {
                        console.error('Could not create paste: unknown status');
                        process.exit(4);
                    }
                });
            });

        request.on('error', function (error) {
            console.error('Could not create paste: ' + error.message);
            process.exit(5);
        });

        request.write(data_to_send);
        request.end();
    }
};

// try to open file for reading, naively loading it all into memory
fs.readFile(process.argv[2], function (err, data) {
    if (err) {
        console.error(err.toString());
        process.exit(2);
    }
    console.log('Sending content of file "' + process.argv[2] + '"…');
    controller.sendData(data.toString());
});
