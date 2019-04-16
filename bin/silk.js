#!/usr/bin/env node
const chalk = require('chalk');
const program = require('commander');
const http = require('follow-redirects').http;
const { exec } = require('child_process');
const pkg = require('../package');

program
  .version(pkg.version)
  .option('restart <id>', 'restart app gracefully')
  .option('stop <id>', 'stop health check')
  .option('start <id>', 'start health check')
  .option('show <id>', 'show status')
  .option('list', 'pm2 list')
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
    status(id);
    break;
  case 'list':
    exec('pm2 list', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      stdout && console.log(`${stdout}`);
      stderr && console.error(`${stderr}`);
    });
    break;
  default:
    console.log(chalk.yellow('Unknown command'));
    program.outputHelp();
}

async function restart(id) {
  let srv = await getSrvById(id);
  await req(srv + '/silken_stop');
  let c = Number(await req(srv + '/silken_handling'));
  while (c > 0) {
    await sleep();
    c = Number(await req(srv + '/silken_handling'));
    console.log(chalk.blue(`on handling: ${c}`));
  }
  // await pm2Restart(id);
  pm2Restart(id);
  await sleep(3000);
  await req(srv + '/silken_start');
  let h = await req(srv + '/health');
  console.log(h.includes('stopped') ? chalk.red(h) : chalk.green(h));
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
