const _ = require("lodash");

const usages = {};

function startTrackingUsages(cucumberRuntime) {
    function monkeyPatch(funcToMonkeyPatch) {
        return _.wrap(funcToMonkeyPatch, function (givenFn, matcher, stepFn) {
            const that = this;
            usages[matcher] = 0;
            return givenFn.call(that, matcher, stepFn);
        });
    }

    cucumberRuntime.Given = monkeyPatch(cucumberRuntime.Given);
    cucumberRuntime.When = monkeyPatch(cucumberRuntime.When);
    cucumberRuntime.Then = monkeyPatch(cucumberRuntime.Then);
}

function calculateUsages(features) {
    _.forEach(features, function (feature) {
        _.forEach(feature.getScenarios(), function (scenario) {
            _.forEach(scenario.getSteps(), function (step) {
                _.forEach(_.keys(usages), function (matcher) {
                    if (new RegExp(matcher.substring(1, matcher.length - 1)).test(step.getName())) {
                        usages[matcher] = usages[matcher] + 1;
                    }
                });
            });
        });
    });

    return usages;
}

module.exports = {
    findUnusedSteps: function (cucumberRuntime) {
        startTrackingUsages(cucumberRuntime);

        cucumberRuntime.registerHandler('AfterFeatures', function (features, callback) {
            calculateUsages(features);

            const unusedSteps = _.keys(_.pickBy(usages, function (numberOfUsages) {
                return numberOfUsages === 0;
            }));

            if (unusedSteps.length) {
                console.info("\nUnused steps have been found:\n\n");
                _.forEach(unusedSteps, function(unusedStep, index) {
                    console.info((index + 1) + ". " + unusedStep);
                });
            }

            callback();
        });
    }
};
