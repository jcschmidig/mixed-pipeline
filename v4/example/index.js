"use strict"

const pipe = require('..')
const { join } = require('path')
const { readdir:readDirectory,
		readFile,
		writeFile,
		unlink:deleteFile } = require('fs').promises

if (!String.prototype.replaceAll) {
	String.prototype.replaceAll = function(search, replace) {
		return this.split(search).join(replace)
	}
}

const SUCCESS = () => true
const PATH_PACKAGES = join(__dirname, 'packages')
const TEMPLATE_FILENAME = join(__dirname, 'config.template')
const CONFIG_NAME = 'config.js'
const CONF_MARKER = '$npm_package_config_'
const UTF = 'utf8'
const PACKAGE_NAME = 'config.json'
const MESSAGE = dir => `${dir}'s ${PACKAGE_NAME} successfully written!`
const display = arg => arg && console.log(MESSAGE(arg))

/*
    Pipeline helper
    Use functions returning a promise if possible,
    but it's not required
 */

// stores the configuration template into the pipeline
const template = () => readFile(TEMPLATE_FILENAME, UTF)

// The starting point, uses the pipeline input to find the subdirs
const packages = ({ path }) =>
    readDirectory(path, { withFileTypes: true })

// Filters the directories and extracts the path names
const packagePath = ({ packages }) => packages
	.filter( entry => entry.isDirectory() )
	.map(    entry => join(PATH_PACKAGES, entry.name) )

// deletes already stored package files, ignoring any errors
const deleteConfigFile = ({ packagePath }) =>
    deleteFile(join(packagePath, PACKAGE_NAME)).catch( SUCCESS )

// reads the config file of the package => example/<package>/config.js
const packageConfig = ({ packagePath }) =>
	require(join(packagePath, CONFIG_NAME))

// Gets the input from getConfig and getTemplate (added via restore)
// and merges the config content
const configOutput = ({ packageConfig, template }) =>
	Object.entries(packageConfig).reduce( (out, [key, value]) =>
		out.replaceAll(CONF_MARKER + key, value), template )

// Writes the config file to disk
const writeConfig = ({ configOutput, packagePath }) =>
	writeFile(join(packagePath, PACKAGE_NAME), configOutput, UTF)
		.then(() => display(JSON.parse(configOutput).name))
/*
    Pipe definitions
 */

// Splitted pipeline, runs for every path found in the main pipeline
const pplProcess = pipe([
    [ deleteConfigFile, packageConfig ],
      configOutput,
      writeConfig
], { propNameInput: 'packagePath'})

const pplFind = pipe([
    [ template, packages ],
    [ packagePath, pplProcess ],
	[ 'packages', packagePath ]
], { summary: true, propNameInput: 'path' }).execute(PATH_PACKAGES)
