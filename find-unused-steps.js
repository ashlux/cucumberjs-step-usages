const _ = require("lodash");

const usages = {};

module.exports = function () {
    function monkeyPatch(funcToMonkeyPatch) {
        return _.wrap(funcToMonkeyPatch, function (givenFn, matcher, stepFn) {
            const that = this;
            usages[matcher] = 0;
            const stepFnWrapped = _.wrap(stepFn, function () {
                const that = this;
                usages[matcher] = usages[matcher] + 1;
                return stepFn.apply(that, arguments);
            });
            return givenFn.call(that, matcher, stepFnWrapped);
        });
    }

    this.Given = monkeyPatch(this.Given);
    this.When = monkeyPatch(this.When);
    this.Then = monkeyPatch(this.Then);

    this.registerHandler('AfterFeatures', function (features, callback) {
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

        console.info("Usages", usages);
        _.forEach(_.keys(usages), function (matcher) {
            if (usages[matcher] === 0) {
                console.info(`Step ${matcher} is not used.`)
            }
        });

        callback();
    });
};
