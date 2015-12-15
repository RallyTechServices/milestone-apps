(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * shows accepted work units for timebox
     */
    Ext.define('MilestoneTrackingApp.Accepted', {
        extend: 'MilestoneTrackingApp.ConfigurableGauge',
        alias:'widget.statsbanneraccepted',

        config: {
            data: {
                percentage: 0,
                calculatedUnits: 0,
                totalUnits: 0,
                title: "Accepted Points",
                byCount: false
            }
        },

        _getRenderData: function() {

            var total = 0,
                accepted_total = 0
                byCount = this.byCount,
                acceptedScheduleStates = this.scheduleStates.slice(this.scheduleStates.indexOf('Accepted'));

            Ext.Array.each(this.store.getRange(), function(r) {
                var children = r.get('DirectChildrenCount') || 0;
                if (children === 0){
                    if (!byCount) {
                        total += r.get('PlanEstimate') || 0;
                        if (Ext.Array.contains(acceptedScheduleStates, r.get('ScheduleState'))){
                            accepted_total += r.get('PlanEstimate') || 0;
                        }
                    } else {
                        total++;
                        if (Ext.Array.contains(acceptedScheduleStates, r.get('ScheduleState'))){
                            accepted_total ++;
                        }
                    }
                }

            });

            var pct = total === 0 ? 0 : Math.round(accepted_total / total * 100);

            var data = {
                percentage: pct,
                calculatedUnits: accepted_total,
                totalUnits: total,
                unit: this.unitLabel,
                title: this.title,
                tooltip: this.tooltip || ''
            };
            return data;

        }
    });
})();