const games = require('../services/game.service');

async function list(req, res) {
  res.json(await games.listMyGames(req.user.uid));
}

async function create(req, res) {
  res.status(201).json(await games.createGame(req.user, req.body || {}));
}

async function join(req, res) {
  res.json(await games.joinGame(req.user, req.body?.code));
}

async function get(req, res) {
  res.json(await games.getGame(req.user, req.params.id));
}

async function leave(req, res) {
  await games.leaveGame(req.user, req.params.id);
  res.status(204).end();
}

async function start(req, res) {
  res.json(await games.launchGame(req.user, req.params.id));
}

async function orders(req, res) {
  const { orders, ready } = req.body || {};
  res.json(await games.submitOrders(req.user, req.params.id, orders, ready));
}

async function tick(_req, res) {
  res.json(await games.tick());
}

module.exports = { list, create, join, get, leave, start, orders, tick };
