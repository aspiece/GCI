(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ModelRescueLogic = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function averageFeatureScore(features) {
    if (!Array.isArray(features) || features.length === 0) {
      return 0;
    }
    var total = 0;
    for (var i = 0; i < features.length; i++) {
      total += Number(features[i]) || 0;
    }
    return total / features.length;
  }

  function euclid(featuresA, featuresB) {
    var sum = 0;
    var length = Math.min(featuresA.length, featuresB.length);
    for (var i = 0; i < length; i++) {
      var delta = (Number(featuresA[i]) || 0) - (Number(featuresB[i]) || 0);
      sum += delta * delta;
    }
    return Math.sqrt(sum);
  }

  function buildVersionComparisonRows(testRecords, v1Predictions, v2Predictions) {
    return testRecords.map(function (record, index) {
      var v1Prediction = v1Predictions[index];
      var v2Prediction = v2Predictions[index];
      var v1Correct = v1Prediction === record.y;
      var v2Correct = v2Prediction === record.y;
      var changeLabel = 'Still incorrect';

      if (!v1Correct && v2Correct) {
        changeLabel = 'Fixed';
      } else if (v1Correct && v2Correct) {
        changeLabel = 'Still correct';
      } else if (v1Correct && !v2Correct) {
        changeLabel = 'New error';
      }

      return {
        id: record.id,
        actual: record.y,
        v1Prediction: v1Prediction,
        v1Correct: v1Correct,
        v2Prediction: v2Prediction,
        v2Correct: v2Correct,
        changeLabel: changeLabel
      };
    });
  }

  function summarizeVersionChanges(rows) {
    var summary = {
      fixed: 0,
      stillCorrect: 0,
      stillIncorrect: 0,
      newErrors: 0
    };

    rows.forEach(function (row) {
      if (row.changeLabel === 'Fixed') {
        summary.fixed += 1;
      } else if (row.changeLabel === 'Still correct') {
        summary.stillCorrect += 1;
      } else if (row.changeLabel === 'Still incorrect') {
        summary.stillIncorrect += 1;
      } else if (row.changeLabel === 'New error') {
        summary.newErrors += 1;
      }
    });

    return summary;
  }

  function computeDecisionBoundary(trainRecords, predictLabelFn) {
    var boundary = null;
    var previousLabel = null;

    for (var score = 0; score <= 10.001; score += 0.1) {
      var roundedScore = Math.round(score * 10) / 10;
      var syntheticPoint = [roundedScore, roundedScore, roundedScore, roundedScore];
      var label = predictLabelFn(trainRecords, syntheticPoint, 3);

      if (previousLabel && previousLabel !== label) {
        boundary = roundedScore;
        break;
      }
      previousLabel = label;
    }

    if (boundary === null) {
      boundary = 5;
    }
    return Math.round(boundary * 10) / 10;
  }

  function classifyRescueRecord(record, trainRecords, boundaryScore) {
    var avgScore = averageFeatureScore(record.f);
    var nearBoundary = Math.abs(avgScore - boundaryScore) <= 0.9;
    var sameLabelDistances = trainRecords
      .filter(function (item) {
        return item.y === record.y;
      })
      .map(function (item) {
        return euclid(item.f, record.f);
      });
    var nearestSameLabelDistance = sameLabelDistances.length ? Math.min.apply(null, sameLabelDistances) : Number.POSITIVE_INFINITY;

    var category = 'not-targeted';
    var reason = 'does not address the diagnosed weakness';

    if (record.y === 'Needs Review' && nearBoundary) {
      category = 'direct';
      reason = 'directly targets the diagnosed weak spot';
    } else if (record.y === 'Needs Review' && nearestSameLabelDistance > 1.1) {
      category = 'variety';
      reason = 'adds useful variety';
    } else if (nearestSameLabelDistance <= 1.1) {
      category = 'redundant';
      reason = 'is mostly redundant with examples already present';
    }

    return {
      id: record.id,
      avgScore: Math.round(avgScore * 100) / 100,
      nearestSameLabelDistance: Math.round(nearestSameLabelDistance * 100) / 100,
      nearBoundary: nearBoundary,
      category: category,
      reason: reason
    };
  }

  function summarizeRescueSet(analyses) {
    var counts = {
      direct: 0,
      variety: 0,
      redundant: 0,
      notTargeted: 0
    };

    analyses.forEach(function (analysis) {
      if (analysis.category === 'direct') {
        counts.direct += 1;
      } else if (analysis.category === 'variety') {
        counts.variety += 1;
      } else if (analysis.category === 'redundant') {
        counts.redundant += 1;
      } else {
        counts.notTargeted += 1;
      }
    });

    return {
      counts: counts,
      sentence: 'Your rescue set includes ' + counts.direct + ' records near the weak spot, ' +
        counts.variety + ' adding useful variety, ' +
        counts.redundant + ' mostly redundant, and ' +
        counts.notTargeted + ' that do not target the diagnosed weakness.'
    };
  }

  return {
    averageFeatureScore: averageFeatureScore,
    euclid: euclid,
    buildVersionComparisonRows: buildVersionComparisonRows,
    summarizeVersionChanges: summarizeVersionChanges,
    computeDecisionBoundary: computeDecisionBoundary,
    classifyRescueRecord: classifyRescueRecord,
    summarizeRescueSet: summarizeRescueSet
  };
}));
