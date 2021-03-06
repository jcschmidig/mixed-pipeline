# Pipeline to process ordered synchronous and asynchronous functions

![node-current](https://img.shields.io/node/v/mixed-pipeline) ![GitHub package.json version](https://img.shields.io/badge/version-3.4.9-blue)

### 1. Overview

Have you ever landed in the promise hell? Especially mixing synchronous and asynchronous functions?

In this case, this module might be of some help for you.
It has two parts:
- Building the pipeline and
- executing the pipeline (reusable)

The result of the previous function is always injected into the next function(s) of the pipeline.
You can use promise based functions as you would use synchronous ones and error checking is included behind the scenes.

Just write pure functions and let the pipeline handle the rest.

### 2. Prerequisites

This package needs node version 12 or higher.

### 3. Installation

`npm install mixed-pipeline`

### 4. Initialization

`const pipe = require('mixed-pipeline')`

### 5. API
#### 5.1 Building the Pipeline
- `*constructor(<errHandler>)`: adds a custom errorHandler to the pipeline (default: `console.error`).
- `run(<function>, ...)`: runs the function(s) in the pipeline. All these functions will be executed concurrently and get the same input from the previous function(s). The output goes to the following function(s) in the same order.
- `runShadow(<function>, ...)`: runs the function(s) without changing the pipeline's input and output.
- `store(<function>, ...)`: stores the output of the concurrently executed function(s) as an intermediate result without injecting the output to the pipeline.
- `restore(<function>, ...)`: adds the output of the previously stored function(s) to the pipeline as if it had been produced concurrently with the function(s) before.
- `split(<pipeline>, ...)`: adds new pipelines which will be executed for every element of the output array of the previous function.
- `trace("<comment>")`: uses `console.debug` to show the `<comment>` with the input parameters being consumed by the next method.<br>

#### 5.2 Executing the Pipeline
- `execute(input)`: Executes the pipeline with the given input. This input is also given to any following function(s) as last argument.

#### 5.3 Breaking conditions
- Any error catched by the pipeline aborts the pipeline currently being executed.
- Any function returning `null` aborts the pipeline currently being executed.

### 6 Example

The repo contains an example in (v3/example). To see it in action
- clone the repo
- run `npm install`
- run `npm run test`

It reads the directory structure and writes several config.json file by merging a template with the corresponding config options.

#### 6.1 Simplified example

```
import fs from 'fs/promises'
import pipeline from 'mixed-pipeline'

pipeline()
    .store(getTemplate)
    .run(findPaths)     // returns an array of subPaths
    .split(pipeline()   // executes a new pipeline for every subPath
        .restore(getTemplate)
        .runShadow(writeConfig)
    )
.execute("/myPath")     // starts the pipeline with the given path

function getTemplate(path) {
    return fs.readFile(path+'/template.json')
}

function findPaths(path) {
    return fs.readdir(path)
}

function writeConfig(subPath, template) {
    return fs.writeFile(subPath+'/config.json', template)
}
```
