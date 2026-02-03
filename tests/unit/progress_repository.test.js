const test = require('node:test');
const assert = require('node:assert/strict');

const { LocalProgressRepository } = require('../../progress_repository');
const { createFsStub } = require('./helpers/main_context');

test('LocalProgressRepository reads empty object when file is missing', () => {
  const fsStub = createFsStub();
  const repo = new LocalProgressRepository({
    filePath: '/tmp/progress.json',
    fs: fsStub,
  });

  assert.deepEqual(repo.read(), {});
});

test('LocalProgressRepository writes atomically and reads back', () => {
  const fsStub = createFsStub();
  const repo = new LocalProgressRepository({
    filePath: '/tmp/progress.json',
    fs: fsStub,
  });

  repo.write({ totalXp: 7 });

  assert.equal(fsStub.writes.length, 1);
  assert.equal(fsStub.renameCalls.length, 1);
  assert.equal(fsStub.renameCalls[0].from, '/tmp/progress.json.tmp');
  assert.equal(fsStub.renameCalls[0].to, '/tmp/progress.json');
  assert.equal(JSON.parse(fsStub.store.get('/tmp/progress.json')).totalXp, 7);

  const loaded = repo.read();
  assert.equal(loaded.totalXp, 7);
});
