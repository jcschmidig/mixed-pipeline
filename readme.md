# Pipeline to process ordered synchronous and asynchronous functions

#### 1. Overview

Have you ever landed in the promise hell? Especially mixing synchronous and asynchronous functions?

In this case, this module might be of some help for you.
It has two parts:
- Building the pipeline and
- executing the pipeline (reusable)

The result of the previous function is always injected into the next function(s) of the pipeline.
You can use promise based functions as you would use synchronous ones and error checking is included behind the scenes.

Just write pure functions and let the pipeline handle the rest.

#### 2. Installation

`npm install mixed-pipeline`

#### 3. Initialization

`const pipe = require('mixed-pipeline')`

#### 4. API
#### 4.1 Building the Pipeline
- `*constructor(<errorHander>)`: adds a custom errorHandler to the pipeline.
- `add(<function>, ...)`: adds the function(s) to the pipeline. All these functions will be executed concurrently and get the same input from the previous function(s). The output goes to the following function(s) in the same order.
- `store(<function>)`: stores the output of the function as an intermediate result without injecting the output to the pipeline.
- `restore(<function>)`: adds the output of the previously stored function to the pipeline as if it had been produced concurrently with the function before.
- `dive(<pipeline>)`: adds a new pipeline which will be executed with the output of the previous function(s).

#### 4.2 Executing the Pipeline
- `execute(input)`: Executes the pipeline with the given input. This input is also given to any following function(s) as last argument.

#### 4.3 Breaking conditions
- Any catched error by the pipeline aborts the currently being executed pipeline.
- Any function returning `null` aborts the currently being executed pipeline.

#### 5 Example
```
const path = require('path')
const fs = require('fs/promises')
const pipe = require('mixed-pipeline')
//
const getTemplate = dir =>
    fs.readFile(path.join(dir, "template"))

const findPackages = dir =>
    fs.readdir(dir, { withFileTypes: true })

const getPaths = (entries, dir) =>
	entries
		.filter(entry => entry.isDirectory())
		.map(entry => fs.join(dir, entry.name))

const getConfig = (packagePath) =>
    require(fs.join(packagePath, "config"))

const convertConfig = (config, template) =>
	template = template.replace(config.key, config. value)

const writeConfig = (configOutput, packagePath) =>
	fs.writeFile(fs.join(packagePath, "package.json"), configOutput)
//
const pl = pipe(console.error)
    .store(getTemplate)
    .add(findPackages)
    .add(getPaths)
    .dive( pipe()
        .add(getConfig)
        .restore(getTemplate)
        .add(convertConfig)
        .add(writeConfig) )

pl.execute(path.join(__dirname, 'packages')


```
