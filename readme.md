# Pipeline to process ordered synchronous and asynchronous functions

### 1. Overview

Have you ever landed in the promise hell? Especially mixing synchronous and asynchronous functions?

In this case, this module might be of some help for you.
It has two parts:
- Building the pipeline and
- executing the pipeline (reusable)

The result of the previous function is always injected into the next function(s) of the pipeline.
You can use promise based functions as you would use synchronous ones and error checking is included behind the scenes.

Just write pure functions and let the pipeline handle the rest.

### 2. Installation

`npm install mixed-pipeline`

### 3. Initialization

`const pipe = require('mixed-pipeline')`

### 4. API
#### 4.1 Building the Pipeline
- `*constructor(<errorHander>)`: adds a custom errorHandler to the pipeline. Default is `console.error`.
- `add(<function>, ...)`: adds the function(s) to the pipeline. All these functions will be executed concurrently and get the same input from the previous function(s). The output goes to the following function(s) in the same order.
- `store(<function>)`: stores the output of the function as an intermediate result without injecting the output to the pipeline.
- `restore(<function>)`: adds the output of the previously stored function to the pipeline as if it had been produced concurrently with the function before.
- `split(<pipeline>)`: adds a new pipeline which will be executed for every element of the output array of previous function(s).

#### 4.2 Executing the Pipeline
- `execute(input)`: Executes the pipeline with the given input. This input is also given to any following function(s) as last argument.

#### 4.3 Breaking conditions
- Any error catched by the pipeline aborts the pipeline currently being executed.
- Any function returning `null` aborts the pipeline currently being executed.

### 5 Example

The repo contains an example. To see it in action
- clone the repo
- run `npm run example`

It reads the directory structure and writes several config.json file by merging a template with the corresponding config options.
