# Silken

[![NPM Version][npm-image]][npm-url]

Gracefully pm2 restart

## Installation

```bash
npm i silken -S
npm i silken -g
```

## Usage

```javascript
const express = require('express');
const app = express();
app.use(silken(app));
// app.use(silken(app, { path: 'get_number' }));
```

then you can get number on handling by request `http://localhost:3000/silken_handling`

### start app

```bash
silk start <id>
```

### restart app

```bash
silk restart <id>
```

[npm-image]: https://img.shields.io/npm/v/silken.svg
[npm-url]: https://www.npmjs.com/package/silken
