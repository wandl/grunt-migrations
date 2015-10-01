/**
 * grunt-migrations
 * https://github.com/ebaranov/grunt-migrations
 *
 * Copyright (c) 2013 Eugene Baranov
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var _ = require('underscore');
  var shell = require('shelljs');
  var Q = require('q');
  var fs = require('fs');

  var config = {
    templates: {
      backupsDir: "<%= backups %>/<%= envName %>",
      backupsName: "<%= date %>_<%= time %>",
      scpSSH: '<%= ssh.user %>@<%= ssh.host %>:<%= remotePath %>',
      date: 'yyyy-mm-dd',
      time: 'HH-MM-ss',
      messages: {
        commandExecute: "grunt-migrations: execute command START '<%= cmd %>'",
        commandExecuteSuccess: "grunt-migrations: execute command SUCCESS '<%= cmd %>'",
        commandExecuteError: "grunt-migrations: execute command ERROR '<%= cmd %>'"
      }
    },
    cmd: {
      bash: {
        ssh: "ssh -p <%= port %> <%= user %>@<%= host %>",
        mkdir: "mkdir -p <%= path %>",
        scp: "scp <%= options %> <%= source %> <%= target %>",
        rm: "rm -rf <%= path %>",
        ls: "ls -la"
      },
      mysql: {
        pull: "mysqldump -h <%= host %> -u<%= user %> -p'<%= pass %>' <%= name %> --result-file=<%= backupPath %>/<%= backupName %>",
        push: "mysql -h <%= host %> -u <%= user %> -p'<%= pass %>' <%= name %> < <%= backupPath %>/<%= backupName %>"
      },
      search_replace: "sed -i'' -e 's#<%= search %>#<%= replace %>#g' <%= file %>"
    },
    defaults: {
      backups: 'db_backups',
      db: {
        mysql: {
          host: 'localhost',
          port: 3306,
          backupExtension: 'sql'
        }
      },
      ssh: {
        port: 22
      },
      environments: {}
    }
  };

  var getBackupFileName = function(taskConfig) {
    return [
      _.template(config.templates.backupsName, {
        date: grunt.template.today(config.templates.date),
        time: grunt.template.today(config.templates.time)
      }),
      taskConfig.db.backupExtension
    ].join('.');
  };

  var getBackupEnvPath = function(backupsDir, envName) {
    return _.template(config.templates.backupsDir, {
      backups: backupsDir,
      envName: envName
    });
  };

  var execCommand = function(cmd, successCallback, errorCallback) {
    grunt.log.ok(_.template(config.templates.messages.commandExecute, { cmd: cmd }));

    shell.exec(cmd, { silent: true }, function(code, output) {
      if (code !== 0) {
        grunt.log.ok(_.template(config.templates.messages.commandExecuteError, { cmd: cmd }));
        errorCallback(code, output);
      } else {
        grunt.log.ok(_.template(config.templates.messages.commandExecuteSuccess, { cmd: cmd }));
        successCallback(code, output);
      }
    });
  };

  var execCommandQueue = function(commandsQueue, successCallback, errorCallback) {
    if (commandsQueue.length === 0) {
      successCallback();
    } else {
      execCommand(
        commandsQueue.shift(),
        function() {
          execCommandQueue(commandsQueue, successCallback, errorCallback);
        },
        function() {
          errorCallback();
        }
      );
    }
  };

  var createCommand = function(cmd, params, sshConfig) {
    return sshConfig ? _.template(config.cmd.bash.ssh, sshConfig) + ' \\ ' + _.template(cmd, params) : _.template(cmd, params);
  };

  var jobs = {
    pull: function(params) {

      // TODO: validate source

      var jobDeferred = Q.defer();
      // apply defaults
      var options = this.options(config.defaults);
      // init source environment config and apply defaults on db and ssh settings
      var sourceEnvConfig = options.environments[params.source];
      sourceEnvConfig.db = _.defaults(sourceEnvConfig.db, config.defaults.db[sourceEnvConfig.db.type]);
      sourceEnvConfig.ssh = _.isObject(sourceEnvConfig.ssh) ? _.defaults(sourceEnvConfig.ssh, config.defaults.ssh) : null;
      var backupPath = getBackupEnvPath(options.backups, sourceEnvConfig.title);
      var backupName = getBackupFileName(sourceEnvConfig);
      var commandsQueue = [];

      // create backups folder
      commandsQueue.push(createCommand(config.cmd.bash.mkdir, { path: backupPath }, sourceEnvConfig.ssh));

      // backup database into file
      commandsQueue.push(createCommand(config.cmd[sourceEnvConfig.db.type].pull, _.extend({}, sourceEnvConfig.db, {
        backupPath: backupPath,
        backupName: backupName
      }), sourceEnvConfig.ssh));

      if (sourceEnvConfig.ssh) {
        // create backups folder on local
        commandsQueue.push(createCommand(config.cmd.bash.mkdir, { path: backupPath }));

        // TODO search and replace

        // copy database backup from remote to local
        commandsQueue.push(createCommand(config.cmd.bash.scp, {
          options: '-P ' + sourceEnvConfig.ssh.port,
          source: _.template(config.templates.scpSSH, {
            ssh: sourceEnvConfig.ssh,
            remotePath: [backupPath, backupName].join('/')
          }),
          target: [backupPath, backupName].join('/')
        }));
      }

      execCommandQueue(commandsQueue, jobDeferred.resolve, jobDeferred.reject);

      return jobDeferred.promise;
    },

    push: function(params) {

      // TODO: validate source and target

      var jobDeferred = Q.defer();
      // apply defaults
      var options = this.options(config.defaults);
      // init source environment config and apply defaults on db and ssh settings
      var sourceEnvConfig = options.environments[params.source];
      sourceEnvConfig.db = _.defaults(sourceEnvConfig.db, config.defaults.db[sourceEnvConfig.db.type]);
      sourceEnvConfig.ssh = _.isObject(sourceEnvConfig.ssh) ? _.defaults(sourceEnvConfig.ssh, config.defaults.ssh) : null;
      // init target environment config and apply defaults on db and ssh settings
      var targetEnvConfig = options.environments[params.target];
      targetEnvConfig.db = _.defaults(targetEnvConfig.db, config.defaults.db[targetEnvConfig.db.type]);
      targetEnvConfig.ssh = _.isObject(targetEnvConfig.ssh) ? _.defaults(targetEnvConfig.ssh, config.defaults.ssh) : null;
      var backupPath = getBackupEnvPath(options.backups, sourceEnvConfig.title);
      var backupName = getBackupFileName(sourceEnvConfig);
      var commandsQueue = [];

      // create backups folder on source
      commandsQueue.push(createCommand(config.cmd.bash.mkdir, { path: backupPath }, sourceEnvConfig.ssh));

      // create backups folder on target
      commandsQueue.push(createCommand(config.cmd.bash.mkdir, { path: backupPath }, targetEnvConfig.ssh));

      // backup source database
      commandsQueue.push(createCommand(config.cmd[sourceEnvConfig.db.type].pull, _.extend({}, sourceEnvConfig.db, {
        backupPath: backupPath,
        backupName: backupName
      }), sourceEnvConfig.ssh));

      // Search and Replace database refs
     /* commandsQueue.push(_.template(config.cmd.search_replace, {
          search: sourceEnvConfig.url,
          replace: targetEnvConfig.url,
          file: [backupPath, backupName].join('/')
        }
      ));*/

      // copy source backup to local if source is remote environment
      if (sourceEnvConfig.ssh) {
        // crate backups folder on local
        commandsQueue.push(createCommand(config.cmd.bash.mkdir, { path: backupPath }));

        // copy source backup to local
        commandsQueue.push(createCommand(config.cmd.bash.scp, {
          options: '-P ' + sourceEnvConfig.ssh.port,
          source: _.template(config.templates.scpSSH, {
            ssh: sourceEnvConfig.ssh,
            remotePath: [backupPath, backupName].join('/')
          }),
          target: [backupPath, backupName].join('/')
        }));
      }

      // Search and Replace database refs
      commandsQueue.push(_.template(config.cmd.search_replace, {
          search: sourceEnvConfig.url,
          replace: targetEnvConfig.url,
          file: [backupPath, backupName].join('/')
        }
      ));

      // copy source backup from local to target
      if (targetEnvConfig.ssh) {
        commandsQueue.push(createCommand(config.cmd.bash.scp, {
          options: '-P ' + targetEnvConfig.ssh.port,
          source: [backupPath, backupName].join('/'),
          target: _.template(config.templates.scpSSH, {
            ssh: targetEnvConfig.ssh,
            remotePath: [backupPath, backupName].join('/')
          })
        }));
      }

      // push source database into target
      commandsQueue.push(createCommand(config.cmd[targetEnvConfig.db.type].push, _.extend({}, targetEnvConfig.db, {
        backupPath: backupPath,
        backupName: backupName
      }), targetEnvConfig.ssh));

      execCommandQueue(commandsQueue, jobDeferred.resolve, jobDeferred.reject);

      return jobDeferred.promise;
    }
  };

  grunt.task.registerMultiTask('migrations', 'Migrate databases easily', function() {
    var taskDone = this.async();

    // TODO: validate data

    jobs[this.data.action].call(this, this.data).then(
      function() {
        taskDone(true);
      },
      function() {
        taskDone(false);
      }
    );
  });
};
