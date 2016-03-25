(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * shows accepted work units for timebox
     */
    Ext.define('MilestoneTrackingApp.Defects', {
        extend: 'MilestoneTrackingApp.ConfigurableGauge',
        alias:'widget.statsbannerdefects',

        config: {
            data: {
                percentage: 0,
                calculatedUnits: 0,
                totalUnits: 0,
                title: 'Active Defects'
            }
        },

        _getRenderData: function() {

            var total = 0,
                closed = 0,
                closedStates = this.closedDefectStates,
                resolvedValues = this.resolvedDefectValues;

            Ext.Array.each(this.store.getRange(), function(r) {
                if (r.get('_type').toLowerCase() === 'defect' && !Ext.Array.contains(resolvedValues, r.get('Resolution'))){
                    if (Ext.Array.contains(closedStates, r.get('State'))){
                        closed++;
                    }
                    total++;
                }
            });

            var pct = total === 0 ? 0 : Math.round(closed / total * 100);

            var data = {
                percentage: pct,
                calculatedUnits: closed,
                totalUnits: total,
                unit: this.unitLabel,
                title: this.title,
                tooltip: this.tooltip
            };
            return data;

        }
    });
})();