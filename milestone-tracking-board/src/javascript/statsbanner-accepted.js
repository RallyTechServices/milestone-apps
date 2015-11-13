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
                title: 'Accepted Points',
                byCount: false
            }
        },

        _getRenderData: function() {

            var total = 0,
                accepted_total = 0
                byCount = this.byCount,
                acceptedScheduleStates = ['Accepted'];

            Ext.Array.each(this.store.getRange(), function(r) {
                console.log('record', r.get('FormattedID'),r.get('_type'),r.get('DirectChildrenCount'))
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
                title: this.title
            };
            return data;

        },


        //requires: ['Rally.util.Colors'],
        //
        //tpl: [
        //    '<div class="expanded-widget">',
        //    '<div class="stat-title">Accepted Stories</div>',
        //    '<div class="stat-metric">',
        //    '<div class="metric-chart"></div>',
        //    '<div class="metric-chart-text percent-offset">',
        //    '{percentage}<div class="metric-percent">%</div>',
        //    '</div>',
        //    '<div class="metric-subtext">{accepted} of {total} {unit}</div>',
        //    '</div>',
        //    '</div>',
        //    '<div class="collapsed-widget">',
        //    '<div class="stat-title">Accepted Stories</div>',
        //    '<div class="stat-metric">{percentage}<span class="metric-percent">%</span></div>',
        //    '</div>'
        //],
        //
        //config: {
        //    data: {
        //        percentage: 0,
        //        accepted: 0,
        //        total: 0,
        //        unit: ''
        //    }
        //},
        //
        ////constructor: function (config) {
        ////this.callParent(arguments);
        ////},
        //
        //onDataChanged: function () {
        //    Deft.Promise.all([
        //        this.getAcceptanceData(),
        //        this.getTimeboxData()
        //    ]).then({
        //        success: this._onDataAssembled,
        //        scope: this
        //    });
        //},
        //
        //getChartEl: function() {
        //    return this.getEl().down('.metric-chart');
        //},
        //
        //_getTimeboxUnits: function() {
        //    return this.getContext().getTimeboxScope().getType() === 'iteration' ?
        //        this.getContext().getWorkspace().WorkspaceConfiguration.IterationEstimateUnitName :
        //        this.getContext().getWorkspace().WorkspaceConfiguration.ReleaseEstimateUnitName;
        //},
        //
        //_getRenderData: function() {
        //    var data = _.merge(
        //        {unit: this._getTimeboxUnits()},
        //        this.acceptanceData,
        //        this.timeboxData
        //    );
        //
        //    if (this.byCount) {
        //        data.accepted = Ext.util.Format.round(data.acceptedCount, 2);
        //        data.total = Ext.util.Format.round(data.count, 2);
        //        data.unit = '';
        //    } else {
        //        data.accepted = Ext.util.Format.round(data.accepted, 2);
        //        data.total = Ext.util.Format.round(data.total, 2);
        //    }
        //
        //    data.percentage = Math.round((data.accepted / data.total) * 100) || 0;
        //
        //    return data;
        //},
        //
        //_onDataAssembled: function (results) {
        //    this.acceptanceData = results[0];
        //    this.timeboxData = results[1];
        //
        //    var renderData = this._getRenderData();
        //    this.update(renderData);
        //
        //    this.refreshChart(this._getChartConfig(renderData));
        //},
        //
        //_getChartConfig: function(renderData) {
        //    var color = Rally.util.Colors.cyan,
        //        daysRemaining = renderData.remaining / renderData.workdays,
        //        percentage = renderData.percentage;
        //
        //    if (percentage === 100) {
        //        color = Rally.util.Colors.lime;
        //    } else if (daysRemaining === 0) {
        //        color = Rally.util.Colors.blue;
        //    }
        //
        //    return {
        //        chartData: {
        //            series: [{
        //                data: [
        //                    {
        //                        name: 'Accepted Stories',
        //                        y: percentage,
        //                        color: color
        //                    },
        //                    {
        //                        name: '',
        //                        y: 100 - percentage,
        //                        color: Rally.util.Colors.grey1
        //                    }
        //                ]
        //            }]
        //        }
        //    };
        //}
    });
})();