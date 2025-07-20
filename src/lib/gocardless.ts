import * as constants from 'gocardless-nodejs/constants';
// eslint-disable-next-line
const GoCardless = require('gocardless-nodejs');

if (!process.env.GOCARDLESS_ACCESS_TOKEN) {
  throw new Error('Missing gocardless access token');
}

const constant = process.env.NODE_ENV === 'production' ? constants.Environments.Live : constants.Environments.Sandbox;
export const goCardless = GoCardless(process.env.GOCARDLESS_ACCESS_TOKEN, constant);