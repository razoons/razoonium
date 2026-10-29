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

async function candidates(req, res) {
  res.json(await games.listCandidates(req.user, req.params.id));
}

async function addPlayer(req, res) {
  res.json(await games.addPlayer(req.user, req.params.id, req.body?.username));
}

async function get(req, res) {
  res.json(await games.getGame(req.user, req.params.id));
}

async function leave(req, res) {
  await games.leaveGame(req.user, req.params.id);
  res.status(204).end();
}

async function remove(req, res) {
  await games.deleteGame(req.user, req.params.id);
  res.status(204).end();
}

async function start(req, res) {
  res.json(await games.launchGame(req.user, req.params.id));
}

async function order(req, res) {
  res.json(await games.chooseOrder(req.user, req.params.id, req.body || {}));
}

async function action(req, res) {
  res.json(await games.act(req.user, req.params.id, req.body || {}));
}

async function wall(req, res) {
  res.json(await games.writeWall(req.user, req.params.id, req.body?.text));
}

async function ghost(req, res) {
  res.json(await games.ghostMove(req.user, req.params.id, req.body?.dest));
}

async function sight(req, res) {
  res.json(await games.requestSight(req.user, req.params.id));
}

async function sightAnswer(req, res) {
  res.json(await games.answerSight(req.user, req.params.id, req.params.player, req.body?.accept));
}

async function chat(req, res) {
  res.json(await games.postMessage(req.user, req.params.id, req.body?.text));
}

async function tick(_req, res) {
  res.json(await games.tick());
}

module.exports = { list, create, join, candidates, addPlayer, get, leave, remove, start, order, action, wall, ghost, sight, sightAnswer, chat, tick };
