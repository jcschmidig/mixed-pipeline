# Pipeline to process ordered synchronous and asynchronous functions

![node-current](https://img.shields.io/node/v/mixed-pipeline) ![GitHub package.json version](https://img.shields.io/github/package-json/v/jcschmidig/mixed-pipeline)

### 1. Overview

Have you ever landed in the promise hell? Especially mixing synchronous and asynchronous functions?

In this case, this module might be of some help for you.
It has two parts:
- Building the pipeline and
- executing the pipeline (reusable)

You can use direct or promise based functions as you would use synchronous ones and error checking is included behind the scenes.

Just write pure functions and let the pipeline handle the rest.

### 2. Prerequisites

This package needs node version 12 or higher.

### 3. Installation

`npm install mixed-pipeline`

### 4. Initialization

`const pipe = require('mixed-pipeline/v4')`

or

`const { v4:pipe } = require('mixed-pipeline')`

### 5. API
#### 5.1 Building the Pipeline

The pipeline constructor accepts two positioned arguments
- an input as an array of the following structure
    - `<func>`: a simple function to execute, storing its result in an object under `<func.name>`
    - `[<func>, ...]`: an array of functions executed simultaneously
    - `[<func>, <pipeline>, ...]`: an array of one function and one or more other pipelines executed simultaneously.
    the function should return an array of values which are launched with every pipeline and which appear in the corresponding pipeline as { execute } property
    - `<label>`: invokes the traceHandler with the given label to output the current pipeline's results
    - `[<label>, <func>, ...]`: invokes the traceHandler and outputs only the properties of the given function(s).
- an object with the following options
    - `summary` (default: false): outputs at the end a table of all collected values through the traceHandler
    - `traceHandler` (default: console.debug): function to output collected values
    - `errHandler` (default: console.error): function to report errors

#### 5.2 Executing the Pipeline
- `execute(input)`: Executes the pipeline with the given input. This input appears as { execute } property in all functions of this pipeline. It is guarenteed that every line of the array is properly awaited before the next line is executed.

#### 5.3 Breaking conditions
- Any error catched by the pipeline aborts the pipeline currently being executed.

### 6 Example

The repo contains an example in (v4/example). To see it in action
- clone the repo
- run `npm install`
- run `npm run test:v4`

It reads the directory structure and writes several config.json file by merging a template with the corresponding config options.

#### 6.1 Simplified example

```
import fs from 'fs/promises'
import pipeline from 'mixed-pipeline/v4'

pipeline([
    getTemplate,
    [ "template", getTemplate ],
    [ findPaths, pipeline([ writeConfig ]) ]
], { summary: true }
).execute("/myPath")     // starts the pipeline with the given path

function getTemplate({ execute:path }) {
    return fs.readFile(path+'/template.json')
}

function findPaths({ execute:path }) {
    return fs.readdir(path)
}

function writeConfig({ execute:subPath, getTemplate:template }) {
    return fs.writeFile(subPath+'/config.json', template)
}
```
