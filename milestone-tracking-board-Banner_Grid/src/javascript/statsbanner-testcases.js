(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * shows accepted work units for timebox
     */
    Ext.define('MilestoneTrackingApp.TestCases', {
        extend: 'MilestoneTrackingApp.ConfigurableGauge',
        alias:'widget.statsbannertestcases',

        config: {
            data: {
                percentage: 0,
                calculatedUnits: 0,
                totalUnits: 0,
                title: 'Test Status'
            }
        },

        initComponent: function() {
            Ext.QuickTips.init();
            this.callParent(arguments);
            this.mon(this.testCaseStore,'datachanged', this.onDataChanged, this);

        },
        _getRenderData: function() {
            var total = 0,
                passed = 0,
                executed = 0,
                failed = 0,
                testCaseTypes = this.testCaseTypes || [],
                workProducts = _.filter(this.store.getRange(), function(r){ return r.get('_type') === 'hierarchicalrequirement'});
                workProducts = _.map(workProducts, function(wp){
                    return wp.get('ObjectID');
                });

                var testCases = _.filter(this.testCaseStore.getRange(), function(tc){
                    if (Ext.Array.contains(workProducts, tc.get('WorkProduct').ObjectID) &&
                        (testCaseTypes.length === 0 || Ext.Array.contains(testCaseTypes, tc.get('Type')))){
                        return true;
                    }
                    return false;
                });

            Ext.Array.each(testCases, function(r) {
                var runBeforeMilestoneTarget = r.get('LastRun') &&
                        r.get('_milestoneTargetDate') &&
                    r.get('LastRun') < r.get('_milestoneTargetDate');
                
                if (r.get('_resultsTotal') &&
                        r.get('_resultsTotal') === r.get('_resultsWithAttachments') &&
                        runBeforeMilestoneTarget) {
                    executed++;
                    if (r.get('LastVerdict') === "Pass") {
                        passed++;
                    }
                    if (r.get('LastVerdict') === "Fail"){
                        failed++;
                    }
                }
                total++;
            });

            var data = [{
                    name: 'Total',
                    y: total - executed,
                    color: Rally.util.Colors.grey1
                },{
                    name: 'Others',
                    y: executed - passed - failed,
                    color: "#FAD200"
                },{
                    name: 'Passed',
                    y: passed,
                    color: '#8DC63F'
                },{
                    name: 'Failed',
                    y: failed,
                    color:'#F66349'
            }];

            var pct = total === 0 ? 0 : Math.round(passed / total * 100);
            var data = {
                chartData: data,
                title: this.title,
                unit: this.unitLabel,
                calculatedUnits: executed,
                totalUnits: total,
                percentage: pct,
                secondaryCalculatedUnits: passed,
                secondaryTotalUnits: executed,
                secondaryUnit: "passed",
                tooltip: this.tooltip
            };

            return data;

        }
    });
})();
