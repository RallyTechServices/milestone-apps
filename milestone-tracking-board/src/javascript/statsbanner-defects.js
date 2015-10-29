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
                active = 0,
                closedStates = ['Closed'];

            Ext.Array.each(this.store.getRange(), function(r) {
                if (!Ext.Array.contains(closedStates, r.get('State'))){
                    active++;
                }
                total++
            });

            var pct = total === 0 ? 0 : Math.round(active / total * 100);

            var data = {
                percentage: pct,
                calculatedUnits: active,
                totalUnits: total,
                unit: this.unitLabel,
                title: this.title
            };
            return data;

        }
    });
})();