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
                accepted_total = 0,
                byCount = this.byCount,
                acceptedScheduleStates = this.scheduleStates.slice(this.scheduleStates.indexOf('Accepted'));

            Ext.Array.each(this.store.getRange(), function(r) {
                if (r.get('_type').toLowerCase() === 'hierarchicalrequirement'){
                    if (!byCount) {
                        var children = r.get('DirectChildrenCount') || 0; //kmc, we only want to exclude parent user stories when
                        //calculating total plan estimate since that would result in doulbe counts.
                        if (children === 0){
                            total += r.get('PlanEstimate') || 0;
                            if (Ext.Array.contains(acceptedScheduleStates, r.get('ScheduleState'))){
                                accepted_total += r.get('PlanEstimate') || 0;
                            }
                        }
                    } else {  //4/19/2016 we do want to include parent user stories here so that the number matches the test coverage...
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