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

const PATH_PACKAGES = join(__dirname, 'packages')
const TEMPLATE_FILENAME = join(__dirname, 'config.template')
const CONFIG_NAME = 'config.js'
const CONF_MARKER = '$npm_package_config_'
const UTF = 'utf8'
const PACKAGE_NAME = 'config.json'
const MESSAGE = dir => `${dir}'s ${PACKAGE_NAME} successfully written!`
const display = arg => arg && console.log(MESSAGE(arg))
const noop = () => {}

/*
    Pipeline helper
    Use functions returning a promise if possible,
    but it's not required
 */

// Will be stored in the main pipeline to be restored in the process pipeline,
// so it's only read once in the whole process
const getTemplate = () => readFile(TEMPLATE_FILENAME, UTF)

// The starting point, uses the pipeline input to find the subdirs
const findPackages = dir => readDirectory(dir, { withFileTypes: true })

// Filters the directories and extracts the path names
const getPaths = (entries, dir) => entries
	.filter(entry => entry.isDirectory())
	.map(entry => join(dir, entry.name))

// deletes already stored package files, ignoring any errors
const deleteOldConfigFile = packagePath =>
    deleteFile(join(packagePath, PACKAGE_NAME)).catch( noop )

// reads the config file of the package => example/<package>/config.js
const getNewConfig = packagePath => require(join(packagePath, CONFIG_NAME))

// Gets the input from getConfig and getTemplate (added via restore)
// and merges the config content
const convertConfig = (config, template) => Object.entries(config).reduce(
	(out, [key, value]) => out.replaceAll(CONF_MARKER + key, value), template )

// Writes the config file to disk
const writeConfig = (configOutput, packagePath) =>
	writeFile(join(packagePath, PACKAGE_NAME), configOutput, UTF)

// Runs concurrently with writeConfig and therefore gets also the config output
const displaySuccess = configOutput => display(JSON.parse(configOutput).name)

/*
    Pipe definitions
 */

// Splitted pipeline, runs for every path found in the main pipeline
const plProcess = pipe()
	.runShadow(deleteOldConfigFile)
    .run(getNewConfig)
    .restore(getTemplate)
    .run(convertConfig)
    .runShadow(writeConfig, displaySuccess)

// Main pipeline
const plFind = pipe()
	.store(getTemplate)
	.run(findPackages)
	.run(getPaths)
	.trace('found paths:')
	.split(plProcess)  // => see above

/*
    Pipe execution
 */

// Starts the pipeline with the package path
plFind.execute(PATH_PACKAGES)
