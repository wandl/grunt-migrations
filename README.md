# Grunt Database Migrations

> push/pull databases from one location to another using Grunt. Inspired by https://github.com/getdave/grunt-deployments. At first planned as fork, but later I understand what I want something more than push/pull only mysql databases.

**IMPORTANT NOTE**: the authors of this Plugin assume **no responsibility** for any actions which result from the usage of this script. You use it entirely *at your own risk*. It is *strongly* recommended that you test the script in a non-critical environment prior to rolling out for production use. *Always* manually backup your local and remote databases before using the script for the first time. No support can be provided for critical situations.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-migrations --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-migrations');
```

*This plugin was designed to work with Grunt 0.4.x. If you're still using grunt v0.3.x it's strongly recommended that [you upgrade](http://gruntjs.com/upgrading-from-0.3-to-0.4), but in case you can't please use [v0.3.2](https://github.com/gruntjs/grunt-contrib-copy/tree/grunt-0.3-stable).*

## migrations task
_Run this task with the `grunt migrations[:sub-task]` command._

### Options

#### backups
Type: `String` - path to "backups" folder, relative to grunt task target folder for local environment or relative to your "user home" for remote environments. Also, it can be absolute system path. 

#### environments
Type: `Object` - environments settings

#### environments.local
Type: **`REQUIRED`**:`Object` - settings of local environment (means environment, where grunt runs)

#### environments.<environment_name>
Type: `Object` - environment meta name, e.g. `local`, `dev`, `stage`, `prod` etc.

#### environments.<environment_name>.title
Type: `String` - environment title, e.g. `localhost`, `development`, `staging`, `production` etc. Will be used as folder name for databse backups folder for specific environment, e.g. `~/db_backup/<title>/<database_backup>.sql`

#### environments.<environment_name>.db
Type: `Object` - database settings

#### environments.<environment_name>.db.host
Type: `String` - database host, e.g. `localhost`, `0.0.0.0` etc.

#### environments.<environment_name>.db.name
Type: `String` - database name

#### environments.<environment_name>.db.user
Type: `String` - database username

#### environments.<environment_name>.db.pass
Type: `String` - database password

#### environments.<environment_name>.db.type
Type: `String` - database type `mysql`, `postgree`, `mongo` etc. 

***IMPORTANT NOTE***: **currently support only `mysql`**

#### environments.<environment_name>.ssh
Type: `Object` - ssh settings

#### environments.<environment_name>.ssh.host
Type: `String` - shh host

#### environments.<environment_name>.ssh.pass
Type: `String` - ssh username

### Sub-tasks

#### <sub-task_name>
Type: `Object` - sub-task config

#### <sub-task_name>.action
Type: `String:[push|pull]` - push/pull `source` database, where `source` is config option described below. `pull` - backup database, `push` - apply backup from `source` to `target`

#### <sub-task_name>.source
Type: `String` - `source` environment name from options `migrations.environments.<environment_name>`

#### <sub-task_name>.target
Type: `String` - `target` environment name from options `migrations.environments.<environment_name>`

### Usage Example

```json
migrations: {
  options: {
    backups: 'db_backups',
    environments: {
      local: {
        title: 'localhost',
        db: {
          host: '0.0.0.0',
          name: '<local_db_name>',
          user: '<local_db_user>',
          pass: '<local_db_pass>',
          type: 'mysql'
        }
      },
      dev: {
        title: 'development',
        db: {
          host: 'localhost',
          name: '<dev_db_name>',
          user: '<dev_db_user>',
          pass: '<dev_db_pass>',
          type: 'mysql'
        },
        ssh: {
          host: '<dev_environment_host_or_IP>',
          user: '<dev_ssh_username>'
        }
      }
    }
  },
  'pull-dev': { action: 'pull', source: 'dev' },
  'pull-local': { action: 'pull', source: 'local' },
  'push-dev-to-local': { action: 'push', source: 'dev', target: 'local' },
  'push-local-to-dev': { action: 'push', source: 'local', target: 'dev' }
}
```

## Release History

 * 2013-12-15   v0.0.1   Initial release
