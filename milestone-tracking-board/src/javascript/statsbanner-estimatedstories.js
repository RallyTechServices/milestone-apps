(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * shows accepted work units for timebox
     */
    Ext.define('MilestoneTrackingApp.EstimatedStories', {
        extend: 'MilestoneTrackingApp.ConfigurableGauge',
        alias:'widget.statsbannerestimatedstories',
        config: {
            calculatedUnitFilter: null,
            totalUnitFilter: null,
            data: {
                percentage: 0,
                calculatedUnits: 0,
                totalUnits: 0,
                byCount: false
            }
        },

        _getRenderData: function() {

            var total = 0,
                estimated = 0;

            Ext.Array.each(this.store.getRange(), function(r) {
                var children = r.get('DirectChildrenCount') || 0;
                if (children === 0) {
                    total++;
                    if (r.get('PlanEstimate') && r.get('PlanEstimate') > 0) {
                        estimated++;
                    }
                }
            });

            var pct = total === 0 ? 0 : Math.round(estimated / total * 100);

            var data = {
                percentage: pct,
                calculatedUnits: estimated,
                totalUnits: total,
                unit: this.unitLabel,
                title: this.title
            };
            return data;

        }
    });
})();