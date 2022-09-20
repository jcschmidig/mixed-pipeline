"use strict"

const pipe = require('..')
const { log:writeLog, error:writeError } = console
const { join } = require('path')
const { readdir:readDirectory,
		readFile,
		writeFile,
		unlink:deleteFile } = require('fs').promises

const replaceAll = (value, search, replace) => value.split(search).join(replace)

const ret = value => _ => value
const SUCCESS = ret(true)
const FAIL    = ret(false)
const PATH_PACKAGES = join(__dirname, 'packages')
const TEMPLATE_FILENAME = join(__dirname, 'config.template')
const CONFIG_NAME = 'config.js'
const CONF_MARKER = '$npm_package_config_'
const UTF = 'utf8'
const PACKAGE_NAME = 'config.json'
const MESSAGE = dir => `${dir}'s ${PACKAGE_NAME} successfully written!`
const display = arg => _ => arg && writeLog(MESSAGE(JSON.parse(arg).name))

/*
    Pipeline helper
    Use functions returning a promise if possible,
    but it's not required
 */

// stores the configuration template into the pipeline
const template = () => readFile(TEMPLATE_FILENAME, UTF).catch( FAIL )

// The starting point, uses the pipeline input to find the subdirs
const entryPath = async ({ path }) =>
    (await readDirectory(path, { withFileTypes: true }))
		.filter( entry => entry.isDirectory() )
		.map   ( entry => join(path, entry.name) )

// deletes already stored package files, ignoring any errors
const deleteConfig = ({ packagePath }) =>
    deleteFile(join(packagePath, PACKAGE_NAME))
		.then( SUCCESS, FAIL )

// reads the config file of the package => example/<package>/config.js
const packageConfig = ({ packagePath }) =>
	require(join(packagePath, CONFIG_NAME))

// Gets the input from packageConfig and template
// and merges the config content
const configOutput = ({ packageConfig, template }) =>
	Object.entries(packageConfig)
		  .reduce( (config, [key, value]) =>
		  		replaceAll(config, CONF_MARKER + key, value),
				template
		  )

// Writes the config file to disk
const writeConfig = ({ configOutput, packagePath }) =>
	writeFile(join(packagePath, PACKAGE_NAME), configOutput, UTF)
		.then(display(configOutput))
		.then( SUCCESS, FAIL )

/*
    Pipe definitions
 */

// Splitted pipeline, runs for every <packagePath>
const pplProcess = pipe(
	Array.of([ packageConfig, deleteConfig ], configOutput, writeConfig),
	{ propNameInput: 'packagePath', measure: false, name: 'Process' }
)

pipe(
	Array.of(template, [ entryPath, pplProcess ] ),
	{ propNameInput: 'path', processInSync: true, measure: true, name: 'Main' }
)
	.execute(PATH_PACKAGES)
	.then( exitCode => `Success: ${exitCode}` )
	.then( writeLog, writeError )
