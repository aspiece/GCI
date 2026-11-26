const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const logic = require('../assets/model_rescue_logic.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'Model_Rescue_Simulation.html'), 'utf8');
const defs = html.slice(html.indexOf('var TRAIN_V1'), html.indexOf('var logic'));
const functions = html.slice(html.indexOf('function score(preds)'), html.indexOf('function getStudentPredictionArray'));
const {TRAIN_V1, TEST, IMPROVEMENTS, predictLabel, compareWithV2} =
  new Function(defs + functions + 'return {TRAIN_V1,TEST,IMPROVEMENTS,predictLabel,compareWithV2};')();
test('rescue records remain separate from the six development comparison records', () => {
  const trainKeys = [...TRAIN_V1, ...IMPROVEMENTS].map(r => JSON.stringify(r.f));
  assert.equal(new Set(trainKeys).size, trainKeys.length);
  assert.equal(TEST.length, 6);
  assert.ok(TEST.every(r => !trainKeys.includes(JSON.stringify(r.f))));
  assert.deepEqual(TEST.map(r=>r.f), [[6,5,6,5],[5,6,5,6],[7,7,6,7],[3,3,4,3],[8,7,8,8],[5,5,5,5]]);
  const boundary = logic.computeDecisionBoundary(TRAIN_V1,predictLabel);
  for(const id of ['I2','I5','I7']) {
    assert.equal(logic.classifyRescueRecord(IMPROVEMENTS.find(r=>r.id===id),TRAIN_V1,boundary).category,'direct');
  }
});
test('all 56 distinct rescue combinations produce valid, non-guaranteed improvement', () => {
  const scores = {};
  let total = 0;
  for(let i=0;i<8;i++) for(let j=i+1;j<8;j++) for(let k=j+1;k<8;k++) {
    const comparison = compareWithV2([i,j,k].map(n=>IMPROVEMENTS[n].id));
    assert.equal(comparison.v1Score,3);
    assert.equal(comparison.v2.length,6);
    assert.ok(comparison.v2Score>=0 && comparison.v2Score<=6);
    scores[comparison.v2Score]=(scores[comparison.v2Score]||0)+1;
    total++;
  }
  assert.equal(total,56);
  assert.deepEqual(scores, {3:10,4:30,5:10,6:6});
  assert.equal(compareWithV2(['I2','I5','I7']).v2Score,6);
});
test('old saved comparisons are invalidated without deleting prior practice or written notes', () => {
  const migrate = new Function('var DATASET_VERSION=3;'+html.slice(html.indexOf('function migrateDatasetState'),html.indexOf('var state = loadState()'))+'return migrateDatasetState;')();
  const saved = {datasetVersion:2,currentStage:8,completedStages:[0,1,2,3,4,5,6,7,8],selectedImprovements:['I2','I5','I7'],compare:{v2Score:6},improvementApplied:true,reflections:{performance:'better',recordReason:'old',fix:'draft notes',evidence:'old evidence',oversight:'human review'},studentPredictions:{X1:'Needs Review'}};
  const migrated = migrate(saved);
  assert.equal(migrated.currentStage,5);
  assert.equal(migrated.compare,null);
  assert.deepEqual(migrated.completedStages,[0,1,2,3,4]);
  assert.deepEqual(migrated.selectedImprovements,[]);
  assert.equal(migrated.reflections.fix,'draft notes');
  assert.equal(migrated.studentPredictions.X1,'Needs Review');
  assert.equal(migrate(migrated),migrated);
});
test('the activity and report distinguish development comparison from independent evaluation', () => {
  assert.ok(html.includes('development comparison, not a final independent test'));
  assert.ok(html.includes('Evaluation limit: these six practice records helped guide the rescue'));
});
