# Silken

[![NPM Version][npm-image]][npm-url]

Get number of the current request being served

## Installation

```bash
npm i silken -S
```

## Usage

```javascript
const express = require('express');
const app = express();
app.use(silken(app));
// app.use(silken(app, { path: 'get_number' }));
```

then you can get number on handling by request `http://localhost:3000/handling`

[npm-image]: https://img.shields.io/npm/v/silken.svg
[npm-url]: https://www.npmjs.com/package/silken
