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

            var filters = Ext.create('Rally.data.wsapi.Filter',{
                property: 'WorkProduct.Milestones',
                value: this.timeboxRecord.get('_ref')
            });

            this.store = Ext.create('Rally.data.wsapi.Store',{
                model: 'TestCase',
                fetch: ['LastRun','LastVerdict'],
                filters: filters
            });

            this.callParent(arguments);
            this.store.load();
        },
        _getRenderData: function() {
            console.log('_renderData testcasesa', this.store.getRange());
            var total = 0,
                passed = 0,
                executed = 0;

            Ext.Array.each(this.store.getRange(), function(r) {
                console.log('testCases', r.get('FormattedID'));
                if (r.get('LastRun')){
                    executed++;
                    if (r.get('LastVerdict') === "Pass"){
                        passed++;
                    }
                }
                total++;
            });


            var data = [{
                    name: 'Total',
                    y: total - executed,
                    color: Rally.util.Colors.grey1
                },{
                    name: 'Executed',
                    y: executed - passed,
                    color: "#FAD200"
                },{
                    name: 'Passed',
                    y: passed,
                    color: '#8DC63F'
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
                secondaryUnit: "passed"
            };
            return data;

        }
    });
})();