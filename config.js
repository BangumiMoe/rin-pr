/**
 * rin-pr project configuration
 */

module.exports = {

    web: {
        /* web server configurations */
        bindAddress: '127.0.0.1',
        bindPort: '3000'
    },

    tracker: {
        /* tracker configurations */
        /* tracker should use only https (for safety)? */
    },

    db: {
        /* database configurations */
        username: '',
        password: '',
        host: '127.0.0.1:27017',
        name: 'prpr'
    },

    security: {
        /* Security settings */
        keyGrip: [
            'phahMi0Pue3fohPae8Kohboo7phoAuy7ohnuqui9OhRoo3siLuEo1epi',
            'reihet5Yhs3xaeDhee0ieken0HoxahV8zahthah0Wahhree3KauaPh2i'
        ]
    }

};
