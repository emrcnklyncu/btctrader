/**
 * Module dependencies.
 */
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const flash = require('express-flash');
const cron = require('node-cron');
const chalk = require('chalk');
const path = require('path');
const pug = require('pug');
const crypto = require('crypto');
const package = require('../package.json');

/**
 * Import libraries.
 */
const util = require('../libraries/util')();
const database = require('../libraries/database')();
const client = require('../libraries/client')(database.getConfig('key'), database.getConfig('secret'));
const constant = require('../libraries/constant');

/**
 * Set timezone.
 */
process.env.TZ = database.getConfig('timezone');

/**
 * Create Express app.
 */
const app = express();

/**
 * Express configuration.
 */
app.set('host', process.env.HOST || '0.0.0.0');
app.set('port', process.env.PORT || database.getConfig('port') || 3000);
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '..', 'views'));
app.use('/', express.static(path.join(__dirname, '..', 'public'), {maxAge: 31557600000}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(flash());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: constant.SESSION_SECRET,
  cookie: {maxAge: 1209600000}, // two weeks in milliseconds
}));
app.use((req, res, next) => {
  var auth = req.cookies['auth'];
  if (auth) {
    if ('/logout' == req.path) {
      res.clearCookie('auth');
      return res.redirect('/');
    }
    let decipher = crypto.createDecipher(constant.SESSION_ALGORITHM, constant.SESSION_SECRET);
    let usernameAndPassword = decipher.update(auth, 'hex', 'utf8') + decipher.final('utf8');
    if ((database.getConfig('username') + database.getConfig('password')) == usernameAndPassword) {
      res.locals.user = auth;
      if ('/login' == req.path) return res.redirect('/');
      return next();
    }
  }
  if ('/login' != req.path && '/' != req.path) return res.redirect('/');
  return next();
});

/**
 * Web app methods.
 */
app.locals.fn = {
  version: package.version,
  description: package.description,
  username: database.getConfig('username'),
  denominator: database.getConfig('denominator'),
  timeToDate : util.timeToDate,
  formatMoney : util.formatMoney
};

/**
 * Methods.
 */
let evaluatingSignals = async (signals) => {
  for (s in signals) {
    let signal = signals[s];
    database.pushSignal(signal);
    if (signal.buysignal && database.getConfig("allowbuy")) {
      await client.buy(signal, database.getConfig('amount'));
      await cleanUpTickers();
      await cleanUpBalances();
      //TODO: await cleanUpTrades();
    }
    else if (signal.sellsignal && database.getConfig("allowsell")) {
      await client.sell(signal);
      await cleanUpTickers();
      await cleanUpBalances();
      //TODO: await cleanUpTrades();
    }
  }
};

let cleanUpTickers = async () => {
  let tickers = await client.getTickers(database.getConfig('denominator'), database.getConfig('numerators'));
  database.setTickers(tickers);
};

let cleanUpBalances = async () => {
  let balances = await client.getBalances(database.getConfig('denominator'));
  database.setBalances(balances);
};

let cleanUpTrades = async () => {
  let trades = await client.getTrades(database.getConfig('denominator'), database.getConfig('numerators'));
  database.setTrades(trades);
};

/**
 * Run checker job.
 */
let checker = () => {
  cron.schedule("*/1 * * * *", async () => {
    try {
      await cleanUpTickers();
      await cleanUpBalances();
      await cleanUpTrades();
    } catch (e) {
      console.error(`${chalk.red.bold('error: an unknown error has occurred. please try again.')}`);
      console.error(e);
      return;
    }
  });
  cron.schedule("*/3 * * * *", async () => {
    try {
      let signals = await client.getSignalsFor3Mins(database.getConfig('denominator'), database.getConfig('numerators'));
      await evaluatingSignals(signals);
    } catch (e) {
      console.error(`${chalk.red.bold('error: an unknown error has occurred. please try again.')}`);
      console.error(e);
      return;
    }
  });
};

/**
 * Routes.
 */
app.get('/login', function(req, res) {
  res.render('login', { title: 'Authenticate User' });
});
app.post('/login', function(req, res) {
  let username = req.body.username,
      password = req.body.password;
  if (database.getConfig('username') == username && database.getConfig('password') == password) {
    let cipher = crypto.createCipher(constant.SESSION_ALGORITHM, constant.SESSION_SECRET);
    let auth = cipher.update(username + password, 'utf8', 'hex') + cipher.final('hex');
    res.cookie('auth', auth, {maxAge: 31557600000, httpOnly: true});
    res.redirect('/');
  } else {
    req.flash('error', {text: 'Username or password is incorrect.'});
    res.redirect('/login');
  }
});
app.get('/', async function(req, res) {
  try {
    let signals = database.getSignals();
    res.render('dashboard', { title: 'Dashboard', signals: signals });
  } catch(e) {
    console.error(e);
    res.status(500).send('server error');
  }
});
app.get('/trade', async function(req, res) {
  try {
    let trades = database.getTrades();
    res.render('trade', { title: 'Trade', trades: trades });
  } catch(e) {
    console.error(e);
    res.status(500).send('server error');
  }
});
app.get('/balance', async function(req, res) {
  try {
    let balances = database.getBalances();
    res.render('balance', { title: 'Balance', balances: balances });
  } catch(e) {
    console.error(e);
    res.status(500).send('server error');
  }
});

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
  console.log('---------------------------------------------------');
  console.log('%s App is running at http://localhost:%d', chalk.green('✓'), app.get('port'));
  console.log('---------------------------------------------------');
  checker();
});