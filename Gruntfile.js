/**
 * grunt-migrations
 * https://github.com/ebaranov/grunt-migrations
 *
 * Copyright (c) 2013 Eugene Baranov
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  grunt.config.init({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    }
  });

  grunt.loadTasks('tasks');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.registerTask('default', ['jshint']);

};
