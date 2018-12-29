require('colors');

const _ = require("lodash");

const usages = {
    // string coerced regexp: {usageCount, regexp}
};

function startTrackingUsages(cucumberRuntime) {
    function monkeyPatch(funcToMonkeyPatch) {
        return _.wrap(funcToMonkeyPatch, function (givenFn, regexp, stepFn) {
            const that = this;
            usages[String(regexp)] = {
                usageCount: 0,
                regexp: regexp
            };
            return givenFn.call(that, regexp, stepFn);
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
                _.forEach(usages, function (usage) {
                    if (usage.regexp.test(step.getName())) {
                        usage.usageCount = usage.usageCount + 1;
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

            const unusedSteps = _.keys(_.pickBy(usages, function (usage) {
                return usage.usageCount === 0;
            }));

            if (unusedSteps.length) {
                console.info("\nUnused steps have been found:\n\n".bold.underline.red);
                _.forEach(unusedSteps, function (unusedStep, index) {
                    let number = (index + 1 + ". ").bold.red;
                    console.info(number + unusedStep.red);
                });
            }

            callback();
        });
    }
};
