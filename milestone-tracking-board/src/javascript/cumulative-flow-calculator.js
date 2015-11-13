Ext.define('MilestoneTrackingApp.CFDCalculator', {
    extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',
    config: {
        stateFieldName: 'ScheduleState',
        stateFieldValues: ['Defined', 'In-Progress', 'Completed', 'Accepted']
    },

    constructor: function(config) {
        this.initConfig(config);
        this.callParent(arguments);
    },
    runCalculation: function (snapshots) {
        console.log('snapshots',snapshots);
        var calculatorConfig = this._prepareCalculatorConfig(),
            seriesConfig = this._buildSeriesConfig(calculatorConfig);

        var calculator = this.prepareCalculator(calculatorConfig);
        calculator.addSnapshots(snapshots, this._getStartDate(snapshots), this._getEndDate(snapshots));

        return this._transformLumenizeDataToHighchartsSeries(calculator, seriesConfig);
    },
    getMetrics: function() {
        return _.map(this.getStateFieldValues(), function(stateFieldValue) {
            return  {
                as: stateFieldValue,
                groupByField: this.getStateFieldName(),
                allowedValues: [stateFieldValue],
                f: 'groupByCount',
                display: 'area'
            };
        }, this);
    }
});