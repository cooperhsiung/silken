#!/usr/bin/env node
const chalk = require('chalk');
const Table = require('cli-table');
const program = require('commander');
const http = require('follow-redirects').http;
const { exec } = require('child_process');
const logUpdate = require('log-update');

const pkg = require('../package');

program
  .version(pkg.version)
  .option('restart <id>', 'restart app gracefully')
  .option('stop <id>', 'stop health check')
  .option('start <id>', 'start health check')
  .option('show <id>', 'show status')
  .option('list', 'list all')
  .option('list <id>', 'list by id')
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

const cmd = program.rawArgs[2];
const id = program.rawArgs[3];

switch (cmd) {
  case 'restart':
    restart(id);
    break;
  case 'stop':
    stop(id);
    break;
  case 'start':
    start(id);
    break;
  case 'show':
    listTable(id);
    break;
  case 'list':
    listTable(id);
    break;
  default:
    console.log(chalk.yellow('Unknown command'));
    program.outputHelp();
}

const frames = ['-', '\\', '|', '/'];

async function restart(id) {
  let i = 0;
  let log = { text: 'gogogo' };

  let looper = setInterval(() => {
    const frame = frames[(i = ++i % frames.length)];
    logUpdate(`${frame} ${log.text}`);
  }, 120);

  log.text = 'stop health check ...';
  let srv = await getSrvById(id);
  await req(srv + '/silken_stop');
  await sleep(3000);
  log.text = 'waiting for handling finished ...';
  await sleep(1000);
  let c = Number(await req(srv + '/silken_handling'));
  while (c > 0) {
    await sleep();
    c = Number(await req(srv + '/silken_handling'));
    log.text = `waiting for handling[${c}] finished ...`;
  }
  log.text = `restart app ...`;
  await pm2Restart(id);
  await sleep(3000);
  log.text = `start health check ...`;
  await req(srv + '/silken_start');
  await sleep(1000);
  logUpdate(`√  restart [${id}] ok`);
  clearInterval(looper);
  listTable(id);
}

async function stop(id) {
  let srv = await getSrvById(id);
  await req(srv + '/silken_stop');
}

async function start(id) {
  let srv = await getSrvById(id);
  await req(srv + '/silken_start');
}

async function status(id) {
  try {
    let srv = await getSrvById(id);
    let h = await req(srv + '/health');
    let c = await req(srv + '/silken_handling');
    console.log(chalk.gray('----------------------------'));
    console.log(
      chalk.gray('|'),
      chalk.cyan('health state'),
      chalk.gray('|'),
      h.includes('stopped') ? chalk.red(h) : chalk.green(h),
      chalk.gray('|')
    );
    console.log(chalk.gray('|'), chalk.cyan('on handling '), chalk.gray('|'), c, chalk.gray('        |'));
    console.log(chalk.gray('----------------------------'));
  } catch (e) {
    console.log(chalk.red(e.message));
  }
}

function pm2Restart(id) {
  return new Promise(function(resolve, reject) {
    exec('pm2 restart ' + id, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(error);
        return;
      }
      // stdout && console.log(`${stdout}`);
      stderr && console.error(`${stderr}`);
      resolve();
    });
  });
}

function getSrvById(id) {
  return new Promise(function(resolve, reject) {
    exec('pm2 jlist', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject(error);
      }
      stderr && console.error(`${stderr}`);
      const data = JSON.parse(stdout);
      let app = data.find(e => String(e.pm2_env.pm_id) === id);
      if (app) {
        let slice = app.name.split('-');
        let port = slice[slice.length - 1];
        if (isNaN(port)) {
          return reject("service must end with '-<port>'");
        }
        resolve(`http://localhost:${port}`);
      } else {
        reject('service id `' + id + '` dose not exists');
      }
    });
  });
}

async function listTable(id) {
  try {
    const table = new Table({
      head: ['App name', 'id', 'health check', 'restart', 'handling'],
      truncate: '…',
      style: { 'padding-left': 1, head: ['cyan', 'bold'], compact: true }
    });
    let data = await getSilkList(id);
    data.forEach(e => {
      table.push([
        chalk.cyan.bold(e.name),
        e.id,
        e.status.includes('stopped') ? chalk.red(e.status) : chalk.green(e.status),
        e.restart,
        e.handling
      ]);
    });
    console.log(table.toString());
  } catch (e) {
    console.error(e);
  }
}

async function getSilkList(id) {
  try {
    let list = await getPM2List(id);
    return fillSilkList(list);
  } catch (e) {
    console.error(e);
  }
}

// App name, id, status, handling

async function fillSilkList(list) {
  try {
    let filledList = [];
    for (let e of list) {
      let handling = await req(`http://localhost:${e.port}/silken_handling`);
      if (handling) {
        let status = await req(`http://localhost:${e.port}/health`);
        filledList.push(Object.assign(e, { status, handling }));
      }
    }
    return filledList;
  } catch (e) {
    console.error(e);
  }
}

function getPM2List(id) {
  return new Promise(function(resolve, reject) {
    exec('pm2 jlist', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject(error);
      }
      stderr && console.error(`${stderr}`);
      const data = JSON.parse(stdout);

      if (id) {
        let app = data.find(e => String(e.pm2_env.pm_id) === id);
        if (app) {
          let slice = app.name.split('-');
          let port = slice[slice.length - 1];
          if (isNaN(port)) {
            return reject("service must end with '-<port>'");
          }
          return resolve([
            {
              name: app.name,
              id: app.pm_id,
              port: slice[slice.length - 1],
              status: app.pm2_env.status,
              restart: app.pm2_env.restart_time,
              handling: '-'
            }
          ]);
        } else {
          return reject('service id `' + id + '` dose not exists');
        }
      }

      let silkList = [];
      data.forEach(e => {
        if (e.name.match(/.*-\d+/)) {
          let slice = e.name.split('-');
          silkList.push({
            name: e.name,
            id: e.pm_id,
            port: slice[slice.length - 1],
            status: e.pm2_env.status,
            restart: e.pm2_env.restart_time,
            handling: '-'
          });
        }
      });
      resolve(silkList);
    });
  });
}

function req(url) {
  return new Promise(function(resolve, reject) {
    http
      .get(url, res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(data);
        });
      })
      .on('error', err => {
        console.log('Error: ' + err.message);
      });
  });
}

function sleep(delay = 1000) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

// silk restart 2

// silk stop 1

// silk start 2

// silk status 2
