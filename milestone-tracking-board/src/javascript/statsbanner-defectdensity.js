(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * shows accepted work units for timebox
     */
    Ext.define('MilestoneTrackingApp.DefectDensity', {
        extend: 'MilestoneTrackingApp.ConfigurableGauge',
        alias:'widget.statsbannerdefectdensity',

        config: {
            data: {
                percentage: 0,
                calculatedUnits: 0,
                totalUnits: 0,
                title: 'Defect Density'
            }
        },
        initComponent: function() {

            var filters = Ext.create('Rally.data.wsapi.Filter',{
                property: 'WorkProduct.Milestones',
                value: this.timeboxRecord.get('_ref')
            },{
                property: "LastVerdict",
                operator: "!=",
                value: ""
            });

            this.testCaseStore = Ext.create('Rally.data.wsapi.Store',{
                model: 'TestCase',
                fetch: ['ObjectID'],
                filters: filters,
                pageSize: 1,
                limit: 1
            });

            this.mon(this.testCaseStore, 'datachanged', this.onDataChanged, this);
            this.callParent(arguments);

            this.testCaseStore.load();
        },

    _getRenderData: function() {

            var total = 0,
                cancelled = 0,
                cancelledStates = this.cancelledDefectStates;

            var executedTestCases = this.testCaseStore.getTotalCount() || 0;

            Ext.Array.each(this.store.getRange(), function(r) {
                if (r.get('_type').toLowerCase() === 'defect'){
                    if (Ext.Array.contains(cancelledStates, r.get('State'))){
                        cancelled++;
                    }
                    total++;
                }
            });

//        Defect Density =( (Total Number of Defects – Cancelled defects – Rejected Defects) / Total Number of Test Cases Executed))
            var pct = executedTestCases > 0 ? (total - cancelled)/executedTestCases * 100 : 0;
            var data = {
                percentage: pct,
                calculatedUnits: (total - cancelled),
                totalUnits: executedTestCases,
                unit: this.unitLabel,
                title: this.title,
                tooltip: this.tooltip
            };
            return data;

        }
    });
})();