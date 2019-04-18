# Silken

[![NPM Version][npm-image]][npm-url]
[![Node Version][node-image]][node-url]

Gracefully restart tool binding with [`pm2`](https://pm2.io/) for Node.JS app.

## Installation

in your application

```bash
npm i silken -S
```

on your machine

```
npm i silken -g
```

## Usage

in your application

```javascript
const express = require('express');
const app = express();
app.use(silken(app));
```

on your machine

```
Usage: silk [options]

Options:
  -V, --version  output the version number
  restart <id>   restart app gracefully
  stop <id>      stop health check
  start <id>     start health check
  show <id>      show status
  list           list all
  list <id>      list by id
  -h, --help     output usage information
```

## Notes

You can replace `pm2 restart <id>` with `silk restart <id>`

When you restart the app by silk

it goes through "stop health check -> waiting for handling finished -> restart app -> start health check -> restart ok"

[npm-image]: https://img.shields.io/npm/v/silken.svg
[npm-url]: https://www.npmjs.com/package/silken
[node-image]: https://img.shields.io/badge/node.js-%3E=8-brightgreen.svg
[node-url]: https://nodejs.org/download/
