module.exports = {
  PERIODS: [1,2,3,4,6,12,24],
  ACCEPTABLE_NUMERATORS: ['BTC','ADA','LINK','ATOM','DASH','EOS','ETH','LTC','NEO','DOT','XRP','XLM','XTZ','TRX','UNI','USDC'],
  ACCEPTABLE_DENOMINATORS : 'USDT,TRY',
  DEFAULT_DENOMINATOR : 'USDT',
  DEFAULT_EXPRESSION : '*/3 * * * *',
  DEFAULT_ORDER_AMOUNT : 20,
  STATUS_BEGINNED: 'beginned',
  STATUS_CONNECTED : 'connected',
  STATUS_CONFIGURED : 'configured',
  STATUS_STARTED : 'started',
  STATUS_STOPPED : 'stopped',
  STATUS_RESTARTED : 'restarted',
  DEFAULT_USERNAME: 'CHANGEME',
  DEFAULT_PASSWORD: 'CHANGEME',
  DEFAULT_PORT: 3000,
  DEFAULT_TIMEZONE: 'Europe/Istanbul'
};