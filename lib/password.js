(function () {

    var os = require('os'),
        fs = require('fs'),
        util = require('util');

    var platform = os.platform();

    var crypto = require('crypto');

    var string_md5 = function (str, raw_output) {
        var hash = crypto.createHash('md5');
        if (raw_output) {
            return hash.update(str).digest('binary');
        } else {
            return hash.update(str).digest('hex');
        }
    }

    function unique_id($extra) {
        $extra = $extra ? $extra : 'c';

        var $val = $extra + Date.now().toString();
        $val = string_md5($val);

        return $val.substr(4, 16);
    }

    function password_hash($password) {

        $itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

        $random_state = unique_id();
        $random = '';
        $count = 6;


        for ($i = 0; $i < $count; $i += 16) {
            $random_state = string_md5(unique_id() + $random_state);
            $random += string_md5($random_state, true);
        }
        $random = $random.substr(0, $count);


        $hash = _hash_crypt_private($password, _hash_gensalt_private($random, $itoa64), $itoa64);

        if ($hash.length == 34) {
            return $hash;
        }

        return string_md5($password);
    }

    /**
     * Check for correct password
     *
     * @param string $password The password in plain text
     * @param string $hash The stored password hash
     *
     * @return bool Returns true if the password is correct, false if not.
     */
    function password_check_hash($password, $hash) {

        $itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        if ($hash.length == 34) {
            return (_hash_crypt_private($password, $hash, $itoa64) === $hash) ? true : false;
        }

        return (string_md5($password) === $hash) ? true : false;
    }

    /**
     * Generate salt for hash generation
     */
    function _hash_gensalt_private($input, $itoa64, $iteration_count_log2) {
        $iteration_count_log2 = $iteration_count_log2 ? $iteration_count_log2 : 6;

        if ($iteration_count_log2 < 4 || $iteration_count_log2 > 31) {
            $iteration_count_log2 = 8;
        }

        $output = '$H$';
        $output += $itoa64[Math.min($iteration_count_log2 + 5, 30)];
        $output += _hash_encode64($input, 6, $itoa64);

        return $output;
    }

    /**
     * Encode hash
     */
    function _hash_encode64($input, $count, $itoa64) {
        $output = '';
        $i = 0;

        do
        {
            $value = $input.charCodeAt($i++);
            $output += $itoa64[$value & 0x3f];

            if ($i < $count) {
                $value |= ($input.charCodeAt($i)) << 8;
            }

            $output += $itoa64[($value >> 6) & 0x3f];

            if ($i++ >= $count) {
                break;
            }

            if ($i < $count) {
                $value |= ($input.charCodeAt($i)) << 16;
            }

            $output += $itoa64[($value >> 12) & 0x3f];

            if ($i++ >= $count) {
                break;
            }

            $output += $itoa64[($value >> 18) & 0x3f];
        }
        while ($i < $count);

        return $output;
    }

    /**
     * The crypt function/replacement
     */
    function _hash_crypt_private($password, $setting, $itoa64) {
        $output = '*';

        // Check for correct hash
        if ($setting.substr(0, 3) != '$H$' && $setting.substr(0, 3) != '$P$') {
            return $output;
        }

        $count_log2 = $itoa64.indexOf($setting[3]);

        if ($count_log2 < 7 || $count_log2 > 30) {
            return $output;
        }

        $count = 1 << $count_log2;
        $salt = $setting.substr(4, 8);

        if ($salt.length != 8) {
            return $output;
        }

        /**
         * We're kind of forced to use MD5 here since it's the only
         * cryptographic primitive available in all versions of PHP
         * currently in use.  To implement our own low-level crypto
         * in PHP would result in much worse performance and
         * consequently in lower iteration counts and hashes that are
         * quicker to crack (by non-PHP code).
         */

        $hash = string_md5($salt + $password, true);
        do
        {
            $hash = string_md5($hash + $password, true);
        }
        while (--$count);

        $output = $setting.substr(0, 12);
        $output += _hash_encode64($hash, 16, $itoa64);

        return $output;
    }

    function email_check(email) {
        if (email.match(/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/) !== null) {
            return true;
        }
        return false;
    }

    exports.unique_id = unique_id;
    exports.password_hash = password_hash;
    exports.password_check_hash = password_check_hash;

}).call(this);
