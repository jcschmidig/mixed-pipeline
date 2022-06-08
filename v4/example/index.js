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
const FAIL    = () => false
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
const template = () => readFile(TEMPLATE_FILENAME, UTF).catch( FAIL )

// The starting point, uses the pipeline input to find the subdirs
const packagePath = async ({ path }) =>
    (await readDirectory(path, { withFileTypes: true }))
		.filter( entry => entry.isDirectory() )
		.map(    entry => join(PATH_PACKAGES, entry.name) )

// deletes already stored package files, ignoring any errors
const deleteConfigFile = ({ packagePath }) =>
    deleteFile(join(packagePath, PACKAGE_NAME))
		.then( SUCCESS )
		.catch( FAIL )

// reads the config file of the package => example/<package>/config.js
const packageConfig = ({ packagePath }) =>
	require(join(packagePath, CONFIG_NAME))

// Gets the input from packageConfig and template
// and merges the config content
const configOutput = ({ packageConfig, template }) =>
	Object.entries(packageConfig).reduce( (out, [key, value]) =>
		out.replaceAll(CONF_MARKER + key, value), template )

// Writes the config file to disk
const writeConfig = ({ configOutput, packagePath }) =>
	writeFile(join(packagePath, PACKAGE_NAME), configOutput, UTF)
		.then(() => display(JSON.parse(configOutput).name))
		.then( SUCCESS )
		.catch( FAIL )
/*
    Pipe definitions
 */

// Splitted pipeline, runs for every path found in the main pipeline
const pplProcess = pipe([
    [ packageConfig, deleteConfigFile ],
      configOutput,
      writeConfig
], { summary: true, propNameInput: 'packagePath'})

const pplFind = pipe([
      template,
    [ packagePath, pplProcess ]
], { propNameInput: 'path', processInSync: true })

pplFind.execute(PATH_PACKAGES).then( c => console.log("Success:", c))
