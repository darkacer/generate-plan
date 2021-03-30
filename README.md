# plugin-&lt;REPLACE ME&gt;

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-template.svg?label=@salesforce/plugin-template)](https://www.npmjs.com/package/@salesforce/plugin-template) [![CircleCI](https://circleci.com/gh/salesforcecli/plugin-template/tree/main.svg?style=shield)](https://circleci.com/gh/salesforcecli/plugin-template/tree/main) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-template.svg)](https://npmjs.org/package/@salesforce/plugin-template) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/plugin-template/main/LICENSE.txt)

Change above to generator before finalizing

&lt;REPLACE ME DESCRIPTION START&gt;

This repository provides a template for creating a plugin for the Salesforce CLI. To convert this template to a working plugin:

1. Clone this repo
2. Delete the .git folder
3. Replace filler values
   a) Every instance of `generator` can be directly substitued for the name of the new plugin. However beware, things like github paths are for the salesforcecli Github organization
   b) Search for case-matching `REPLACE` to find other filler values, such as for the plugin description
4. Use `git init` to set up the desired git information
5. Follow the getting started steps below until the `sfdx generate:plan` commmand is functioning

&lt;REPLACE ME DESCRIPTION END&gt;

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone https://github.com/darkacer/generate-plan.git

# Install the dependencies and compile
yarn install
yarn build
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sfdx cli
sfdx plugins:link
# To verify
sfdx plugins
```

## Commands

<!-- commands -->

USAGE
$ sfdx generate:plan [-u <string>] [-s <string>] [-d <string>]

OPTIONS
-s, --source path to pick query JSON
-d, --destination=destination path to generate plan files

-u, --targetusername=targetusername username or alias for the target
org; overrides default target org

<!-- commandsstop -->
