(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * shows accepted work units for timebox
     */
    Ext.define('MilestoneTrackingApp.TestCoverage', {
        extend: 'MilestoneTrackingApp.ConfigurableGauge',
        alias:'widget.statsbannertestcoverage',

        config: {
            data: {
                percentage: 0,
                calculatedUnits: 0,
                totalUnits: 0,
                title: "Test Coverage"
            }
        },

        _getRenderData: function() {

            var total = 0,
                hasTestCases = 0;

            Ext.Array.each(this.store.getRange(), function(r) {
                if (r.get('_type').toLowerCase() === 'hierarchicalrequirement'){
                    var testCases = r.get('TestCases');
                    if (testCases && testCases.Count > 0){
                        hasTestCases++;
                    }
                    total++;
                }

            });

            var pct = total === 0 ? 0 : Math.round(hasTestCases / total * 100);

            var data = {
                percentage: pct,
                calculatedUnits: hasTestCases,
                totalUnits: total,
                unit: this.unitLabel,
                title: this.title,
                tooltip: this.tooltip || ''
            };
            return data;

        }
    });
})();