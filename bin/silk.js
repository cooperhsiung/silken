#!/usr/bin/env node
const pm2 = require('pm2');
const chalk = require('chalk');
const program = require('commander');
const request = require('request-promise');
const { exec } = require('child_process');

program
  .option('restart <id>', 'restart pm2 app gracefully')
  .option('stop <id>', 'stop health check')
  .option('start <id>', 'start health check')
  .option('status <id>', 'show status')
  .option('list', 'pm2 list')
  .parse(process.argv);

const cmd = program.rawArgs[2];
const id = program.rawArgs[3];

(async () => {
  switch (cmd) {
    case 'restart':
      await restart(id);
      break;
    case 'stop':
      await stop(id);
      break;
    case 'start':
      await start(id);
      break;
    case 'status':
      await status(id);
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
      console.log(chalk.yellow('unknown command, try `silk --help`'));
  }
})().catch(e => console.log(chalk.red(e)));

async function restart(id) {
  let srv = await getSrvById(id);
  await request(srv + '/silken_stop');
  let c = Number(await request(srv + '/silken_handling'));
  while (c > 0) {
    await sleep();
    c = Number(await request(srv + '/silken_handling'));
    console.log(chalk.blue(`on handling: ${c}`));
  }
  await pm2_restart(id);
  await sleep(2000);
  await request(srv + '/silken_start');
  let h = await request(srv + '/health');
  console.log(chalk.green(h));
}

async function stop(id) {
  let srv = await getSrvById(id);
  await request(srv + '/silken_stop');
}

async function start(id) {
  let srv = await getSrvById(id);
  await request(srv + '/silken_start');
}

async function health(id) {
  let srv = await getSrvById(id);
  return request(srv + '/health');
}

async function count(id) {
  let srv = await getSrvById(id);
  return request(srv + '/silken_handling');
}

async function status(id) {
  try {
    let srv = await getSrvById(id);
    let h = await request(srv + '/health');
    let c = await request(srv + '/silken_handling');
    console.log(chalk.cyan(`health state: ${h}`));
    console.log(chalk.blue(`on handling: ${c}`));
  } catch (e) {
    console.log(chalk.red(e.message));
  }
}

function pm2_restart(id) {
  return new Promise(function(resolve, reject) {
    exec('pm2 restart ' + id, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(error);
        return;
      }
      stdout && console.log(`${stdout}`);
      stderr && console.error(`${stderr}`);
      resolve();
    });
  });
}

function getSrvById(id) {
  return new Promise(function(resolve, reject) {
    pm2.connect(() => {
      pm2.list((err, data) => {
        pm2.disconnect();
        if (err) {
          return reject(err);
        }
        let app = data.find(e => e.pm2_env.pm_id == id);
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
  });
}

function sleep(delay = 1000) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

// silk restart 2

// silk stop 1

// silk start 2

// silk status 2
